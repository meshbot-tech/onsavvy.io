/**
 * Clients Routes (Admin only)
 * GET    /api/clients              - List all clients
 * GET    /api/clients/:id          - Get client detail
 * PUT    /api/clients/:id          - Update client
 * DELETE /api/clients/:id          - Delete client
 */

const express = require('express');
const { find, findById, insert, update, del, raw } = require('../middleware/db');
const adminOnly = require('../middleware/auth').adminOnly;

const router = express.Router();

/**
 * GET /api/clients
 * Get all clients with pagination
 */
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = raw('SELECT COUNT(*) as total FROM clients');
    const total = countResult[0].total;

    // Get clients
    const clients = raw(`
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.last_active DESC NULLS LAST, c.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const formatted = clients.map(c => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      totalSpent: parseFloat(c.total_spent) || 0,
      lastActive: c.last_active,
      tags: c.tags ? JSON.parse(c.tags) : [],
      user: c.user_name ? { name: c.user_name, email: c.user_email } : null
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clients/:id
 * Get single client + booking history
 */
router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const clientResult = findById('clients', req.params.id);
    if (clientResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const c = clientResult[0];

    // Get booking count and totals
    const bookingStats = raw(`
      SELECT COUNT(*) as booking_count, COALESCE(SUM(s.price), 0) as total_spent
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.user_id = ?
        AND b.status != 'cancelled'
    `, [c.user_id]);

    const stats = bookingStats[0] || { booking_count: 0, total_spent: 0 };

    res.json({
      success: true,
      data: {
        id: c.id,
        userId: c.user_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        type: c.type,
        totalSpent: parseFloat(stats.total_spent),
        bookings: stats.booking_count,
        lastActive: c.last_active,
        tags: c.tags ? JSON.parse(c.tags) : [],
        createdAt: c.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clients/:id
 * Update client
 */
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, email, phone, type, tags } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (type !== undefined) updates.type = type;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const result = update('clients', req.params.id, updates);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, message: 'Client updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/clients/:id
 * Delete client
 */
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const client = findById('clients', req.params.id);
    if (client.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // Delete associated user account if exists
    const userId = client[0].user_id;
    if (userId) {
      del('users', userId);
    }

    // Delete client
    const result = del('clients', req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
