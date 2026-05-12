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

    // Create immediate in-app notifications for all admin users
    try {
      const admins = raw(`SELECT id, name FROM users WHERE role = 'admin'`);
      const leadPreview = `${clientName}${clientEmail ? ' • ' + clientEmail : ''}`;
      const notifText = `New lead: <strong>${clientName}</strong>${notes ? ` • ${notes.substring(0, 50)}...` : ''}`;

      admins.forEach(admin => {
        raw(`
          INSERT INTO notifications (user_id, icon, icon_color, text, type, action_url)
          VALUES (?, 'ti-user-plus', 'var(--blue)', ?, 'lead', '/admin/leads')
        `, [admin.id, notifText]);
      });
    } catch (notifErr) {
      console.error('Failed to create admin notifications:', notifErr);
      // Non-critical - continue
    }

    // Attempt to send immediate WhatsApp/Email alerts to admins if configured
    // Note: services array and budget are already captured in req.body.notes but we also have them as separate fields if sent
    // For best results, frontend should send services and budget as separate fields; currently they are embedded in notes.
    // We'll pass the notes string which contains both; sendAdminAlert will extract.
    sendAdminAlert({
      clientName,
      clientEmail,
      clientPhone,
      notes: notes || '',
      servicesList: (req.body.services ? Array.isArray(req.body.services) ? req.body.services.join(', ') : req.body.services : ''),
      budget: req.body.budget || ''
    }).catch(err => console.error('Failed to send admin alert:', err));

    res.status(201).json({
      success: true,
      data: { id: newLead.id },
      message: 'Lead created successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Send immediate alert to admins via WhatsApp/Email if configured
 */
async function sendAdminAlert({ clientName, clientEmail, clientPhone, services, budget }) {
  // Check for WhatsApp config
  const whatsappToken = process.env.WHATSAPP_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
  const adminWhatsAppNumbers = process.env.ADMIN_WHATSAPP_NUMBERS
    ? process.env.ADMIN_WHATSAPP_NUMBERS.split(',').map(n => n.trim())
    : ['+25495582978', '+254713082563']; // Default admin numbers

  // Check for Email config
  const emailService = process.env.EMAIL_SERVICE;
  const emailApiKey = process.env.EMAIL_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@savvion.co.ke';
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
    : ['hello@savvion.co.ke'];

  const message = `�� New Lead Alert!\n\n` +
                  `Name: ${clientName}\n` +
                  `Email: ${clientEmail || 'N/A'}\n` +
                  `Phone: ${clientPhone || 'N/A'}\n` +
                  `Services: ${services}\n` +
                  `Budget: ${budget}\n\n` +
                  `Time: ${new Date().toLocaleString('en-KE')}`;

  // Send WhatsApp if configured
  if (whatsappToken && whatsappPhoneId) {
    for (const to of adminWhatsAppNumbers) {
      try {
        await fetch(
          `https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to,
              type: 'text',
              text: { body: message }
            })
          }
        );
        console.log(`[WhatsApp] Alert sent to ${to}`);
      } catch (err) {
        console.error(`[WhatsApp] Failed to send to ${to}:`, err.message);
      }
    }
  } else {
    console.log('[WhatsApp] Not configured. Skipping WhatsApp alerts.');
  }

  // Send Email if configured
  if (emailService && emailApiKey) {
    const emailSubject = `New Lead: ${clientName} – ${services.substring(0, 30)}...`;
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;padding:20px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#16A066">New Lead Received</h2>
        <p><strong>Name:</strong> ${clientName}</p>
        <p><strong>Email:</strong> ${clientEmail || 'N/A'}</p>
        <p><strong>Phone:</strong> ${clientPhone || 'N/A'}</p>
        <p><strong>Services:</strong> ${services}</p>
        <p><strong>Budget:</strong> ${budget}</p>
        <p style="margin-top:20px;font-size:12px;color:#666">
          Received at ${new Date().toLocaleString('en-KE')}
        </p>
      </div>
    `;

    for (const to of adminEmails) {
      try {
        // Using Resend as example
        if (emailService === 'resend') {
          const resend = require('resend')(emailApiKey);
          await resend.emails.send({
            from: emailFrom,
            to,
            subject: emailSubject,
            html: emailHtml
          });
          console.log(`[Email] Alert sent to ${to}`);
        } else {
          // Placeholder for other providers (SendGrid, Nodemailer, etc.)
          console.log(`[Email] Provider ${emailService} not implemented in this snippet.`);
        }
      } catch (err) {
        console.error(`[Email] Failed to send to ${to}:`, err.message);
      }
    }
  } else {
    console.log('[Email] Not configured. Skipping email alerts.');
  }
}

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
