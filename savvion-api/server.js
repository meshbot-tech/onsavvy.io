/**
 * Savvion API Server
 * Complete REST API for admin panel and client portal
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS - Allow frontend domains
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  exposedHeaders: ['Content-Range', 'X-Total-Count']
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================
// DATABASE INITIALIZATION
// ============================================

initDatabase();

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Protected routes (require JWT)
const authMiddleware = require('./middleware/auth');
const protect = authMiddleware;
const adminOnly = authMiddleware.adminOnly;

// Leads - POST is public for website forms, other methods protected
const leadsRoutes = require('./routes/leads');
app.get('/api/leads', protect, leadsRoutes); // Get all leads - protected
app.get('/api/leads/:id', protect, leadsRoutes); // Get single lead - protected
app.post('/api/leads', leadsRoutes); // Create new lead - public
app.patch('/api/leads/:id', protect, adminOnly, leadsRoutes); // Update lead - admin only
app.delete('/api/leads/:id', protect, adminOnly, leadsRoutes); // Delete lead - admin only
app.get('/api/leads/stats/pipeline', protect, adminOnly, leadsRoutes); // Pipeline stats - admin only

// Bookings (clients can only see their own)
app.use('/api/bookings', protect, require('./routes/bookings'));

// Clients (admin only)
app.use('/api/clients', protect, adminOnly, require('./routes/clients'));

// Services (public read, admin write)
app.use('/api/services', require('./routes/services'));

// Analytics (admin only)
app.use('/api/analytics', protect, adminOnly, require('./routes/analytics'));

// Automation (admin only)
app.use('/api/automation', protect, adminOnly, require('./routes/automation'));

// Users / Staff Management (admin only)
app.use('/api/users', protect, adminOnly, require('./routes/users'));

// Notifications (protected - users see their own)
app.use('/api/notifications', protect, require('./routes/notifications'));

// User profile (protected)
app.use('/api/profile', protect, require('./routes/profile'));

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Savvion API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
