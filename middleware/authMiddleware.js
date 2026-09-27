const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'govbridge_secret_2026';

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No authentication token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = String(JWT_SECRET || 'govbridge_secret_2026');
    const decoded = jwt.verify(token, secretKey);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token.' });
  }
};

// Middleware to enforce Admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  JWT_SECRET
};
