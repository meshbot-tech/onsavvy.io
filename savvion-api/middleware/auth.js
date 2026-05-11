/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Also check for token in query params (for WebSocket or special cases)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No authentication token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const users = query('SELECT id, email, name, role, phone, avatar_color FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists'
      });
    }

    const user = users[0];
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * Admin-only middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

/**
 * Optional auth - doesn't require token but adds user if present
 */
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = query('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);
      if (users.length > 0) {
        req.user = users[0];
      }
    } catch (err) {
      // Invalid token, continue without user
    }
  }
  next();
};

module.exports = protect;
module.exports.adminOnly = adminOnly;
module.exports.optionalAuth = optionalAuth;
