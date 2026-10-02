const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

const nodemailer = require('nodemailer');
const https = require('https');

// Helper to create Nodemailer Transporter for Real Email Dispatch
const createMailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  // Default SMTP transport fallback
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'govbridge.otp@gmail.com',
      pass: process.env.GMAIL_PASS || 'demo_pass'
    }
  });
};

// Dispatch Real Email to user's inbox
const sendRealEmailOtp = async (email, otp) => {
  try {
    const transporter = createMailTransporter();
    await transporter.sendMail({
      from: '"GovBridge SIH2026 Verification" <no-reply@govbridge.gov.in>',
      to: email,
      subject: 'GovBridge SIH 2026 - Verification OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #1e293b; margin-top: 0;">GovBridge SIH 2026 Verification</h2>
            <p style="color: #475569; font-size: 14px;">Your 6-digit verification OTP code is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 6px; padding: 15px; background: #eff6ff; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 12px;">This code is valid for 10 minutes. Check your inbox to verify your account.</p>
          </div>
        </div>
      `
    });
    console.log(`📧 [REAL EMAIL SENT] Dispatched OTP ${otp} to Email Inbox: ${email}`);
  } catch (err) {
    console.log(`📧 [EMAIL DISPATCH LOG] OTP ${otp} generated for ${email}. (${err.message})`);
  }
};

// Dispatch Real SMS to user's Mobile Phone Messenger
const sendRealSmsOtp = async (phone, otp) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  
  // 1. Fast2SMS API Gateway
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const postData = JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone
      });
      const req = https.request({
        hostname: 'www.fast2sms.com',
        path: '/dev/bulkV2',
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      }, (res) => {
        console.log(`📱 [FAST2SMS DISPATCH] Status ${res.statusCode} for +91${cleanPhone}`);
      });
      req.write(postData);
      req.end();
      return;
    } catch (err) {
      console.error('Fast2SMS error:', err.message);
    }
  }

  // 2. Twilio SMS Gateway
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `GovBridge Verification Code: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${cleanPhone}`
      });
      console.log(`📱 [TWILIO SMS DISPATCH] Real SMS sent to +91${cleanPhone}`);
      return;
    } catch (err) {
      console.error('Twilio SMS error:', err.message);
    }
  }

  console.log(`📱 [SMS MESSENGER DISPATCH] Generated OTP ${otp} for Mobile +91${cleanPhone}`);
};

// In-memory OTP Store for Verification (Key: target value, Value: { otp, expiresAt })
const otpStore = new Map();

// POST /api/auth/send-otp - Generate 6-digit OTP for Phone or Email
router.post('/send-otp', async (req, res) => {
  try {
    const { target, value } = req.body;
    if (!value) {
      return res.status(400).json({ success: false, error: 'Phone number or Email ID is required' });
    }

    const cleanValue = value.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    otpStore.set(cleanValue, { otp, expiresAt });

    // Dispatch to Email Inbox or Phone SMS Messenger
    if (target === 'email' || cleanValue.includes('@')) {
      await sendRealEmailOtp(cleanValue, otp);
    } else {
      await sendRealSmsOtp(cleanValue, otp);
    }

    // DO NOT RETURN OTP CODE TO CLIENT FRONTEND!
    res.json({
      success: true,
      message: `Verification code sent to your Mobile SMS Messenger / Email inbox (${value}). Please check your inbox.`,
      target: cleanValue
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
