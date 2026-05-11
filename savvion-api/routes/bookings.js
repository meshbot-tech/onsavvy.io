/**
 * Bookings Routes
 * GET    /api/bookings              - Get all bookings (admin) or user's bookings (client)
 * GET    /api/bookings/:id          - Get single booking
 * POST   /api/bookings              - Create new booking
 * PATCH  /api/bookings/:id          - Update booking status
 * DELETE /api/bookings/:id          - Cancel/delete booking
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { find, findById, insert, update, raw, transaction } = require('../middleware/db');

const router = express.Router();

/**
 * Helper: Generate unique booking reference
 */
function generateRef() {
  return 'SVB-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/**
 * GET /api/bookings
 * Admin: all bookings
 * Client: only their own
 */
router.get('/', async (req, res, next) => {
  try {
    let sql = `
      SELECT b.*,
        u.name as client_name,
        u.email as client_email,
        u.phone as client_phone,
        s.name as service_name,
        s.color as service_color,
        s.duration_minutes as duration
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
    `;

    const params = [];
    const conditions = [];

    // If user is client, filter by their user_id
    if (req.user.role !== 'admin') {
      conditions.push('b.user_id = ?');
      params.push(req.user.id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY b.date DESC, b.time DESC';

    const bookings = raw(sql, params);

    const formatted = bookings.map(b => ({
      id: b.id,
      clientId: b.user_id,
      clientName: b.client_name,
      clientEmail: b.client_email,
      clientPhone: b.client_phone,
      clientAvatar: b.client_name.charAt(0).toUpperCase(),
      clientColor: b.service_color || '#3b82f6',
      service: b.service_name,
      serviceId: b.service_id,
      date: b.date,
      time: b.time,
      duration: b.duration ? `${b.duration} min` : '60 min',
      amount: 0, // Will be calculated from service price later
      status: b.status,
      reference: b.reference_code,
      location: b.location,
      staff: b.staff,
      notes: b.notes,
      created: b.created_at
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const sql = `
      SELECT b.*,
        u.name as client_name,
        u.email as client_email,
        u.phone as client_phone,
        s.name as service_name,
        s.color as service_color,
        s.duration_minutes as duration,
        s.price as service_price
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN services s ON b.service_id = s.id
      WHERE b.id = ?
    `;
    const bookings = raw(sql, [req.params.id]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Non-admin users can only view their own bookings
    if (req.user.role !== 'admin' && bookings[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking'
      });
    }

    const b = bookings[0];
    res.json({
      success: true,
      data: {
        id: b.id,
        clientId: b.user_id,
        clientName: b.client_name,
        clientEmail: b.client_email,
        clientPhone: b.client_phone,
        clientAvatar: b.client_name.charAt(0).toUpperCase(),
        clientColor: b.service_color || '#3b82f6',
        service: b.service_name,
        serviceId: b.service_id,
        date: b.date,
        time: b.time,
        duration: b.duration ? `${b.duration} min` : '60 min',
        amount: b.service_price || 0,
        status: b.status,
        reference: b.reference_code,
        location: b.location || 'To be confirmed',
        staff: b.staff,
        notes: b.notes,
        created: b.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookings
 * Create new booking
 * Admin can create for any user; client creates for themselves
 */
router.post('/', async (req, res, next) => {
  try {
    const { serviceId, date, time, status, location, staff, notes, userId } = req.body;

    // Validate service exists
    const services = raw('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service'
      });
    }

    const service = services[0];

    // Determine user_id: admin can specify, client can only create for self
    let bookingUserId = userId;
    if (req.user.role !== 'admin') {
      bookingUserId = req.user.id;
    } else if (!bookingUserId) {
      return res.status(400).json({ success: false, error: 'User ID required for admin bookings' });
    }

    const reference = generateRef();

    const newBooking = insert('bookings', {
      user_id: bookingUserId,
      service_id: serviceId,
      date,
      time,
      status: status || 'confirmed',
      reference_code: reference,
      location: location || 'To be confirmed',
      staff: staff || service.staff_assigned || 'To be assigned',
      notes: notes || null
    });

    // Update client total spent
    raw(`
      UPDATE clients
      SET total_spent = total_spent + ?, last_active = DATE('now')
      WHERE user_id = ?
    `, [service.price, bookingUserId]);

    // Create notification for client
    raw(`
      INSERT INTO notifications (user_id, icon, icon_color, text, type)
      VALUES (?, 'ti-calendar-check', 'var(--green)', ?, 'booking')
    `, [bookingUserId, `Your booking for ${service.name} on ${date} at ${time} has been confirmed.`]);

    // Log activity
    raw(`
      INSERT INTO activity_logs (icon, icon_color, text, metadata)
      VALUES ('ti-calendar-event', 'var(--green)', ?, ?)
    `, [`New booking created for ${service.name}`, JSON.stringify({ bookingId: newBooking.id })]);

    res.status(201).json({
      success: true,
      data: { id: newBooking.id, reference }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/bookings/:id
 * Update booking status, date, time, etc.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, date, time, location, staff, notes } = req.body;
    const updates = {};
    const oldBooking = findById('bookings', req.params.id);

    if (oldBooking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = oldBooking[0];

    // Authorization: non-admin can only update their own
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (status !== undefined) updates.status = status;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (location !== undefined) updates.location = location;
    if (staff !== undefined) updates.staff = staff;
    if (notes !== undefined) updates.notes = notes;

    const result = update('bookings', req.params.id, updates);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Activity log for status changes
    if (status && status !== booking.status) {
      const statusEmoji = { confirmed: '✅', completed: '✅', cancelled: '❌', pending: '⏳' }[status] || '📝';
      raw(`
        INSERT INTO activity_logs (icon, icon_color, text, metadata)
        VALUES ('ti-calendar-event', 'var(--blue)', ?, ?)
      `, [`Booking status changed to ${statusEmoji} ${status}`, JSON.stringify({ bookingId: req.params.id })]);
    }

    res.json({
      success: true,
      message: 'Booking updated'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel booking (soft delete via status)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const bookingResult = findById('bookings', req.params.id);
    if (bookingResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = bookingResult[0];

    // Authorization
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Mark as cancelled instead of hard delete
    const result = update('bookings', req.params.id, { status: 'cancelled' });

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking cancelled'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
