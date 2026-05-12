/**
 * Notifications Routes
 * GET    /api/notifications              - Get user's notifications
 * PATCH  /api/notifications/:id/read    - Mark single notification as read
 * POST   /api/notifications/mark-all-read - Mark all as read
 */

const express = require('express');
const { find, findById, update, insert, raw } = require('../middleware/db');

const router = express.Router();

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get('/', (req, res) => {
  try {
    const notifications = raw(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    const formatted = notifications.map(n => ({
      id: n.id,
      icon: n.icon,
      iconColor: n.icon_color,
      text: n.text,
      type: n.type,
      read: n.read === 1,
      actionUrl: n.action_url,
      time: new Date(n.created_at).toLocaleString('en-KE', { hour: '2-digit', minute: '2-digit' })
    }));

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      data: formatted,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', (req, res, next) => {
  try {
    const result = update('notifications', req.params.id, { read: true });
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all user's notifications as read
 */
router.post('/mark-all-read', (req, res, next) => {
  try {
    raw('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications
 * Create notification (internal use)
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId, icon, iconColor, text, type, actionUrl } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ success: false, error: 'User ID and text required' });
    }

    const newNotif = insert('notifications', {
      user_id: userId,
      icon: icon || 'ti-info-circle',
      icon_color: iconColor || 'var(--blue)',
      text,
      type: type || 'info',
      action_url: actionUrl || null
    });

    res.status(201).json({
      success: true,
      data: { id: newNotif.id }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
