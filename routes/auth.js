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

// 2. OTP Request Limiter: max 5 requests per hour per phone
const otpRequestLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Maximum OTP request limit reached (5 requests per hour). Please try again later.',
  keyGenerator: (req) => {
    const val = (req.body.phone || req.body.value || req.ip || '').toLowerCase().trim();
    return `otp_req_${val}`;
  }
});

// Helper: Normalize phone to 10 digits
function getCleanPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// POST /api/auth/send-otp - Generate 6-digit OTP for Registration & Phone/Email verification
router.post('/send-otp', otpRequestLimiter, async (req, res) => {
  try {
    const { target, value } = req.body;
    if (!value) {
      return res.status(400).json({ success: false, error: 'Phone number or Email ID is required' });
    }

    const rawValue = value.toLowerCase().trim();
    const isEmail = target === 'email' || rawValue.includes('@');
    let destinationKey = rawValue;

    if (!isEmail) {
      const cleanPhone = getCleanPhone(rawValue);
      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
      }
      destinationKey = cleanPhone;
    }

    // Rate Rule: Invalidate older OTPs for this phone/target
    await Otp.deleteMany({ phone: destinationKey, purpose: 'verification' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      phone: destinationKey,
      otpHash,
      purpose: 'verification',
      expiresAt,
      attempts: 0,
      used: false
    });

    // Send via active provider (console, email, msg91)
    await sendOtp(destinationKey, otp, 'verification');

    // NEVER RETURN OTP IN API RESPONSE
    res.json({
      success: true,
      message: `Verification code sent to your ${isEmail ? 'email' : 'phone'} (${value}). Valid for 5 minutes.`,
      target: destinationKey
    });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp - Verify OTP code using DB Otp model
router.post('/verify-otp', async (req, res) => {
  try {
    const { value, otp } = req.body;
    if (!value || !otp) {
      return res.status(400).json({ success: false, error: 'Value and OTP are required' });
    }

    const rawValue = value.toLowerCase().trim();
    const isEmail = rawValue.includes('@');
    const destinationKey = isEmail ? rawValue : (getCleanPhone(rawValue) || rawValue);

    const record = await Otp.findOne({
      phone: destinationKey,
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
      return res.status(400).json({ success: false, error: 'Too many wrong attempts. This OTP is now invalidated. Please request a new OTP.' });
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
      message: 'OTP verified successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// TASK 4: FORGOT PASSWORD FLOW (Phone -> Request OTP -> Verify OTP -> Reset)
// =========================================================================

// POST /api/auth/forgot-password-otp - Request OTP for phone
// Rule 3: Returns GENERIC success message whether user exists or not (Prevents user enumeration)
// Rule 4: 5 min validity, 30s resend cooldown, 5 reqs/hr rate limit, invalidate older OTPs
router.post('/forgot-password-otp', otpRequestLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Registered phone number is required' });
    }

    const cleanPhone = getCleanPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // 30-Second Resend Cooldown Check
    const latestOtp = await Otp.findOne({
      phone: cleanPhone,
      purpose: 'reset'
    }).sort({ createdAt: -1 });

    if (latestOtp && (Date.now() - new Date(latestOtp.createdAt).getTime() < 30 * 1000)) {
      const waitSeconds = Math.ceil((30 * 1000 - (Date.now() - new Date(latestOtp.createdAt).getTime())) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // Check if phone exists in DB
    const user = await User.findOne({ phone: cleanPhone });

    // Always invalidate any previous reset OTPs for this phone
    await Otp.deleteMany({ phone: cleanPhone, purpose: 'reset' });

    // Generic Response Message
    const genericResponse = {
      success: true,
      message: 'If this phone number is registered, a 6-digit verification code has been dispatched.',
      phone: cleanPhone
    };

    // If user does NOT exist, do NOT send SMS, but return generic success (anti-enumeration)
    if (!user) {
      console.log(`[AUTH] Forgot password requested for non-existent phone: +91${cleanPhone}`);
      return res.json(genericResponse);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      phone: cleanPhone,
      otpHash,
      purpose: 'reset',
      expiresAt,
      attempts: 0,
      used: false
    });

    // Send OTP via configured provider
    const providerTarget = (process.env.SMS_PROVIDER === 'email' && user.email) ? user.email : cleanPhone;
    await sendOtp(providerTarget, otp, 'reset');

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password OTP error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error processing request' });
  }
});

// POST /api/auth/verify-reset-otp - Verify OTP and return short-lived Reset JWT (10 mins, purpose=reset)
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
    }

    const cleanPhone = getCleanPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    const record = await Otp.findOne({
      phone: cleanPhone,
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
      return res.status(400).json({ success: false, error: 'Maximum 3 attempts exceeded. OTP has been invalidated.' });
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

    // Verify user exists for token creation
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Issue short-lived Reset Token (10 minutes, purpose=reset)
    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const resetToken = jwt.sign(
      {
        id: String(user._id),
        phone: cleanPhone,
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
      return res.status(400).json({ success: false, error: 'Reset token and new password are required' });
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

    console.log(`🔒 [PASSWORD RESET COMPLETE] User: ${user.phone || user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// REGISTRATION & LOGIN
// =========================================================================

// POST /api/auth/signup - Register Startup User
router.post('/signup', async (req, res) => {
  try {
    const { name, companyName, email, password, phone } = req.body;

    const startupTitle = (companyName || name || '').trim();
    if (!startupTitle || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide Company Name, Email ID, and Password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? getCleanPhone(phone) : null;

    if (phone && !cleanPhone) {
      return res.status(400).json({ success: false, error: 'Invalid 10-digit Indian phone number.' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(cleanPhone ? [{ phone: cleanPhone }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === normalizedEmail
          ? 'User account with this email already exists.'
          : 'User account with this phone number already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: startupTitle,
      email: normalizedEmail,
      phone: cleanPhone || undefined,
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
        phone: newUser.phone,
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
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

const { adminUsers } = require('../data/seedData');

// POST /api/auth/login - Authenticate Startup or Admin User
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both identifier (email/phone/name) and password.' });
    }

    const cleanInput = email.toLowerCase().trim();
    const phoneInput = getCleanPhone(email);

    let user = await User.findOne({
      $or: [
        { email: cleanInput },
        { name: new RegExp(`^${cleanInput}$`, 'i') },
        ...(phoneInput ? [{ phone: phoneInput }] : [])
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
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const token = jwt.sign(
      {
        id: String(user._id),
        role: String(user.role),
        email: String(user.email),
        phone: user.phone,
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
        phone: user.phone,
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
      phone: req.user.phone,
      role: req.user.role,
      isSelected: req.user.isSelected,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;
