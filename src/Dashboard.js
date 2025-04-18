import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showModal, setShowModal] = useState({ students: false, teachers: false, classes: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [teachersData, setTeachersData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [formData, setFormData] = useState({ name: '', subject: '', topic: '', attendancePercentage: '' });
  const [renderKey, setRenderKey] = useState(Date.now());
  const [selectedItem, setSelectedItem] = useState(null); // For editing
  const addButtonRef = useRef(null);

  useEffect(() => {
    fetchData('classes');
    fetchData('teachers');
    fetchData('students');
  }, []);

  const fetchData = async (type) => {
    const url = `http://localhost:5000/api/${type}`;
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(url, {
        headers: { 'user-id': userId || '' },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (type === 'classes') setClassesData(data);
      if (type === 'teachers') setTeachersData(data);
      if (type === 'students') setStudentsData(data);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    }
  };

  const handleCardClick = (type) => {
    setShowModal({ ...showModal, [type]: true });
    setSelectedItem(null); // Reset selected item when opening a new modal
  };

  const closeModal = () => {
    setShowModal({ students: false, teachers: false, classes: false });
    setShowAddForm(false);
    setAddType(null);
    setFormData({ name: '', subject: '', topic: '', attendancePercentage: '' });
    setSelectedItem(null);
    console.log('Modal closed, states reset');
  };

  const handleMasterAdd = useCallback(() => {
    console.log('Master Add clicked, showAddForm:', !showAddForm, 'addType:', null, 'button ref:', addButtonRef.current);
    if (addButtonRef.current) {
      console.log('Button is in DOM, enabling interaction');
    }
    setShowAddForm(true);
    setAddType(null);
    setRenderKey(Date.now());
  }, [showAddForm]);

  const handleCategoryAdd = useCallback((type) => {
    console.log('Category Add clicked for:', type, 'showAddForm:', !showAddForm, 'button ref:', addButtonRef.current);
    if (addButtonRef.current) {
      console.log('Button is in DOM, enabling interaction');
    }
    setShowAddForm(true);
    setAddType(type);
    setRenderKey(Date.now());
  }, [showAddForm]);

  const handleTypeSelect = (type) => {
    setAddType(type);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form with data:', formData);
    let url, dataToSend;
    const userId = localStorage.getItem('userId');

    switch (addType || activeSection.replace('manage', '')) {
      case 'classes':
        url = 'http://localhost:5000/api/classes';
        dataToSend = { name: formData.name, subject: formData.topic, userId };
        break;
      case 'teachers':
        url = 'http://localhost:5000/api/teachers';
        dataToSend = { name: formData.name, subject: formData.subject, userId };
        break;
      case 'students':
      case 'dashboard':
        url = 'http://localhost:5000/api/students';
        const lastStudent = studentsData.length > 0 ? studentsData[studentsData.length - 1] : { admissionNo: 'AMS000' };
        const nextNumber = parseInt(lastStudent.admissionNo.replace('AMS', '')) + 1;
        const admissionNo = `AMS${nextNumber.toString().padStart(3, '0')}`;
        dataToSend = { name: formData.name, admissionNo, class: 'Nine', attendancePercentage: parseFloat(formData.attendancePercentage) || 0, userId };
        break;
      default:
        console.log('No valid type selected');
        return;
    }

    try {
      console.log('Sending to URL:', url, 'with data:', dataToSend);
      const response = await fetch(url, {
        method: selectedItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const newEntry = await response.json();
      console.log('New entry received:', newEntry);
      await fetchData(addType || activeSection.replace('manage', ''));
      closeModal();
      setRenderKey(Date.now());
    } catch (error) {
      console.error('Error adding/updating entry:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (item, type) => {
    setSelectedItem(item);
    setAddType(type);
    setShowAddForm(true);
    setFormData({
      name: item.name || '',
      subject: item.subject || '',
      topic: item.topic || '',
      attendancePercentage: item.attendancePercentage || '',
    });
  };

  const handleDelete = async (id, type) => {
    const url = `http://localhost:5000/api/${type}/${id}`;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No userId found, delete aborted');
      return;
    }
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'user-id': userId },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      console.log(`Successfully deleted ${type} with id: ${id}`);
      await fetchData(type); // Refresh the data after deletion
    } catch (error) {
      console.error(`Error deleting ${type} with id ${id}:`, error);
    }
  };

  const renderAddForm = () => {
    if (!addType && activeSection === 'dashboard') {
      return (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Type to Add</h3>
            <select onChange={(e) => handleTypeSelect(e.target.value)} value={addType || ''}>
              <option value="" disabled>Select an option</option>
              <option value="classes">Class</option>
              <option value="teachers">Teacher</option>
              <option value="students">Student</option>
            </select>
            <button onClick={closeModal}>Cancel</button>
          </div>
        </div>
      );
    }

    const formFields = {
      classes: (
        <>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Subject Name" required />
          <input type="text" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="Topic" required />
        </>
      ),
      teachers: (
        <>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Teacher Name" required />
          <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Subject" required />
        </>
      ),
      students: (
        <>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Student Name" required />
          <input type="number" name="attendancePercentage" value={formData.attendancePercentage} onChange={handleInputChange} placeholder="Attendance Percentage" min="0" max="100" required />
        </>
      ),
    }[addType || activeSection.replace('manage', '')];

    return (
      <div className="modal" onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3>{selectedItem ? 'Edit' : 'Add New'} {addType ? addType.replace('manage', '') : activeSection.replace('manage', '')}</h3>
          <form onSubmit={handleFormSubmit}>
            {formFields}
            <button type="submit">{selectedItem ? 'Update' : 'Add'}</button>
            <button type="button" onClick={closeModal}>Cancel</button>
          </form>
        </div>
      </div>
    );
  };

  const renderModalContent = () => {
    const content = {
      students: (
        <div className="modal-content">
          <h3>Students List</h3>
          <ul>
            {studentsData.map((student) => (
              <li key={student._id}>
                {student.name} - Admission No: {student.admissionNo} - Attendance: {student.attendancePercentage}%
                <button onClick={() => handleEdit(student, 'students')}>Edit</button>
                <button onClick={() => handleDelete(student._id, 'students')}>Delete</button>
              </li>
            ))}
          </ul>
          <button onClick={closeModal}>Close</button>
        </div>
      ),
      teachers: (
        <div className="modal-content">
          <h3>Teachers List</h3>
          <ul>
            {teachersData.map((teacher) => (
              <li key={teacher._id}>
                {teacher.name} - Subject: {teacher.subject}
                <button onClick={() => handleEdit(teacher, 'teachers')}>Edit</button>
                <button onClick={() => handleDelete(teacher._id, 'teachers')}>Delete</button>
              </li>
            ))}
          </ul>
          <button onClick={closeModal}>Close</button>
        </div>
      ),
      classes: (
        <div className="modal-content">
          <h3>Classes List</h3>
          <ul>
            {classesData.map((classItem) => (
              <li key={classItem._id}>
                {classItem.name} - Subject: {classItem.subject}
                <button onClick={() => handleEdit(classItem, 'classes')}>Edit</button>
                <button onClick={() => handleDelete(classItem._id, 'classes')}>Delete</button>
              </li>
            ))}
          </ul>
          <button onClick={closeModal}>Close</button>
        </div>
      ),
    };
    return showModal.students || showModal.teachers || showModal.classes ? content[Object.keys(showModal).find(key => showModal[key]) || 'students'] : null;
  };

  const handleBack = () => {
    console.log('Back button clicked, navigating to login');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h2>AMS</h2>
          <button onClick={handleBack} className="back-button">Back</button>
        </div>
        <div className="header-right">
          <span>Welcome Admin</span>
        </div>
      </header>
      <div className="dashboard-container">
        <aside className="sidebar">
          <ul>
            <li
              className={activeSection === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveSection('dashboard')}
            >
              Dashboard
            </li>
            <li
              className={activeSection === 'manageClasses' ? 'active' : ''}
              onClick={() => setActiveSection('manageClasses')}
            >
              Manage Classes
            </li>
            <li
              className={activeSection === 'manageTeachers' ? 'active' : ''}
              onClick={() => setActiveSection('manageTeachers')}
            >
              Manage Teachers
            </li>
            <li
              className={activeSection === 'manageStudents' ? 'active' : ''}
              onClick={() => setActiveSection('manageStudents')}
            >
              Manage Students
            </li>
          </ul>
        </aside>
        <main className="main-content" key={renderKey}>
          {activeSection === 'dashboard' ? (
            <button ref={addButtonRef} className="add-button" onClick={handleMasterAdd}>Add</button>
          ) : activeSection === 'manageClasses' ? (
            <button ref={addButtonRef} className="add-button" onClick={() => handleCategoryAdd('classes')}>Add Class</button>
          ) : activeSection === 'manageTeachers' ? (
            <button ref={addButtonRef} className="add-button" onClick={() => handleCategoryAdd('teachers')}>Add Teacher</button>
          ) : activeSection === 'manageStudents' ? (
            <button ref={addButtonRef} className="add-button" onClick={() => handleCategoryAdd('students')}>Add Student</button>
          ) : null}
          {activeSection === 'dashboard' && (
            <>
              <h1>Administrator Dashboard</h1>
              <div className="stats">
                <div className="stat-card" onClick={() => handleCardClick('students')}>
                  <h3>Students</h3>
                  <p>{studentsData.length}</p>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('teachers')}>
                  <h3>Teachers</h3>
                  <p>{teachersData.length}</p>
                </div>
                <div className="stat-card" onClick={() => handleCardClick('classes')}>
                  <h3>Classes</h3>
                  <p>{classesData.length}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Attendance</h3>
                  <p>53</p>
                </div>
              </div>
              <div className={`attendance-table ${activeSection === 'dashboard' ? 'fade-in' : ''}`}>
                <h2>Class Attendance</h2>
                <div className="table-controls">
                  <select>
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  <span>entries</span>
                  <input type="text" placeholder="Search:" />
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Admission No</th>
                      <th>Class</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.slice(0, 3).map((student, index) => (
                      <tr key={student._id}>
                        <td>{index + 1}</td>
                        <td>{student.name}</td>
                        <td>{student.admissionNo}</td>
                        <td>{student.class}</td>
                        <td>{student.attendancePercentage}%</td>
                        <td><span className="status present">Present</span></td>
                        <td>{new Date(student.date || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {activeSection === 'manageClasses' && (
            <div className="category-content fade-in">
              <h1>Manage Classes</h1>
              <ul className="card-list">
                {classesData.map((classItem) => (
                  <li key={classItem._id} className="card-item">
                    <div className="card">
                      <h3>{classItem.name}</h3>
                      <p>Subject: {classItem.subject}</p>
                      <button onClick={() => handleCategoryAdd('classes')}>Add</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeSection === 'manageTeachers' && (
            <div className="category-content fade-in">
              <h1>Manage Teachers</h1>
              <ul className="card-list">
                {teachersData.map((teacher) => (
                  <li key={teacher._id} className="card-item">
                    <div className="card">
                      <h3>{teacher.name}</h3>
                      <p>Subject: {teacher.subject}</p>
                      <button onClick={() => handleCategoryAdd('teachers')}>Add</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeSection === 'manageStudents' && (
            <div className="category-content fade-in">
              <h1>Manage Students</h1>
              <ul className="card-list">
                {studentsData.map((student) => (
                  <li key={student._id} className="card-item">
                    <div className="card">
                      <h3>{student.name}</h3>
                      <p>Admission No: {student.admissionNo} - Attendance: {student.attendancePercentage}%</p>
                      <button onClick={() => handleCategoryAdd('students')}>Add</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showAddForm && renderAddForm()}
          {(showModal.students || showModal.teachers || showModal.classes) && renderModalContent()}
          <div className="footer">
            <p>© 2022</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
