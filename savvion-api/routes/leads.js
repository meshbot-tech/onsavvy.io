/**
 * Leads Routes
 * GET    /api/leads              - Get all leads (admin only)
 * GET    /api/leads/:id          - Get single lead
 * POST   /api/leads              - Create new lead
 * PATCH  /api/leads/:id          - Update lead (stage change for kanban)
 * DELETE /api/leads/:id          - Delete lead
 */

const express = require('express');
const { find, findById, insert, update, del, raw } = require('../middleware/db');
const adminOnly = require('../middleware/auth').adminOnly;

const router = express.Router();

/**
 * GET /api/leads
 * Get all leads with optional filters
 * Query params: ?stage=new&source=website&search=john
 */
router.get('/', async (req, res, next) => {
  try {
    let sql = `
      SELECT l.*,
        s.name as service_name,
        s.color as service_color
      FROM leads l
      LEFT JOIN services s ON l.service_id = s.id
    `;

    const conditions = [];
    const params = [];

    // Filter by stage
    if (req.query.stage) {
      conditions.push('l.stage = ?');
      params.push(req.query.stage);
    }

    // Filter by source
    if (req.query.source) {
      conditions.push('l.source = ?');
      params.push(req.query.source);
    }

    // Search by name/email/phone
    if (req.query.search) {
      conditions.push('(l.client_name LIKE ? OR l.client_email LIKE ? OR l.client_phone LIKE ?)');
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY l.created_at DESC';

    const leads = raw(sql, params);

    // Format response
    const formatted = leads.map(l => ({
      id: l.id,
      clientName: l.client_name,
      clientEmail: l.client_email,
      clientPhone: l.client_phone,
      service: l.service_name || 'General Inquiry',
      serviceId: l.service_id,
      source: l.source,
      srcClass: `src-${l.source}`,
      stage: l.stage,
      value: parseFloat(l.value) || 0,
      created: l.created_at.slice(0, 10),
      contacted: l.updated_at !== l.created_at, // simplistic
      notes: l.notes,
      clientAvatar: (l.client_name || 'L').charAt(0).toUpperCase(),
      clientColor: l.service_color || '#3b82f6'
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
 * GET /api/leads/:id
 * Get single lead
 */
router.get('/:id', async (req, res, next) => {
  try {
    const sql = `
      SELECT l.*, s.name as service_name, s.color as service_color
      FROM leads l
      LEFT JOIN services s ON l.service_id = s.id
      WHERE l.id = ?
    `;
    const leads = raw(sql, [req.params.id]);

    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const l = leads[0];
    res.json({
      success: true,
      data: {
        id: l.id,
        clientName: l.client_name,
        clientEmail: l.client_email,
        clientPhone: l.client_phone,
        service: l.service_name,
        serviceId: l.service_id,
        source: l.source,
        value: parseFloat(l.value) || 0,
        stage: l.stage,
        assignedTo: l.assigned_to,
        notes: l.notes,
        created: l.created_at,
        updated: l.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/leads
 * Create new lead - PUBLIC ENDPOINT for website forms
 */
router.post('/', async (req, res, next) => {
  try {
    const { clientName, clientEmail, clientPhone, serviceId, source, value, stage, notes } = req.body;

    const insertData = {
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      service_id: serviceId || null,
      source: source || 'website',
      value: value || 0,
      stage: stage || 'new',
      notes: notes || null
    };

    const newLead = insert('leads', insertData);

    // Log activity
    raw(`
      INSERT INTO activity_logs (icon, icon_color, text, metadata)
      VALUES ('ti-user-plus', 'var(--blue)', ?, ?)
    `, [`New lead <strong>${clientName}</strong> added`, JSON.stringify({ leadId: newLead.id })]);

    res.status(201).json({
      success: true,
      data: { id: newLead.id }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/leads/:id
 * Update lead (stage, value, notes, etc.)
 * Used by kanban drag-drop
 */
router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const { stage, value, notes, clientName, clientEmail, clientPhone, serviceId, source } = req.body;
    const updates = {};

    if (stage !== undefined) updates.stage = stage;
    if (value !== undefined) updates.value = value;
    if (notes !== undefined) updates.notes = notes;
    if (clientName !== undefined) updates.client_name = clientName;
    if (clientEmail !== undefined) updates.client_email = clientEmail;
    if (clientPhone !== undefined) updates.client_phone = clientPhone;
    if (serviceId !== undefined) updates.service_id = serviceId;
    if (source !== undefined) updates.source = source;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const result = update('leads', req.params.id, updates);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Log stage change activity
    if (stage) {
      raw(`
        INSERT INTO activity_logs (icon, icon_color, text, metadata)
        VALUES ('ti-filter', 'var(--purple)', ?, ?)
      `, [`Lead moved to <strong>${stage.charAt(0).toUpperCase() + stage.slice(1)}</strong>`, JSON.stringify({ leadId: req.params.id })]);
    }

    res.json({
      success: true,
      message: 'Lead updated'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/leads/:id
 * Delete lead
 */
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = del('leads', req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/stats/pipeline
 * Get pipeline counts per stage
 */
router.get('/stats/pipeline', adminOnly, async (req, res) => {
  try {
    const pipeline = raw(`
      SELECT stage, COUNT(*) as count, SUM(value) as total_value
      FROM leads
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal' THEN 4
          WHEN 'won' THEN 5
          WHEN 'lost' THEN 6
        END
    `);

    res.json({
      success: true,
      data: pipeline
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
