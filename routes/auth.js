const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');
const { rateLimiter } = require('../middleware/rateLimiter');
const { sendOtp } = require('../utils/otpSender');

// Rate Limiters
// 1. General login rate limiter: 20 attempts per 15 mins per IP
const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
});

// 2. OTP Request Limiter: max 5 requests per hour per email
const otpRequestLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Maximum OTP request limit reached (5 requests per hour). Please try again later.',
  keyGenerator: (req) => {
    const val = (req.body.email || req.body.value || req.ip || '').toLowerCase().trim();
    return `otp_req_${val}`;
  }
});

// Helper: Validate email format
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// =========================================================================
// 1. SEND OTP (Registration / Verification Flow)
// =========================================================================
router.post('/send-otp', otpRequestLimiter, async (req, res) => {
  try {
    const { target, value, email } = req.body;
    const rawEmail = (email || value || '').toLowerCase().trim();

    if (!isValidEmail(rawEmail)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    // Invalidate older verification OTPs for this email
    await Otp.deleteMany({ email: rawEmail, purpose: 'verification' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: rawEmail,
      otpHash,
      purpose: 'verification',
      expiresAt,
      attempts: 0,
      used: false
    });

    // Send OTP via configured provider (default: email)
    try {
      await sendOtp(rawEmail, otp, 'verification');
    } catch (sendErr) {
      console.error('[AUTH] Failed to send verification OTP email:', sendErr.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to deliver verification code. Please check your email configuration or try again.'
      });
    }

    // NEVER return OTP code in API response
    res.json({
      success: true,
      message: `Verification code sent to ${rawEmail}. Valid for 5 minutes.`,
      email: rawEmail
    });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to send OTP' });
  }
});

// =========================================================================
// 2. VERIFY OTP (Registration / General Verification Flow)
// =========================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, value, otp } = req.body;
    const rawEmail = (email || value || '').toLowerCase().trim();

    if (!rawEmail || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
    }

    const record = await Otp.findOne({
      email: rawEmail,
      purpose: 'verification',
      used: false
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, error: 'No active OTP requested or OTP has expired. Please request a new OTP.' });
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.attempts >= 3) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, error: 'Too many wrong attempts. This OTP has been invalidated. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp.trim(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : 'OTP invalidated.'}`
      });
    }

    // Mark as used
    record.used = true;
    await record.save();

    res.json({
      success: true,
      verified: true,
      message: 'Email verified successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 3. FORGOT PASSWORD FLOW (EMAIL-BASED)
// =========================================================================

// POST /api/auth/forgot-password-otp - Request OTP for registered email
// Anti-enumeration: ALWAYS returns the same generic message whether email exists or not
router.post('/forgot-password-otp', otpRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    // 30-Second Resend Cooldown Check
    const latestOtp = await Otp.findOne({
      email: cleanEmail,
      purpose: 'reset'
    }).sort({ createdAt: -1 });

    if (latestOtp && (Date.now() - new Date(latestOtp.createdAt).getTime() < 30 * 1000)) {
      const waitSeconds = Math.ceil((30 * 1000 - (Date.now() - new Date(latestOtp.createdAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // Check if user exists in DB
    const user = await User.findOne({ email: cleanEmail });

    // Invalidate any older reset OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, purpose: 'reset' });

    // Generic Response: Prevent User Enumeration
    const genericResponse = {
      success: true,
      message: 'If this email address is registered, a 6-digit verification code has been dispatched.',
      email: cleanEmail
    };

    // If user does not exist, return generic response without sending email
    if (!user) {
      console.log(`[AUTH] Forgot password requested for non-existent email: ${cleanEmail}`);
      return res.json(genericResponse);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: cleanEmail,
      otpHash,
      purpose: 'reset',
      expiresAt,
      attempts: 0,
      used: false
    });

    // Send OTP email cleanly without crashing on SMTP failures
    try {
      await sendOtp(cleanEmail, otp, 'reset');
    } catch (sendErr) {
      console.error('[AUTH] Failed to send password reset email (sanitized):', sendErr.message);
      // Return generic failure to user without breaking or leaking secrets
      return res.status(500).json({
        success: false,
        error: 'Unable to deliver verification code. Please try again later.'
      });
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error processing request.' });
  }
});

// POST /api/auth/verify-reset-otp - Verify reset OTP and return short-lived Reset JWT (10 mins, purpose=reset)
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email address and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const record = await Otp.findOne({
      email: cleanEmail,
      purpose: 'reset',
      used: false
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please request a new OTP.' });
    }

    if (new Date() > record.expiresAt) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.attempts >= 3) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, error: 'Maximum 3 attempts exceeded. This OTP has been invalidated.' });
    }

    const isMatch = await bcrypt.compare(otp.trim(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : 'OTP invalidated.'}`
      });
    }

    // Mark as used
    record.used = true;
    await record.save();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    // Short-lived Reset Token (10 minutes, purpose=reset)
    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const resetToken = jwt.sign(
      {
        id: String(user._id),
        email: cleanEmail,
        purpose: 'reset'
      },
      secretKey,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully. You may now set your new password.',
      resetToken
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/reset-password - Accepts only the short-lived Reset Token + New Password (>= 8 chars)
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    let decoded;
    try {
      decoded = jwt.verify(resetToken, secretKey);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired password reset session. Please restart verification.' });
    }

    if (decoded.purpose !== 'reset') {
      return res.status(403).json({ success: false, error: 'Unauthorized token purpose.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    console.log(`🔒 [PASSWORD RESET COMPLETE] User: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 4. REGISTRATION & LOGIN (EMAIL-BASED)
// =========================================================================

// POST /api/auth/signup - Register Startup User
router.post('/signup', async (req, res) => {
  try {
    const { name, companyName, email, password, phone } = req.body;

    const startupTitle = (companyName || name || '').trim();
    if (!startupTitle || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide Company Name, Email Address, and Password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Check unique email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in instead.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: startupTitle,
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      password: hashedPassword,
      role: 'startup',
      isSelected: false
    });

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      {
        id: String(newUser._id),
        role: String(newUser.role),
        email: String(newUser.email),
        isSelected: newUser.isSelected
      },
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
        phone: newUser.phone,
        role: newUser.role,
        isSelected: newUser.isSelected
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

const { adminUsers } = require('../data/seedData');

// POST /api/auth/login - Authenticate Startup or Admin User via Email / Company Name
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both your registered email address and password.' });
    }

    const cleanInput = email.toLowerCase().trim();

    let user = await User.findOne({
      $or: [
        { email: cleanInput },
        { name: new RegExp(`^${cleanInput}$`, 'i') }
      ]
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
      return res.status(401).json({ success: false, error: 'Invalid email or password credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password credentials.' });
    }

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      {
        id: String(user._id),
        role: String(user.role),
        email: String(user.email),
        isSelected: user.isSelected
      },
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
        phone: user.phone || '',
        role: user.role,
        isSelected: user.isSelected
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
      phone: req.user.phone || '',
      role: req.user.role,
      isSelected: req.user.isSelected,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;
