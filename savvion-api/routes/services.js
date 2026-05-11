/**
 * Services Routes
 * Public read, admin write
 */

const express = require('express');
const { find, findById, insert, update, del } = require('../middleware/db');
const adminOnly = require('../middleware/auth').adminOnly;

const router = express.Router();

/**
 * GET /api/services
 * Get all active services
 */
router.get('/', (req, res) => {
  try {
    const services = find('services', { active: true });
    const formatted = services.map(s => ({
      id: s.id,
      name: s.name,
      duration: s.duration_minutes,
      price: parseFloat(s.price),
      color: s.color,
      staff: s.staff_assigned,
      description: s.description
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
 * GET /api/services/:id
 */
router.get('/:id', (req, res, next) => {
  try {
    const services = findById('services', req.params.id);
    if (services.length === 0) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const s = services[0];
    res.json({
      success: true,
      data: {
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: parseFloat(s.price),
        color: s.color,
        staff: s.staff_assigned,
        description: s.description,
        active: s.active
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/services (admin only)
 */
router.post('/', adminOnly, (req, res, next) => {
  try {
    const { name, duration, price, color, staff, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price required' });
    }

    const newService = insert('services', {
      name,
      duration_minutes: duration || 60,
      price: parseFloat(price),
      color: color || '#16A066',
      staff_assigned: staff || null,
      description: description || null
    });

    res.status(201).json({
      success: true,
      data: { id: newService.id }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/services/:id (admin only)
 */
router.put('/:id', adminOnly, (req, res, next) => {
  try {
    const { name, duration, price, color, staff, description, active } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (duration !== undefined) updates.duration_minutes = duration;
    if (price !== undefined) updates.price = parseFloat(price);
    if (color !== undefined) updates.color = color;
    if (staff !== undefined) updates.staff_assigned = staff;
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const result = update('services', req.params.id, updates);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    res.json({ success: true, message: 'Service updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/services/:id (admin only)
 */
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    const result = del('services', req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
