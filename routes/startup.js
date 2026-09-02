const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Startup = require('../models/Startup');

// POST /api/startup/register - Pudhu startup register panna
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Startup.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const startup = await Startup.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: 'Startup registered successfully',
      startupId: startup._id
    });

  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
});

// POST /api/startup/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const startup = await Startup.findOne({ email: normalizedEmail });
    if (!startup) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, startup.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'govbridge_secret_2026';
    const token = jwt.sign({ id: startup._id }, secret, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      startupId: startup._id,
      startup: {
        id: startup._id,
        name: startup.name,
        email: startup.email,
        status: startup.status
      }
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Login failed' });
  }
});

// GET /api/startup/all/list - Fetch all startups in database
router.get('/all/list', async (req, res) => {
  try {
    const startups = await Startup.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: startups.length, data: startups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch startups' });
  }
});

// GET /api/startup/:id - oru startup oda details paakka
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid startup ID format' });
    }

    const startup = await Startup.findById(id).select('-password');
    if (!startup) {
      return res.status(404).json({ success: false, error: 'Startup not found' });
    }

    res.json({ success: true, data: startup });
  } catch (error) {
    console.error('Fetch Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Fetch failed' });
  }
});

module.exports = router;
