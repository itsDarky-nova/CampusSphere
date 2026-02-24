require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { getDb } = require('./firebase'); // ✅ correct import

const app = express();
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors());
app.use(express.json());

// ================= HEALTH =================
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Student Hub API running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================= STUDENTS =================

// Create student
app.post('/api/students', async (req, res) => {
  try {
    const db = getDb(); // ✅ FIXED

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
    res.status(500).json({ error: err.message });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const db = getDb(); // ✅ FIXED

    const snapshot = await db.collection('students').get();

    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(students);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CHAT =================

// Get all chat messages
app.get('/api/chat', async (req, res) => {
  try {
    const db = getDb();

    const snapshot = await db.collection('chat')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(messages);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send chat message
app.post('/api/chat', async (req, res) => {
  try {
    const db = getDb();

    const { text, senderId, senderName } = req.body;

    if (!text || !senderId || !senderName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const message = {
      text,
      senderId,
      senderName,
      timestamp: new Date().toISOString()
    };

    const ref = await db.collection('chat').add(message);

    res.status(201).json({
      id: ref.id,
      ...message
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NOTES (Cloud Metadata) =================

app.post('/api/notes', async (req, res) => {
  try {
    const db = getDb();

    const { title, fileURL, uploaderId, uploaderName } = req.body;

    const note = {
      title,
      fileURL,
      uploaderId,
      uploaderName,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('notes').add(note);

    res.status(201).json({ id: ref.id, ...note });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const db = getDb();

    const snapshot = await db.collection('notes')
      .orderBy('createdAt', 'desc')
      .get();

    const notes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(notes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 404 =================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
