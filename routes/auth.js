const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

// In-memory OTP Store for Demo & Verification (Key: target value, Value: { otp, expiresAt })
const otpStore = new Map();

// POST /api/auth/send-otp - Generate 6-digit OTP for Phone or Email
router.post('/send-otp', (req, res) => {
  try {
    const { target, value } = req.body;
    if (!value) {
      return res.status(400).json({ success: false, error: 'Phone number or Email ID is required' });
    }

    const cleanValue = value.toLowerCase().trim();
    // Generate a fixed demo-friendly 6-digit OTP or random 6 digits
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    otpStore.set(cleanValue, { otp, expiresAt });

    console.log(`🔑 [OTP GENERATED] Target: ${target || 'Phone/Email'} | Value: ${cleanValue} | OTP: ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${value}`,
      target: cleanValue,
      otp // Included for easy demo testing
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify-otp - Verify OTP code
router.post('/verify-otp', (req, res) => {
  try {
    const { value, otp } = req.body;
    if (!value || !otp) {
      return res.status(400).json({ success: false, error: 'Value and OTP are required' });
    }

    const cleanValue = value.toLowerCase().trim();
    const record = otpStore.get(cleanValue);

    if (!record) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this number/email or OTP expired' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanValue);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid OTP entered. Please try again.' });
    }

    // OTP verified
    otpStore.delete(cleanValue);
    res.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/forgot-password-otp - Trigger OTP for password reset
router.post('/forgot-password-otp', async (req, res) => {
  try {
    const { identifier } = req.body; // Email or Username/CompanyName
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Please enter registered Email ID or Company Name' });
    }

    const clean = identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: clean }, { name: new RegExp(`^${clean}$`, 'i') }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No registered startup account found with this Email or Company Name.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(user.email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    console.log(`🔐 [FORGOT PASSWORD OTP] User: ${user.email} | OTP: ${otp}`);

    res.json({
      success: true,
      message: `Verification OTP sent to registered email ${user.email}`,
      email: user.email,
      otp // Included for demo ease
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/reset-password - Verify OTP and update hashed password in DB
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and New Password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const record = otpStore.get(cleanEmail);

    if (!record || record.otp !== otp.trim() || Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    otpStore.delete(cleanEmail);

    console.log(`🔒 [PASSWORD RESET SUCCESS] Password updated for ${cleanEmail}`);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/signup - Register Startup User (Username MUST match Company Name)
router.post('/signup', async (req, res) => {
  try {
    const { name, companyName, email, password, phone } = req.body;

    const startupTitle = (companyName || name || '').trim();
    if (!startupTitle || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide Company Name (Username), Email ID, and Password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: startupTitle, // Username is SAME as Company Name
      email: normalizedEmail,
      password: hashedPassword,
      role: 'startup'
    });

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      { id: String(newUser._id), role: String(newUser.role), email: String(newUser.email) },
      secretKey,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Startup registered successfully!',
      token,
      user: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

const { adminUsers } = require('../data/seedData');

// POST /api/auth/login - Authenticate Startup or Admin User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both email/company name and password.' });
    }

    const cleanInput = email.toLowerCase().trim();
    let user = await User.findOne({
      $or: [{ email: cleanInput }, { name: new RegExp(`^${cleanInput}$`, 'i') }]
    });

    // Auto-create configured admin accounts on demand if DB was cleared
    if (!user) {
      const adminMatch = adminUsers.find(a => a.email.toLowerCase() === cleanInput);
      if (adminMatch) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminMatch.password, salt);
        user = await User.create({
          name: adminMatch.name,
          email: adminMatch.email,
          password: hashedPassword,
          role: 'admin'
        });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid Email/Company Name or password credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid password credentials.' });
    }

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      { id: String(user._id), role: String(user.role), email: String(user.email) },
      secretKey,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me - Get Current Logged-in User Profile
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;
