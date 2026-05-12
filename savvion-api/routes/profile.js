/**
 * Profile Routes
 * GET  /api/profile      - Get current user profile
 * PUT  /api/profile      - Update profile
 */

const express = require('express');
const { findById, raw } = require('../middleware/db');

const router = express.Router();

/**
 * GET /api/profile
 */
router.get('/', (req, res) => {
  try {
    const user = req.user;

    // Get additional client data if user is a client
    let clientData = null;
    if (user.role === 'client') {
      const client = raw('SELECT * FROM clients WHERE user_id = ?', [user.id]);
      if (client.length > 0) {
        clientData = {
          ...client[0],
          tags: client[0].tags ? JSON.parse(client[0].tags) : []
        };
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar_color: user.avatar_color,
        client: clientData
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile
 */
router.put('/', (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const result = update('users', req.user.id, updates);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Return updated user
    const updatedUser = findById('users', req.user.id)[0];
    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar_color: updatedUser.avatar_color
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
