// Savvion Admin API Server
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

// In-memory data store (replace with real database)
const DB = {
  leads: [],
  clients: [],
  bookings: [],
  budgets: [],
  followUps: [],
  notifications: [],
  users: []
};

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
      DB.budgets = sampleData.budgets || [];
      DB.followUps = sampleData.followUps || [];
      DB.notifications = sampleData.notifications || [];
      DB.users = sampleData.users || [];
      console.log('Sample data loaded successfully');
    }
  } catch (err) {
    console.error('Error loading sample data:', err.message);
  }
}

loadSampleData();

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Helper to send JSON response
const jsonResponse = (res, data) => {
  res.json({ success: true, ...data });
};

const errorResponse = (res, message, status = 400) => {
  res.status(status).json({ success: false, error: message });
};

// ==================== LEADS ====================

// GET all leads with filters
app.get('/api/leads', (req, res) => {
  const { stage, search, tag, sortBy = 'createdAt', order = 'desc' } = req.query;
  let results = [...DB.leads];

  if (stage) results = results.filter(l => l.stage === stage);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q)
    );
  }
  if (tag) results = results.filter(l => l.tags && l.tags.includes(tag));

  results.sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (order === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  jsonResponse(res, { leads: results, total: results.length });
});

// GET single lead
app.get('/api/leads/:id', (req, res) => {
  const lead = DB.leads.find(l => l.id === req.params.id);
  if (!lead) return errorResponse(res, 'Lead not found', 404);
  jsonResponse(res, { lead });
});

// POST create lead
app.post('/api/leads', (req, res) => {
  const { name, email, phone, company, source, serviceInterest, value, notes } = req.body;
  if (!name || !email) return errorResponse(res, 'Name and email required');

  const newLead = {
    id: generateId(),
    name, email, phone: phone || '', company: company || '',
    source: source || 'website', serviceInterest: serviceInterest || '',
    value: value || 0, notes: notes || '',
    stage: 'new', tags: [], createdAt: getCurrentDate(), updatedAt: getCurrentDate()
  };

  DB.leads.unshift(newLead);
  jsonResponse(res, { lead: newLead });
});

// PUT update lead
app.put('/api/leads/:id', (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);

  DB.leads[idx] = { ...DB.leads[idx], ...req.body, updatedAt: getCurrentDate() };
  jsonResponse(res, { lead: DB.leads[idx] });
});

// PATCH move lead stage
app.patch('/api/leads/:id/stage', (req, res) => {
  const { stage } = req.body;
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);

  DB.leads[idx].stage = stage;
  DB.leads[idx].updatedAt = getCurrentDate();
  jsonResponse(res, { lead: DB.leads[idx] });
});

// DELETE lead
app.delete('/api/leads/:id', (req, res) => {
  const idx = DB.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Lead not found', 404);
  DB.leads.splice(idx, 1);
  jsonResponse(res, { success: true, message: 'Lead deleted' });
});

// ==================== CLIENTS ====================

app.get('/api/clients', (req, res) => {
  let results = [...DB.clients];
  if (req.query.active !== undefined) {
    results = results.filter(c => c.active === (req.query.active === 'true'));
  }
  jsonResponse(res, { clients: results, total: results.length });
});

app.get('/api/clients/:id', (req, res) => {
  const client = DB.clients.find(c => c.id === req.params.id);
  if (!client) return errorResponse(res, 'Client not found', 404);
  jsonResponse(res, { client });
});

app.post('/api/clients', (req, res) => {
  const { name, email, phone, company, totalSpent, status } = req.body;
  const newClient = {
    id: generateId(),
    name, email, phone: phone || '', company: company || '',
    totalSpent: totalSpent || 0, status: status || 'active',
    joinDate: getCurrentDate(), projects: 0, lastActivity: getCurrentDate()
  };
  DB.clients.unshift(newClient);
  jsonResponse(res, { client: newClient });
});

app.put('/api/clients/:id', (req, res) => {
  const idx = DB.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Client not found', 404);
  DB.clients[idx] = { ...DB.clients[idx], ...req.body };
  jsonResponse(res, { client: DB.clients[idx] });
});

// ==================== BOOKINGS ====================

app.get('/api/bookings', (req, res) => {
  let results = [...DB.bookings];
  const { status, clientId, serviceType } = req.query;
  if (status) results = results.filter(b => b.status === status);
  if (clientId) results = results.filter(b => b.clientId === clientId);
  if (serviceType) results = results.filter(b => b.serviceType === serviceType);

  // Enrich with client info
  results = results.map(booking => {
    const client = DB.clients.find(c => c.id === booking.clientId);
    return { ...booking, client };
  });

  jsonResponse(res, { bookings: results, total: results.length });
});

app.post('/api/bookings', (req, res) => {
  const { clientId, serviceType, serviceName, price, status, notes, date } = req.body;
  if (!clientId || !serviceType || !price) {
    return errorResponse(res, 'Missing required fields');
  }

  const newBooking = {
    id: generateId(),
    clientId, serviceType, serviceName: serviceName || serviceType,
    price, status: status || 'pending', notes: notes || '', date: date || getCurrentDate(),
    createdAt: getCurrentDate()
  };

  DB.bookings.unshift(newBooking);

  // Update client total spent if booking is confirmed
  if (status === 'confirmed') {
    const clientIdx = DB.clients.findIndex(c => c.id === clientId);
    if (clientIdx !== -1) {
      DB.clients[clientIdx].totalSpent += price;
      DB.clients[clientIdx].projects += 1;
    }
  }

  jsonResponse(res, { booking: newBooking });
});

app.patch('/api/bookings/:id', (req, res) => {
  const idx = DB.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Booking not found', 404);

  DB.bookings[idx] = { ...DB.bookings[idx], ...req.body };

  // Adjust client total if status changed to confirmed
  if (req.body.status === 'confirmed') {
    const clientIdx = DB.clients.findIndex(c => c.id === DB.bookings[idx].clientId);
    if (clientIdx !== -1) {
      DB.clients[clientIdx].totalSpent += DB.bookings[idx].price || 0;
      DB.clients[clientIdx].projects += 1;
    }
  }

  jsonResponse(res, { booking: DB.bookings[idx] });
});

// ==================== BUDGET / FINANCE ====================

app.get('/api/finance/pipeline', (req, res) => {
  const pipelineValue = DB.leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const totalRevenue = DB.bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const avgDealSize = DB.leads.length ? pipelineValue / DB.leads.length : 0;
  const conversionRate = DB.leads.length ?
    (DB.leads.filter(l => l.stage === 'won').length / DB.leads.length * 100).toFixed(1) : 0;

  jsonResponse(res, {
    pipelineValue, totalRevenue, avgDealSize, conversionRate,
    activeLeads: DB.leads.filter(l => !['won', 'lost'].includes(l.stage)).length,
    thisMonthRevenue: DB.bookings
      .filter(b => b.status === 'confirmed' && b.date?.startsWith(getCurrentDate().substring(0, 7)))
      .reduce((sum, b) => sum + (b.price || 0), 0)
  });
});

app.get('/api/finance/revenue-trend', (req, res) => {
  // Generate last 6 months mock trend
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = d.toISOString().substring(0, 7);
    const monthRevenue = DB.bookings
      .filter(b => b.status === 'confirmed' && b.date?.startsWith(monthKey))
      .reduce((sum, b) => sum + (b.price || 0), 0);
    months.push({ month: monthKey, revenue: monthRevenue });
  }
  jsonResponse(res, { trend: months });
});

app.get('/api/finance/funnel', (req, res) => {
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const funnel = stages.map(stage => ({
    stage,
    count: DB.leads.filter(l => l.stage === stage).length,
    value: DB.leads.filter(l => l.stage === stage).reduce((sum, l) => sum + (l.value || 0), 0)
  }));
  jsonResponse(res, { funnel });
});

// ==================== FOLLOW-UPS ====================

app.get('/api/follow-ups', (req, res) => {
  const { leadId, status = 'pending' } = req.query;
  let results = DB.followUps || [];

  if (leadId) results = results.filter(f => f.leadId === leadId);
  if (status) results = results.filter(f => f.status === status);

  // Enrich with lead info
  results = results.map(fu => {
    const lead = DB.leads.find(l => l.id === fu.leadId);
    return { ...fu, lead };
  });

  results.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  jsonResponse(res, { followUps: results, total: results.length });
});

app.post('/api/follow-ups', (req, res) => {
  const { leadId, type, channel, message, scheduledFor, rules } = req.body;
  if (!leadId || !type || !channel || !scheduledFor) {
    return errorResponse(res, 'Missing required fields');
  }

  const newFollowUp = {
    id: generateId(),
    leadId, type, channel, message, scheduledFor,
    rules: rules || { autoSend: false, repeatInterval: 'once', conditions: [] },
    status: 'pending', createdAt: getCurrentDate()
  };

  DB.followUps.push(newFollowUp);
  jsonResponse(res, { followUp: newFollowUp });
});

app.patch('/api/follow-ups/:id', (req, res) => {
  const idx = DB.followUps.findIndex(f => f.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Follow-up not found', 404);
  DB.followUps[idx] = { ...DB.followUps[idx], ...req.body };
  jsonResponse(res, { followUp: DB.followUps[idx] });
});

app.delete('/api/follow-ups/:id', (req, res) => {
  const idx = DB.followUps.findIndex(f => f.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Follow-up not found', 404);
  DB.followUps.splice(idx, 1);
  jsonResponse(res, { success: true });
});

// Batch trigger follow-ups (manual run)
app.post('/api/follow-ups/trigger', (req, res) => {
  const now = new Date().toISOString();
  const triggered = [];

  DB.followUps.forEach(fu => {
    if (fu.status === 'pending' && fu.scheduledFor <= now && fu.rules?.autoSend) {
      fu.status = 'sent';
      fu.lastSent = now;
      triggered.push(fu);
    }
  });

  jsonResponse(res, { success: true, triggered: triggered.length, followUps: triggered });
});

// ==================== TEMPLATES ====================

app.get('/api/templates', (req, res) => {
  const { channel, type } = req.query;
  let templates = DB.templates || [];

  if (channel) templates = templates.filter(t => t.channel === channel);
  if (type) templates = templates.filter(t => t.type === type);

  jsonResponse(res, { templates });
});

app.post('/api/templates', (req, res) => {
  const { name, channel, type, subject, body, variables } = req.body;
  const newTemplate = {
    id: generateId(),
    name, channel, type, subject: subject || '', body, variables: variables || [],
    createdAt: getCurrentDate(), isActive: true
  };

  if (!DB.templates) DB.templates = [];
  DB.templates.push(newTemplate);
  jsonResponse(res, { template: newTemplate });
});

app.put('/api/templates/:id', (req, res) => {
  if (!DB.templates) return errorResponse(res, 'No templates found');
  const idx = DB.templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Template not found', 404);
  DB.templates[idx] = { ...DB.templates[idx], ...req.body };
  jsonResponse(res, { template: DB.templates[idx] });
});

// ==================== NOTIFICATIONS ====================

app.get('/api/notifications', (req, res) => {
  const { unreadOnly = false } = req.query;
  let results = DB.notifications || [];

  if (unreadOnly === 'true') {
    results = results.filter(n => !n.read);
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = results.filter(n => !n.read).length;

  jsonResponse(res, { notifications: results.slice(0, 50), unreadCount, total: results.length });
});

app.post('/api/notifications', (req, res) => {
  const { type, title, message, leadId, bookingId } = req.body;
  const newNotif = {
    id: generateId(),
    type, title, message, leadId, bookingId,
    read: false, createdAt: getCurrentDate()
  };

  if (!DB.notifications) DB.notifications = [];
  DB.notifications.unshift(newNotif);
  jsonResponse(res, { notification: newNotif });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  if (!DB.notifications) return errorResponse(res, 'No notifications', 404);
  const idx = DB.notifications.findIndex(n => n.id === req.params.id);
  if (idx === -1) return errorResponse(res, 'Notification not found', 404);
  DB.notifications[idx].read = true;
  jsonResponse(res, { success: true });
});

app.patch('/api/notifications/read-all', (req, res) => {
  if (!DB.notifications) return jsonResponse(res, { success: true });
  DB.notifications.forEach(n => n.read = true);
  jsonResponse(res, { success: true });
});

// ==================== INTEGRATIONS ====================

app.get('/api/integrations/status', (req, res) => {
  jsonResponse(res, {
    whatsapp: { connected: false, provider: 'none', lastSync: null },
    email: { connected: false, provider: 'none', lastSync: null },
    calendar: { connected: false, provider: 'none', lastSync: null },
    website: { connected: true, source: 'index.html', lastSync: getCurrentDate() }
  });
});

app.post('/api/integrations/sync', (req, res) => {
  const { type } = req.body;
  jsonResponse(res, {
    success: true,
    message: `${type} sync initiated`,
    syncId: generateId(),
    timestamp: getCurrentDate()
  });
});

// ==================== ANALYTICS ====================

app.get('/api/analytics/overview', (req, res) => {
  const totalLeads = DB.leads.length;
  const totalRevenue = DB.bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const totalClients = DB.clients.length;
  const avgClientValue = totalClients ? totalRevenue / totalClients : 0;
  const conversionRate = totalLeads ?
    (DB.leads.filter(l => l.stage === 'won').length / totalLeads * 100).toFixed(1) : 0;

  const stageStats = {};
  DB.leads.forEach(l => {
    stageStats[l.stage] = (stageStats[l.stage] || 0) + 1;
  });

  jsonResponse(res, {
    totalLeads, totalRevenue, totalClients, avgClientValue, conversionRate,
    stageDistribution: stageStats,
    thisWeekBookings: DB.bookings.filter(b => {
      const bookDate = new Date(b.createdAt);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return bookDate >= weekAgo;
    }).length
  });
});

// ==================== HEALTH ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ==================== SEED ROUTES ====================

app.post('/api/seed', (req, res) => {
  loadSampleData();
  jsonResponse(res, { success: true, message: 'Sample data re-seeded' });
});

// Admin statistics endpoint
app.get('/api/admin/stats', (req, res) => {
  jsonResponse(res, {
    leads: DB.leads.length,
    clients: DB.clients.length,
    bookings: DB.bookings.length,
    pendingFollowUps: (DB.followUps || []).filter(f => f.status === 'pending').length,
    unreadNotifications: (DB.notifications || []).filter(n => !n.read).length,
    pipelineValue: DB.leads.reduce((sum, l) => sum + (l.value || 0), 0),
    totalRevenue: DB.bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.price || 0), 0)
  });
});

// ==================== SERVE FRONTEND ====================

// Root - redirect to index.html or serve it
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Savvion API Server Running', endpoints: '/api' });
  }
});

// Catch-all for SPA routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return errorResponse(res, 'Endpoint not found', 404);
  }
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Savvion API Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/savvion-admin.html`);
  console.log(`🌐 Landing page: http://localhost:${PORT}/index.html`);
  console.log(`🔧 API base: http://localhost:${PORT}/api/`);
  console.log(`\nEndpoints:`);
  console.log(`  GET    /api/leads`);
  console.log(`  GET    /api/leads/:id`);
  console.log(`  POST   /api/leads`);
  console.log(`  PUT    /api/leads/:id`);
  console.log(`  PATCH  /api/leads/:id/stage`);
  console.log(`  DELETE /api/leads/:id`);
  console.log(`  GET    /api/clients`);
  console.log(`  POST   /api/clients`);
  console.log(`  GET    /api/bookings`);
  console.log(`  POST   /api/bookings`);
  console.log(`  PATCH  /api/bookings/:id`);
  console.log(`  GET    /api/finance/pipeline`);
  console.log(`  GET    /api/finance/revenue-trend`);
  console.log(`  GET    /api/finance/funnel`);
  console.log(`  GET    /api/follow-ups`);
  console.log(`  POST   /api/follow-ups`);
  console.log(`  PATCH  /api/follow-ups/:id`);
  console.log(`  DELETE /api/follow-ups/:id`);
  console.log(`  GET    /api/templates`);
  console.log(`  POST   /api/templates`);
  console.log(`  PUT    /api/templates/:id`);
  console.log(`  GET    /api/notifications`);
  console.log(`  PATCH  /api/notifications/:id/read`);
  console.log(`  PATCH  /api/notifications/read-all`);
  console.log(`  GET    /api/analytics/overview`);
  console.log(`  GET    /api/integrations/status`);
  console.log(`  POST   /api/integrations/sync`);
  console.log(`  GET    /api/health`);
  console.log(`\n✅ All endpoints ready. Admin panel will fetch live data from these APIs.\n`);
});
