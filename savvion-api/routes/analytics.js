/**
 * Analytics Routes (Admin only)
 * GET /api/analytics             - Dashboard overview stats
 * GET /api/analytics/revenue     - Revenue history
 * GET /api/analytics/funnel      - Lead conversion funnel
 * GET /api/analytics/bookings    - Bookings by month
 * GET /api/analytics/services    - Service mix
 * GET /api/analytics/sources     - Lead sources breakdown
 * GET /api/analytics/top-clients - Top clients by lifetime value
 */

const express = require('express');
const { raw } = require('../middleware/db');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/analytics
 * Main dashboard KPIs
 */
router.get('/', adminOnly, async (req, res, next) => {
  try {
    // Total revenue (all confirmed/completed bookings)
    const revenueResult = raw(`
      SELECT COALESCE(SUM(s.price), 0) as total_revenue
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.status IN ('confirmed', 'completed')
    `);

    // Total bookings (last 30 days)
    const bookingsResult = raw(`
      SELECT COUNT(*) as total_bookings
      FROM bookings
      WHERE date >= DATE('now', '-30 days')
    `);

    // Active leads
    const leadsResult = raw(`
      SELECT COUNT(*) as total_leads FROM leads
    `);

    // Win rate
    const wonLost = raw(`
      SELECT
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) as lost,
        COUNT(*) as total
      FROM leads
    `);
    const winRate = wonLost[0].total > 0 ? ((wonLost[0].won / wonLost[0].total) * 100).toFixed(0) : 0;

    // Average booking value
    const avgResult = raw(`
      SELECT AVG(s.price) as avg_value
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.status IN ('confirmed', 'completed')
    `);

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(revenueResult[0].total_revenue),
        totalBookings: bookingsResult[0].total_bookings,
        activeLeads: leadsResult[0].total_leads,
        winRate: parseFloat(winRate),
        avgBookingValue: parseFloat(avgResult[0].avg_value) || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/revenue
 * Monthly revenue for the last N months (default 6)
 */
router.get('/revenue', adminOnly, (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = raw(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(s.price) as revenue
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.status IN ('confirmed', 'completed')
        AND b.date >= DATE('now', '-' || ? || ' months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `, [months]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = data.map(d => {
      const [year, monthNum] = d.month.split('-');
      return {
        month: monthNames[parseInt(monthNum) - 1],
        value: parseFloat(d.revenue) || 0
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/funnel
 * Lead conversion funnel by stage
 */
router.get('/funnel', adminOnly, (req, res, next) => {
  try {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
    const data = [];

    for (const stage of stages) {
      const count = raw('SELECT COUNT(*) as cnt FROM leads WHERE stage = ?', [stage])[0].cnt;
      const totalValue = raw('SELECT COALESCE(SUM(value), 0) as val FROM leads WHERE stage = ?', [stage])[0].val;
      data.push({
        name: stage.charAt(0).toUpperCase() + stage.slice(1),
        count,
        value: parseFloat(totalValue)
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/bookings
 * Bookings by month (last 12 months)
 */
router.get('/bookings', adminOnly, (req, res, next) => {
  try {
    const data = raw(`
      SELECT
        strftime('%Y-%m', date) as month,
        COUNT(*) as bookings
      FROM bookings
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = data.map(d => {
      const [year, monthNum] = d.month.split('-');
      return {
        month: monthNames[parseInt(monthNum) - 1],
        bookings: d.bookings
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/services
 * Service mix - which services are most booked
 */
router.get('/services', adminOnly, (req, res, next) => {
  try {
    const data = raw(`
      SELECT
        s.name,
        COUNT(b.id) as bookings,
        SUM(s.price) as revenue
      FROM services s
      LEFT JOIN bookings b ON s.id = b.service_id AND b.status != 'cancelled'
      GROUP BY s.id
      ORDER BY bookings DESC
    `);

    const formatted = data.map(d => ({
      name: d.name,
      bookings: d.bookings,
      revenue: parseFloat(d.revenue) || 0
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/sources
 * Lead sources breakdown
 */
router.get('/sources', adminOnly, (req, res, next) => {
  try {
    const data = raw(`
      SELECT
        source,
        COUNT(*) as count,
        SUM(value) as total_value
      FROM leads
      GROUP BY source
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/top-clients
 * Top clients by lifetime value
 */
router.get('/top-clients', adminOnly, (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = raw(`
      SELECT
        c.id, c.name, c.type, COUNT(b.id) as bookings, COALESCE(SUM(s.price), 0) as total_spent, MAX(b.date) as last_active
      FROM clients c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON u.id = b.user_id AND b.status != 'cancelled'
      LEFT JOIN services s ON b.service_id = s.id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT ?
    `, [limit]);

    const formatted = data.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      bookings: d.bookings,
      totalSpent: parseFloat(d.total_spent),
      lastActive: d.last_active
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
