/**
 * Authentication Routes
 * POST /api/auth/login
 * POST /api/auth/register
 * GET  /api/auth/me
 * PUT  /api/auth/profile
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { findOne, insert, findById, update } = require('../middleware/db');
const protect = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional(),
  role: Joi.string().valid('client', 'staff').default('client')
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password } = value;

    // Find user
    const users = findOne('users', { email });
    if (!users) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = users;

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data (without password)
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar_color: user.avatar_color
    };

    res.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Create new client account (admin creates admins via DB)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name, email, password, phone, role } = value;

    // Check if user already exists
    const existingUser = findOne('users', { email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = insert('users', {
      name,
      email,
      password_hash: passwordHash,
      role: role === 'staff' ? 'staff' : 'client',
      phone: phone || null,
      avatar_color: `hsl(${Math.random() * 360}, 70%, 45%)`
    });

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        avatar_color: newUser.avatar_color
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', protect, async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'avatar_color'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const updated = update('users', req.user.id, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return updated user
    const user = findById('users', req.user.id)[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar_color: user.avatar_color
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
