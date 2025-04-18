const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'], // Added DELETE
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/attendanceDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Class Schema
const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Class = mongoose.model('Class', classSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Teacher = mongoose.model('Teacher', teacherSchema);

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  admissionNo: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  attendancePercentage: { type: Number, min: 0, max: 100, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Student = mongoose.model('Student', studentSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Attendance = mongoose.model('Attendance', attendanceSchema);

// Middleware to authenticate userId
const authenticateUser = (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  req.userId = userId;
  next();
};

// Authentication Endpoints
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    res.json({ success: true, userId: user._id });
  } else {
    res.status(401).json({ success: false, message: 'Email or password not found. Please create an account.' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already in use.' });
  }
  const newUser = new User({ email, password });
  await newUser.save();
  res.json({ success: true, userId: newUser._id });
});

// GET Endpoints with Authentication
app.get('/api/classes', authenticateUser, async (req, res) => {
  const classes = await Class.find({ userId: req.userId });
  res.json(classes);
});

app.get('/api/teachers', authenticateUser, async (req, res) => {
  const teachers = await Teacher.find({ userId: req.userId });
  res.json(teachers);
});

app.get('/api/students', authenticateUser, async (req, res) => {
  const students = await Student.find({ userId: req.userId });
  res.json(students);
});

app.get('/api/attendance', authenticateUser, async (req, res) => {
  const attendance = await Attendance.find({ userId: req.userId }).populate('studentId');
  res.json(attendance);
});

// POST Endpoints
app.post('/api/classes', authenticateUser, async (req, res) => {
  try {
    const { name, subject } = req.body;
    const newClass = new Class({ name, subject, userId: req.userId });
    await newClass.save();
    res.json(newClass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/teachers', authenticateUser, async (req, res) => {
  try {
    const { name, subject } = req.body;
    const newTeacher = new Teacher({ name, subject, userId: req.userId });
    await newTeacher.save();
    res.json(newTeacher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/students', authenticateUser, async (req, res) => {
  try {
    const { name, admissionNo, class: studentClass, attendancePercentage } = req.body;
    const newStudent = new Student({
      name,
      admissionNo,
      class: studentClass,
      attendancePercentage: parseFloat(attendancePercentage) || 0,
      userId: req.userId,
    });
    await newStudent.save();
    res.json(newStudent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/attendance', authenticateUser, async (req, res) => {
  try {
    const { studentId, status } = req.body;
    const newAttendance = new Attendance({ studentId, status, userId: req.userId });
    await newAttendance.save();
    res.json(newAttendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE Endpoints
app.delete('/api/classes/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const result = await Class.findOneAndDelete({ _id: id, userId: req.userId });
  if (result) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Class not found or unauthorized' });
  }
});

app.delete('/api/teachers/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const result = await Teacher.findOneAndDelete({ _id: id, userId: req.userId });
  if (result) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Teacher not found or unauthorized' });
  }
});

app.delete('/api/students/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const result = await Student.findOneAndDelete({ _id: id, userId: req.userId });
  if (result) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Student not found or unauthorized' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
