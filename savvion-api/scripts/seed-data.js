/**
 * Seed Database with Demo Data
 * Creates sample data for development/testing
 */

const { initDatabase, query, run } = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');

async function seed() {
  console.log('🌱 Seeding database with demo data...');

  initDatabase();

  // Check if already seeded
  const userCount = query('SELECT COUNT(*) as count FROM users')[0].count;
  if (userCount > 1) {
    console.log('✅ Database already contains data. Skipping seed.');
    console.log('   To reset, run: npm run db:reset');
    return;
  }

  // ============================================
  // SEED SERVICES
  // ============================================
  const services = [
    { name: 'Web Development', duration_minutes: 60, price: 150000, color: '#16A066', staff_assigned: 'Amara Okafor', description: 'Custom website development' },
    { name: 'Mobile App Development', duration_minutes: 90, price: 250000, color: '#2260B0', staff_assigned: 'Brian Otieno', description: 'iOS/Android app development' },
    { name: 'UI/UX Design', duration_minutes: 60, price: 120000, color: '#7040C0', staff_assigned: 'Grace Wanjiku', description: 'User interface design' },
    { name: 'SEO Optimization', duration_minutes: 90, price: 180000, color: '#B8720A', staff_assigned: 'Amara Okafor', description: 'Search engine optimization' },
    { name: 'Digital Marketing', duration_minutes: 60, price: 130000, color: '#B83030', staff_assigned: 'Brian Otieno', description: 'Online marketing campaigns' },
    { name: 'Brand Strategy', duration_minutes: 120, price: 200000, color: '#1AB8A8', staff_assigned: 'Grace Wanjiku', description: 'Brand positioning' },
  ];

  services.forEach(s => {
    run(`
      INSERT OR IGNORE INTO services (name, duration_minutes, price, color, staff_assigned, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [s.name, s.duration_minutes, s.price, s.color, s.staff_assigned, s.description]);
  });
  console.log(`✅ Seeded ${services.length} services`);

  // ============================================
  // SEED CLIENTS (with user accounts)
  // ============================================
  const clients = [
    { name: 'Neema Kahiga', email: 'neema@savvion.com', phone: '+254 700 100 001', type: 'business', total_spent: 234500, tags: ['vip', 'referral'] },
    { name: 'Samuel Omondi', email: 'samuel@savvion.com', phone: '+254 700 100 002', type: 'individual', total_spent: 176800, tags: [] },
    { name: 'Tabitha Mwikali', email: 'tabitha@savvion.com', phone: '+254 700 100 003', type: 'business', total_spent: 450000, tags: ['vip'] },
    { name: 'James Mutua', email: 'james@savvion.com', phone: '+254 700 100 004', type: 'individual', total_spent: 98500, tags: [] },
    { name: 'Linet Cherotich', email: 'linet@savvion.com', phone: '+254 700 100 005', type: 'business', total_spent: 321000, tags: ['new'] },
  ];

  for (const client of clients) {
    // Create user account (password: client123!)
    const passwordHash = await bcrypt.hash('client123!', 10);
    const userResult = run(`
      INSERT INTO users (email, password_hash, name, role, phone, avatar_color)
      VALUES (?, ?, ?, 'client', ?, ?)
    `, [client.email, passwordHash, client.name, client.phone, `hsl(${Math.random() * 360}, 70%, 45%)`]);

    const userId = userResult.lastInsertRowid;

    // Create client profile
    run(`
      INSERT INTO clients (user_id, name, email, phone, type, total_spent, last_active, tags)
      VALUES (?, ?, ?, ?, ?, ?, DATE('now'), ?)
    `, [userId, client.name, client.email, client.phone, client.type, client.total_spent, JSON.stringify(client.tags)]);
  }
  console.log(`✅ Seeded ${clients.length} clients with user accounts`);

  // ============================================
  // SEED LEADS
  // ============================================
  const leads = [
    { name: 'Martin Okello', email: 'martin@example.com', source: 'website', value: 120000, stage: 'new' },
    { name: 'Grace Wanjiku', email: 'grace@example.com', source: 'referral', value: 250000, stage: 'contacted' },
    { name: 'Brian Otieno', email: 'brian@example.com', source: 'social', value: 180000, stage: 'qualified' },
    { name: 'Amara Okafor', email: 'amara@example.com', source: 'direct', value: 320000, stage: 'proposal' },
    { name: 'Kenya Corp Ltd', email: 'info@kenyacorp.co.ke', source: 'form', value: 550000, stage: 'won' },
    { name: 'John Doe', email: 'john@example.com', source: 'website', value: 90000, stage: 'lost' },
  ];

  for (const lead of leads) {
    // Random service
    const serviceId = Math.floor(Math.random() * services.length) + 1;
    run(`
      INSERT INTO leads (client_name, client_email, source, value, stage, service_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, DATE('now', '-' || ? || ' days'))
    `, [lead.name, lead.email, lead.source, lead.value, lead.stage, serviceId, Math.floor(Math.random() * 30)]);
  }
  console.log(`✅ Seeded ${leads.length} leads`);

  // ============================================
  // SEED BOOKINGS
  // ============================================
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
  let bookingCount = 0;

  // Get all client user IDs
  const users = query('SELECT id, name FROM users WHERE role = \'client\'');
  const bookingNames = ['Consultation', 'Strategy Session', 'Property Viewing', 'UX Audit Kickoff', 'Brand Strategy', 'Follow-up Call'];

  for (let i = 0; i < 7; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const serviceIndex = i % services.length;
    const service = services[serviceIndex];
    const daysOffset = i + 1;
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const dateStr = date.toISOString().split('T')[0];
    const time = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'][Math.floor(Math.random() * 6)];
    const status = statuses[i % statuses.length];

    run(`
      INSERT INTO bookings (user_id, service_id, date, time, status, reference_code, staff, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      serviceIndex + 1,
      dateStr,
      time,
      status,
      `SVB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      service.staff_assigned,
      'To be confirmed'
    ]);
    bookingCount++;
  }
  console.log(`✅ Seeded ${bookingCount} bookings`);

  // ============================================
  // SEED NOTIFICATIONS
  // ============================================
  const notificationTemplates = [
    { text: 'New booking confirmed for Consultation', type: 'booking', icon: 'ti-calendar-check', color: 'var(--green)' },
    { text: 'Payment received for booking #1234', type: 'payment', icon: 'ti-currency-shilling', color: 'var(--amber)' },
    { text: 'New lead: Martin Okello', type: 'lead', icon: 'ti-user-plus', color: 'var(--blue)' },
  ];

  for (let i = 0; i < 5; i++) {
    const tmpl = notificationTemplates[i % notificationTemplates.length];
    const userId = users[Math.floor(Math.random() * users.length)].id;
    run(`
      INSERT INTO notifications (user_id, icon, icon_color, text, type, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, tmpl.icon, tmpl.color, tmpl.text, tmpl.type, i > 2]); // Some read, some unread
  }
  console.log('✅ Seeded notifications');

  // ============================================
  // SEED ACTIVITY LOGS
  // ============================================
  const activities = [
    { icon: 'ti-check', color: 'var(--green)', text: 'Booking <strong>confirmed</strong> for Tabitha M.' },
    { icon: 'ti-brand-whatsapp', color: 'var(--wa-dark)', text: 'WhatsApp sent to <strong>Samuel O.</strong>' },
    { icon: 'ti-user-plus', color: 'var(--blue)', text: 'New lead <strong>Martin Okello</strong> added' },
    { icon: 'ti-chart-line', color: 'var(--purple)', text: 'Monthly report generated' },
    { icon: 'ti-calendar-event', color: 'var(--amber)', text: 'Reminder: Booking with <strong>Linet C.</strong> in 1h' },
  ];

  activities.forEach(act => {
    run(`
      INSERT INTO activity_logs (icon, icon_color, text)
      VALUES (?, ?, ?)
    `, [act.icon, act.color, act.text]);
  });
  console.log('✅ Seeded activity logs');

  // ============================================
  // SEED AUTOMATION TEMPLATES
  // ============================================
  const automationTemplates = [
    {
      name: 'Booking Confirmation',
      channel: 'whatsapp',
      trigger_event: 'booking_created',
      body: 'Hi {{name}}, your booking for {{service}} on {{date}} at {{time}} is confirmed. See you then! 📅',
      active: true
    },
    {
      name: 'Payment Reminder',
      channel: 'whatsapp',
      trigger_event: '1_day_before',
      body: 'Hi {{name}}, just a reminder that payment for your {{service}} booking is due tomorrow. Please complete payment to confirm.',
      active: true
    },
    {
      name: 'Welcome Series',
      channel: 'email',
      trigger_event: 'new_client',
      subject: 'Welcome to Savvion!',
      body: 'Hi {{name}},\n\nWelcome to Savvion! We\'re excited to have you.\n\nHere\'s what you can expect:\n- Professional services\n- Reliable scheduling\n- Excellent support',
      active: true
    }
  ];

  automationTemplates.forEach(tpl => {
    run(`
      INSERT INTO automation_templates (name, channel, trigger_event, subject, body, active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [tpl.name, tpl.channel, tpl.trigger_event, tpl.subject || null, tpl.body, tpl.active]);
  });
  console.log(`✅ Seeded ${automationTemplates.length} automation templates`);

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('\n📋 Default Accounts:');
  console.log('   Admin:      admin@savvion.com / admin123!');
  console.log('   Client 1:   neema@savvion.com / client123!');
  console.log('   Client 2:   samuel@savvion.com / client123!');
  console.log('\n🔐 Make sure to change default passwords in production!');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
