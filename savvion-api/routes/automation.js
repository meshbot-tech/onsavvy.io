/**
 * Automation Routes (Admin only)
 * Manage WhatsApp/Email templates and triggers
 */

const express = require('express');
const { find, insert, update, raw } = require('../middleware/db');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/automation/templates
 * Get all automation templates
 * Query: ?channel=whatsapp or ?channel=email
 */
router.get('/templates', adminOnly, (req, res, next) => {
  try {
    let sql = 'SELECT * FROM automation_templates';
    const params = [];

    if (req.query.channel) {
      sql += ' WHERE channel = ?';
      params.push(req.query.channel);
    }

    sql += ' ORDER BY created_at DESC';

    const templates = raw(sql, params);

    const formatted = templates.map(t => ({
      id: t.id,
      name: t.name,
      channel: t.channel,
      trigger: t.trigger_event,
      subject: t.subject,
      body: t.body,
      variables: t.variables ? JSON.parse(t.variables) : [],
      active: t.active,
      sentCount: t.sent_count,
      createdAt: t.created_at
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
 * POST /api/automation/templates (admin only)
 */
router.post('/templates', adminOnly, (req, res, next) => {
  try {
    const { name, channel, trigger, subject, body, variables, active } = req.body;

    if (!name || !channel || !trigger || !body) {
      return res.status(400).json({
        success: false,
        error: 'Name, channel, trigger, and body are required'
      });
    }

    const newTemplate = insert('automation_templates', {
      name,
      channel,
      trigger_event: trigger,
      subject: subject || null,
      body,
      variables: variables ? JSON.stringify(variables) : null,
      active: active !== false,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { id: newTemplate.id }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/automation/templates/:id (admin only)
 */
router.patch('/templates/:id', adminOnly, (req, res, next) => {
  try {
    const { name, trigger, subject, body, variables, active } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (trigger !== undefined) updates.trigger_event = trigger;
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;
    if (variables !== undefined) updates.variables = JSON.stringify(variables);
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const result = update('automation_templates', req.params.id, updates);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, message: 'Template updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/automation/templates/:id (admin only)
 */
router.delete('/templates/:id', adminOnly, (req, res, next) => {
  try {
    const result = raw('DELETE FROM automation_templates WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/automation/triggers
 * Get all trigger rules (hardcoded for now)
 */
router.get('/triggers', adminOnly, (req, res) => {
  try {
    const triggers = [
      {
        id: '1',
        name: 'Booking Confirmed',
        description: 'Send confirmation when booking is created',
        icon: 'ti-check',
        iconColor: 'var(--green)',
        enabled: true,
        event: 'booking_created'
      },
      {
        id: '2',
        name: '24h Before Appointment',
        description: 'Send reminder 24 hours before booking',
        icon: 'ti-clock',
        iconColor: 'var(--blue)',
        enabled: false,
        event: 'booking_reminder_24h'
      },
      {
        id: '3',
        name: 'Lead Won',
        description: 'Celebrate when lead converts to client',
        icon: 'ti-trophy',
        iconColor: 'var(--amber)',
        enabled: true,
        event: 'lead_won'
      },
      {
        id: '4',
        name: 'Lead Lost',
        description: 'Send re-engagement email when lost',
        icon: 'ti-thumb-down',
        iconColor: 'var(--red)',
        enabled: false,
        event: 'lead_lost'
      }
    ];

    res.json({
      success: true,
      data: triggers
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/automation/triggers/:id
 * Enable/disable trigger
 */
router.patch('/triggers/:id', adminOnly, (req, res, next) => {
  try {
    const { enabled } = req.body;
    // In a real implementation, this would update a triggers table
    // For now, it's a mock response
    res.json({
      success: true,
      message: `Trigger ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/automation/send
 * Manually send a message (WhatsApp/Email)
 */
router.post('/send', adminOnly, async (req, res, next) => {
  try {
    const { channel, recipient, templateId, variables } = req.body;

    // Get template
    const templates = raw('SELECT * FROM automation_templates WHERE id = ?', [templateId]);
    if (templates.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const template = templates[0];

    // Replace variables in body
    let messageBody = template.body;
    if (variables) {
      Object.keys(variables).forEach(key => {
        messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
      });
    }

    // Log to automation_logs
    raw(`
      INSERT INTO automation_logs (template_id, type, recipient, status, payload)
      VALUES (?, ?, ?, 'sent', ?)
    `, [templateId, channel, recipient, JSON.stringify({ body: messageBody })]);

    // Increment sent count
    raw(`
      UPDATE automation_templates SET sent_count = sent_count + 1 WHERE id = ?
    `, [templateId]);

    // In production, integrate with WhatsApp/Email API here
    console.log(`[${channel.toUpperCase()}] To: ${recipient} | Message: ${messageBody.substring(0, 50)}...`);

    res.json({
      success: true,
      message: `Message queued for delivery via ${channel}`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
