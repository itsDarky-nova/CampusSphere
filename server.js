require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectFirebase = require('./firebase');
console.log("TYPE OF connectFirebase:", typeof connectFirebase);


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health routes
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Student Hub API running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🔥 CREATE STUDENT
app.post('/api/students', async (req, res, next) => {
  try {
    console.log("POST /api/students HIT");

    const db = connectFirebase();

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const student = {
      name,
      email,
      password,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('students').add(student);

    res.status(201).json({
      message: "Student created successfully",
      id: ref.id
    });

  } catch (err) {
    next(err);
  }
});

// 🔥 GET ALL STUDENTS
app.get('/api/students', async (req, res, next) => {
  try {
    const db = connectFirebase();   // ✅ FIXED

    const snapshot = await db.collection('students').get();

    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(students);

  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});