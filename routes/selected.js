const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PilotLifecycle = require('../models/PilotLifecycle');
const { verifyToken, requireSelected, JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/selected/login - Login with Phone Number + Password
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone number and password are required' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, error: 'Invalid 10-digit Indian mobile number' });
    }

    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password credentials.' });
    }

    // Check if user is marked as selected (or is an admin)
    if (!user.isSelected && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        notSelected: true,
        error: 'Your startup is not yet selected by the Department committee. Access is restricted to selected startups.'
      });
    }

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      {
        id: String(user._id),
        role: String(user.role),
        email: String(user.email),
        phone: String(user.phone),
        isSelected: user.isSelected
      },
      secretKey,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Authentication successful for selected startup!',
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isSelected: user.isSelected
      }
    });
  } catch (err) {
    console.error('Selected login error:', err);
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// GET /api/selected/dashboard - Protected dashboard data for selected startups
router.get('/dashboard', verifyToken, requireSelected, async (req, res) => {
  try {
    // Find pilots related to this user/company
    const pilots = await PilotLifecycle.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        isSelected: req.user.isSelected,
        role: req.user.role
      },
      pilots
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/selected/verify - Quick token validity and selection check
router.get('/verify', verifyToken, requireSelected, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      isSelected: req.user.isSelected,
      role: req.user.role
    }
  });
});

module.exports = router;
