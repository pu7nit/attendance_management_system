const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

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

// Existing Schemas (Classes, Teachers, Students, Attendance) remain the same
const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to user
});
const Class = mongoose.model('Class', classSchema);

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Teacher = mongoose.model('Teacher', teacherSchema);

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  admissionNo: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  attendancePercentage: { type: Number, min: 0, max: 100, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Student = mongoose.model('Student', studentSchema);

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Attendance = mongoose.model('Attendance', attendanceSchema);

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

// Existing API Routes (updated with userId)
app.get('/api/classes', async (req, res) => {
  const classes = await Class.find();
  res.json(classes);
});

app.get('/api/teachers', async (req, res) => {
  const teachers = await Teacher.find();
  res.json(teachers);
});

app.get('/api/students', async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.get('/api/attendance', async (req, res) => {
  const attendance = await Attendance.find().populate('studentId');
  res.json(attendance);
});

app.post('/api/classes', async (req, res) => {
  try {
    const { userId } = req.body; // Expect userId from frontend
    const newClass = new Class({ ...req.body, userId });
    await newClass.save();
    res.json(newClass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const { userId } = req.body;
    const newTeacher = new Teacher({ ...req.body, userId });
    await newTeacher.save();
    res.json(newTeacher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { userId } = req.body;
    const newStudent = new Student({ ...req.body, userId });
    await newStudent.save();
    res.json(newStudent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { userId } = req.body;
    const newAttendance = new Attendance({ ...req.body, userId });
    await newAttendance.save();
    res.json(newAttendance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
