/**
 * User Management Routes (Staff)
 * Admins can manage staff accounts
 * GET    /api/users              - List all users (admin only)
 * GET    /api/users/:id          - Get single user
 * POST   /api/users              - Create user (admin)
 * PATCH  /api/users/:id          - Update user
 * DELETE /api/users/:id          - Delete user (soft delete preferred)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { find, findById, insert, update, del, raw } = require('../middleware/db');
const adminOnly = require('../middleware/auth').adminOnly;
const protect = require('../middleware/auth').protect;

const router = express.Router();

/**
 * GET /api/users
 * List all users (filters: role, search, pagination)
 */
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, email, name, role, phone, avatar_color, email_verified, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Count total
    const countSql = `SELECT COUNT(*) as total FROM users WHERE 1=1 ${role ? 'AND role = ?' : ''}${search ? ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)' : ''}`;
    const countResult = raw(countSql, role ? [role, `%${search}%`, `%${search}%`, `%${search}%`] : search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    const total = countResult[0].total;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = raw(sql, params);

    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      avatarColor: u.avatar_color,
      emailVerified: u.email_verified,
      createdAt: u.created_at
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Get single user details with their bookings/leads stats
 */
router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const users = findById('users', req.params.id);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const user = users[0];

    // Get stats
    const bookingsCount = raw('SELECT COUNT(*) as count FROM bookings WHERE user_id = ?', [req.params.id]);
    const leadsCount = raw('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [req.params.id]);
    const clientsCount = raw('SELECT COUNT(*) as count FROM clients WHERE user_id = ?', [req.params.id]);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarColor: user.avatar_color,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        stats: {
          bookings: bookingsCount[0].count,
          leadsAssigned: leadsCount[0].count,
          clientsManaged: clientsCount[0].count
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Create new user (staff or client)
 */
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, email, password, role = 'staff', phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if email exists
    const existing = findOne('users', { email });
    if (existing) {
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
      role: role === 'admin' || role === 'staff' ? role : 'staff',
      phone: phone || null,
      avatar_color: `hsl(${Math.random() * 360}, 70%, 45%)`,
      email_verified: false
    });

    // Log activity
    raw(`
      INSERT INTO activity_logs (icon, icon_color, text, metadata)
      VALUES ('ti-user-plus', 'var(--blue)', ?, ?)
    `, [`New <strong>${role}</strong> user <strong>${name}</strong> added`, JSON.stringify({ userId: newUser.id })]);

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone
      },
      message: 'User created successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/users/:id
 * Update user details
 */
router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, email, phone, role, isActive } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role === 'admin' || role === 'staff' || role === 'client' ? role : 'staff';
    // Note: No password update here - would need separate endpoint

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // If email is being changed, check for uniqueness
    if (email) {
      const existing = findOne('users', { email });
      if (existing && existing.id.toString() !== req.params.id) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken'
        });
      }
    }

    const result = update('users', req.params.id, updates);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (soft delete preferred - mark as inactive)
 */
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    // Prevent deleting self
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Soft delete: update to inactive (would need is_active column)
    // For now, hard delete but with checks
    const result = del('users', req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id/password
 * Change user password (admin reset)
 */
router.put('/:id/password', adminOnly, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = update('users', req.params.id, { password_hash: passwordHash });

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
