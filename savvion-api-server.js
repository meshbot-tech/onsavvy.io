// Savvion Admin API Server - Compatible with savvion-admin.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// In-memory data store
const DB = {
  leads: [],
  clients: [],
  bookings: [],
  templates: [],
  notifications: [],
  users: []
};

// Auth token store (token -> { userId, expiresAt })
const authTokens = new Map();
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Load sample data
function loadSampleData() {
  try {
    const dataPath = path.join(__dirname, 'data', 'sample-data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const sampleData = JSON.parse(rawData);
      DB.leads = sampleData.leads || [];
      DB.clients = sampleData.clients || [];
      DB.bookings = sampleData.bookings || [];
      DB.templates = sampleData.templates || [];
      DB.notifications = sampleData.notifications || [];
      DB.users = sampleData.users || [];
      console.log('Sample data loaded successfully');
    }
  } catch (err) {
    console.error('Error loading sample data:', err.message);
  }
}

loadSampleData();

// Utility
const generateId = () => Math.random().toString(36).substr(2, 9);
const getCurrentDate = () => new Date().toISOString().split('T')[0];
const getCurrentDateTime = () => new Date().toISOString();

const jsonResponse = (res, data) => res.json({ success: true, ...data });
const errorResponse = (res, message, status = 400) => res.status(status).json({ success: false, error: message });

// ──── AUTH ─────────────────────────────────────────────────────────────────────────────
// Simple in-memory session store (use Redis in production)
// authTokens map: token -> { userId, expiresAt }
// TOKEN_TTL set to 24h

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Simple auth - check against users table
  const user = DB.users.find(u => u.email === email);
  if (!user) return errorResponse(res, 'Invalid credentials', 401);
  // In production, verify hashed password with bcrypt
  const token = 'tok_' + generateId();
  authTokens.set(token, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL });
  jsonResponse(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/auth/google', async (req, res) => {
  const { token: googleIdToken } = req.body;
  if (!googleIdToken) return errorResponse(res, 'Google ID token required', 400);

  try {
    // Verify Google ID token
    const axios = require('axios');
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${googleIdToken}`
    );

    const googleInfo = response.data;

    // Validate token
    if (googleInfo.error_description) {
      throw new Error(googleInfo.error_description);
    }

    const googleEmail = googleInfo.email;
    const googleName = googleInfo.name || googleInfo.email.split('@')[0];
    const googlePicture = googleInfo.picture;

    // Check if user exists, create if not
    let user = DB.users.find(u => u.email === googleEmail);
    if (!user) {
      user = {
        id: generateId(),
        name: googleName,
        email: googleEmail,
        role: 'admin',
        permissions: ['leads:read', 'leads:write', 'clients:read', 'bookings:read', 'finance:read', 'notifications:read'],
        lastLogin: getCurrentDateTime()
      };
      DB.users.push(user);
      console.log('✅ New Google user created:', googleEmail);
    } else {
      // Update last login
      user.lastLogin = getCurrentDateTime();
    }

    // Create session token
    const sessionToken = 'tok_' + generateId();
    authTokens.set(sessionToken, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL });

    jsonResponse(res, {
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: googlePicture
      }
    });

  } catch (err) {
    console.error('Google auth error:', err.message);
    return errorResponse(res, 'Failed to verify Google token: ' + err.message, 401);
  }
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return errorResponse(res, 'No token', 401);
  const token = auth.replace('Bearer ', '');
  const session = authTokens.get(token);
  if (!session) return errorResponse(res, 'Invalid token', 401);
  // Check expiry
  if (session.expiresAt < Date.now()) {
    authTokens.delete(token);
    return errorResponse(res, 'Token expired', 401);
  }
  const user = DB.users.find(u => u.id === session.userId);
  if (!user) return errorResponse(res, 'User not found', 401);
  jsonResponse(res, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace('Bearer ', '');
    authTokens.delete(token);
  }
  jsonResponse(res, { success: true });
});

// Helper to check auth middleware
const checkAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return errorResponse(res, 'Unauthorized', 401);
  const token = auth.replace('Bearer ', '');
  const session = authTokens.get(token);
  if (!session) return errorResponse(res, 'Invalid token', 401);
  if (session.expiresAt < Date.now()) {
    authTokens.delete(token);
    return errorResponse(res, 'Token expired', 401);
  }
  req.userId = session.userId;
  next();
};

// ──── LEADS ────────────────────────────────────────────────────────────────────────────
app.get('/api/leads', (req, res) => {
  const { stage, search, sortBy = 'createdAt', order = 'desc' } = req.query;
  let results = [...DB.leads].map(lead => ({
    ...lead,
    clientName: lead.name, // admin panel expects clientName
    created: lead.createdAt,
    srcClass: `badge-${lead.source === 'website' ? 'website' : lead.source === 'referral' ? 'referral' : 'other'}`
  }));

  if (stage) results = results.filter(l => l.stage === stage);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q)
    );
  }

  results.sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (order === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  jsonResponse(res, { data: results, total: results.length });
});

app.get('/api/leads/:id', (req, res) => {
  const lead = DB.leads.find(l => l.id === req.params.id);
  if (!lead) return errorResponse(res, 'Lead not found', 404);
  jsonResponse(res, { data: { ...lead, clientName: lead.name, created: lead.createdAt } });
});

app.post('/api/leads', checkAuth, (req, res) => {
  const { name, email, phone, company, source, service, value, notes } = req.body;
  if (!name || !email) return errorResponse(res, 'Name and email required');

  const newLead = {
    id: generateId(),
    name, email, phone: phone || '', company: company || '',
    source: source || 'website', service: service || '',
    value: value || 0, notes: notes || '',
    stage: 'new', tags: [], createdAt: getCurrentDate(), updatedAt: getCurrentDate()
  };

  DB.leads.unshift(newLead);
  jsonResponse(res, { data: { ...newLead, clientName: name, created: newLead.createdAt } });
});

app.put('/api/leads/:id', checkAuth, (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);
  DB.leads[idx] = { ...DB.leads[idx], ...req.body, updatedAt: getCurrentDate() };
  jsonResponse(res, { data: { ...DB.leads[idx], clientName: DB.leads[idx].name, created: DB.leads[idx].createdAt } });
});

app.patch('/api/leads/:id', checkAuth, (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);
  DB.leads[idx] = { ...DB.leads[idx], ...req.body, updatedAt: getCurrentDate() };
  jsonResponse(res, { data: { ...DB.leads[idx], clientName: DB.leads[idx].name, created: DB.leads[idx].createdAt } });
});

app.delete('/api/leads/:id', checkAuth, (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);
  DB.leads.splice(idx, 1);
  jsonResponse(res, { success: true });
});

// ──── BOOKINGS ─────────────────────────────────────────────────────────────────────────
app.get('/api/bookings', (req, res) => {
  let results = DB.bookings.map(b => {
    // Derive client info from clients DB
    const client = DB.clients.find(c => c.id === b.clientId);
    return {
      ...b,
      clientName: client?.name || 'Unknown Client',
      clientColor: (client?.color || '#3b82f6'),
      clientAvatar: (client?.avatar || client?.name?.charAt(0) || '?'),
      amount: b.price, // admin panel expects 'amount'
      date: b.date.split('T')[0] || b.date,
      time: '10:00 AM' // placeholder; would come from booking time
    };
  });

  const { status, clientId } = req.query;
  if (status) results = results.filter(b => b.status === status);
  if (clientId) results = results.filter(b => b.clientId === clientId);

  jsonResponse(res, { data: results, total: results.length });
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = DB.bookings.find(b => b.id === req.params.id);
  if (!booking) return errorResponse(res, 'Booking not found', 404);
  const client = DB.clients.find(c => c.id === booking.clientId);
  jsonResponse(res, {
    data: {
      ...booking,
      clientName: client?.name || 'Unknown',
      clientColor: (client?.color || '#3b82f6'),
      clientAvatar: (client?.avatar || client?.name?.charAt(0) || '?'),
      amount: booking.price,
      date: booking.date.split('T')[0] || booking.date,
      time: '10:00 AM'
    }
  });
});

app.post('/api/bookings', checkAuth, (req, res) => {
  const { clientId, service, date, price, status, notes } = req.body;
  if (!clientId || !service || !price) return errorResponse(res, 'Missing required fields');

  const newBooking = {
    id: generateId(),
    clientId, service, date: date || getCurrentDate(), price,
    status: status || 'pending', notes: notes || '',
    createdAt: getCurrentDate()
  };

  DB.bookings.unshift(newBooking);
  const client = DB.clients.find(c => c.id === clientId);
  jsonResponse(res, {
    data: {
      ...newBooking,
      clientName: client?.name || 'Unknown',
      clientColor: (client?.color || '#3b82f6'),
      clientAvatar: (client?.avatar || client?.name?.charAt(0) || '?'),
      amount: price,
      time: '10:00 AM'
    }
  });
});

app.patch('/api/bookings/:id', checkAuth, (req, res) => {
  const idx = DB.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Booking not found', 404);
  DB.bookings[idx] = { ...DB.bookings[idx], ...req.body };
  const client = DB.clients.find(c => c.id === DB.bookings[idx].clientId);
  jsonResponse(res, {
    data: {
      ...DB.bookings[idx],
      clientName: client?.name || 'Unknown',
      clientColor: (client?.color || '#3b82f6'),
      clientAvatar: (client?.avatar || client?.name?.charAt(0) || '?'),
      amount: DB.bookings[idx].price,
      date: DB.bookings[idx].date.split('T')[0],
      time: '10:00 AM'
    }
  });
});

// ──── CLIENTS ──────────────────────────────────────────────────────────────────────────
app.get('/api/clients', (req, res) => {
  let results = DB.clients.map(c => ({
    ...c,
    type: 'Client', // static type; could be dynamic
    color: c.color || '#3b82f6',
    avatar: c.avatar || c.name?.charAt(0) || '?',
    totalSpent: c.totalSpent || 0,
    bookings: c.bookings || 0,
    lastActive: c.lastActivity || c.joinDate
  }));

  if (req.query.active !== undefined) {
    results = results.filter(c => c.active === (req.query.active === 'true'));
  }

  jsonResponse(res, { data: results, total: results.length });
});

app.get('/api/clients/:id', (req, res) => {
  const client = DB.clients.find(c => c.id === req.params.id);
  if (!client) return errorResponse(res, 'Client not found', 404);
  jsonResponse(res, {
    data: {
      ...client,
      type: 'Client',
      color: client.color || '#3b82f6',
      avatar: client.avatar || client.name?.charAt(0) || '?'
    }
  });
});

app.post('/api/clients', checkAuth, (req, res) => {
  const { name, email, phone, company, totalSpent, status } = req.body;
  const newClient = {
    id: generateId(),
    name, email, phone: phone || '', company: company || '',
    totalSpent: totalSpent || 0, status: status || 'active',
    joinDate: getCurrentDate(), bookings: 0, lastActivity: getCurrentDate(),
    color: '#3b82f6', avatar: name?.charAt(0) || '?'
  };
  DB.clients.unshift(newClient);
  jsonResponse(res, { data: { ...newClient, type: 'Client' } });
});

app.put('/api/clients/:id', checkAuth, (req, res) => {
  const idx = DB.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Client not found', 404);
  DB.clients[idx] = { ...DB.clients[idx], ...req.body };
  jsonResponse(res, { data: { ...DB.clients[idx], type: 'Client' } });
});

// ──── ANALYTICS ────────────────────────────────────────────────────────────────────────
app.get('/api/analytics', (req, res) => {
  const totalRevenue = DB.bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const totalBookings = DB.bookings.length;
  const topClients = DB.clients
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5)
    .map(c => ({
      id: c.id, name: c.name,
      spent: c.totalSpent || 0,
      color: c.color || '#3b82f6'
    }));

  jsonResponse(res, {
    data: {
      totalRevenue,
      totalBookings,
      topClients,
      // Admin panel also uses these derived fields
      totalLeads: DB.leads.length,
      conversionRate: Math.round((DB.leads.filter(l => l.stage === 'won').length / Math.max(DB.leads.length, 1)) * 100) || 0
    }
  });
});

// ──── AUTOMATION TEMPLATES ─────────────────────────────────────────────────────────────
app.get('/api/automation/templates', (req, res) => {
  jsonResponse(res, { data: DB.templates });
});

app.post('/api/automation/templates', checkAuth, (req, res) => {
  const { name, channel, type, subject, body, variables } = req.body;
  const newTemplate = {
    id: generateId(),
    name, channel, type, subject: subject || '', body, variables: variables || [],
    createdAt: getCurrentDate(), isActive: true
  };
  DB.templates.push(newTemplate);
  jsonResponse(res, { data: newTemplate });
});

app.put('/api/automation/templates/:id', checkAuth, (req, res) => {
  const idx = DB.templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Template not found', 404);
  DB.templates[idx] = { ...DB.templates[idx], ...req.body };
  jsonResponse(res, { data: DB.templates[idx] });
});

// ──── AUTOMATION SEND ──────────────────────────────────────────────────────────────────
app.post('/api/automation/send', checkAuth, (req, res) => {
  const { channel, recipient, templateId, variables } = req.body;
  // In production, integrate with WhatsApp/Email APIs
  console.log(`[AUTOMATION] Sending ${channel} to ${recipient} using template ${templateId}`);
  jsonResponse(res, {
    success: true,
    message: 'Message queued for delivery',
    sendId: generateId(),
    timestamp: getCurrentDateTime()
  });
});

// ──── NOTIFICATIONS ────────────────────────────────────────────────────────────────────
app.get('/api/notifications', (req, res) => {
  const { unreadOnly = 'false' } = req.query;
  let results = [...DB.notifications];

  if (unreadOnly === 'true') {
    results = results.filter(n => !n.read);
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Enrich with proper icon/color/text/time based on type
  const enriched = results.map(n => {
    // Format relative time
    const now = new Date();
    const created = new Date(n.createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    let time;
    if (diffMins < 1) time = 'Just now';
    else if (diffMins < 60) time = `${diffMins}m ago`;
    else if (diffHours < 24) time = `${diffHours}h ago`;
    else time = `${diffDays}d ago`;

    return {
      ...n,
      text: n.message, // use message as display text
      time: time,
      icon: n.type === 'booking' ? 'ti-calendar-event' :
            n.type === 'lead' ? 'ti-user-plus' :
            n.type === 'followup' ? 'ti-brand-whatsapp' : 'ti-info-circle',
      color: n.type === 'booking' ? 'var(--amber)' :
             n.type === 'lead' ? 'var(--blue)' :
             n.type === 'followup' ? 'var(--wa-dark)' : 'var(--gray)'
    };
  });

  const unreadCount = enriched.filter(n => !n.read).length;

  jsonResponse(res, {
    data: enriched.slice(0, 50),
    unreadCount,
    total: enriched.length
  });
});

app.post('/api/notifications', checkAuth, (req, res) => {
  const { type, title, message, leadId, bookingId } = req.body;
  const newNotif = {
    id: generateId(),
    type, title, message, leadId, bookingId,
    read: false, createdAt: getCurrentDateTime()
  };
  DB.notifications.unshift(newNotif);
  jsonResponse(res, { data: newNotif });
});

app.patch('/api/notifications/:id/read', checkAuth, (req, res) => {
  const idx = DB.notifications.findIndex(n => n.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Notification not found', 404);
  DB.notifications[idx].read = true;
  jsonResponse(res, { success: true });
});

app.patch('/api/notifications/read-all', checkAuth, (req, res) => {
  DB.notifications.forEach(n => n.read = true);
  jsonResponse(res, { success: true });
});

// ──── INTEGRATIONS ─────────────────────────────────────────────────────────────────────
app.get('/api/integrations/status', (req, res) => {
  jsonResponse(res, {
    data: {
      whatsapp: { connected: false, provider: 'none', lastSync: null },
      email: { connected: false, provider: 'none', lastSync: null },
      calendar: { connected: false, provider: 'none', lastSync: null },
      website: { connected: true, source: 'index.html', lastSync: getCurrentDate() }
    }
  });
});

app.post('/api/integrations/sync', checkAuth, (req, res) => {
  const { type } = req.body;
  jsonResponse(res, {
    success: true,
    message: `${type} sync initiated`,
    syncId: generateId(),
    timestamp: getCurrentDateTime()
  });
});

// ──── HEALTH & SEED ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.post('/api/seed', (req, res) => {
  loadSampleData();
  jsonResponse(res, { success: true, message: 'Sample data re-seeded' });
});

// Admin stats endpoint
app.get('/api/admin/stats', checkAuth, (req, res) => {
  jsonResponse(res, {
    data: {
      leads: DB.leads.length,
      clients: DB.clients.length,
      bookings: DB.bookings.length,
      pendingFollowUps: 0,
      unreadNotifications: DB.notifications.filter(n => !n.read).length,
      pipelineValue: DB.leads.reduce((sum, l) => sum + (l.value || 0), 0),
      totalRevenue: DB.bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.price || 0), 0)
    }
  });
});

// ──── SERVE FRONTEND ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.json({ message: 'Savvion API Server Running', endpoints: '/api' });
});

app.get('/savvion-admin-login.html', (req, res) => {
  const filePath = path.join(__dirname, 'savvion-admin-login.html');
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Admin login not found');
});

app.get('/savvion-admin.html', (req, res) => {
  const filePath = path.join(__dirname, 'savvion-admin.html');
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).send('Admin panel not found');
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return errorResponse(res, 'Endpoint not found', 404);
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Not found');
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Savvion API Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/savvion-admin.html`);
  console.log(`🌐 Landing page: http://localhost:${PORT}/index.html`);
  console.log(`🔧 API base: http://localhost:${PORT}/api/`);
  console.log(`\nKey endpoints:`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  GET    /api/auth/me`);
  console.log(`  GET    /api/leads`);
  console.log(`  POST   /api/leads`);
  console.log(`  PATCH  /api/leads/:id`);
  console.log(`  DELETE /api/leads/:id`);
  console.log(`  GET    /api/bookings`);
  console.log(`  PATCH  /api/bookings/:id`);
  console.log(`  GET    /api/clients`);
  console.log(`  GET    /api/analytics`);
  console.log(`  GET    /api/automation/templates`);
  console.log(`  POST   /api/automation/send`);
  console.log(`  GET    /api/notifications`);
  console.log(`  PATCH  /api/notifications/:id/read`);
  console.log(`\n✅ Ready. Admin panel will work with these endpoints.\n`);
});
