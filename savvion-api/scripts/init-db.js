/**
 * Database Initialization & Seeding
 * Run this once to set up the database with initial data
 */

const { initDatabase, query, run } = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function init() {
  console.log('🔧 Initializing database...');

  // Initialize DB connection
  initDatabase();

  // Read and execute schema
  // Schema is located in savvion-api/database/schema.sql (sibling to scripts/)
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    // PostgreSQL - run each statement separately
    const statements = schemaSQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      try {
        await query(stmt);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.error('Schema error:', err.message);
        }
      }
    }
  } else {
    // SQLite - execute multiple statements
    const db = require('better-sqlite3')(process.env.DB_PATH || path.join(__dirname, 'data', 'savvion.db'));
    db.exec(schemaSQL);
    db.close();
  }

  console.log('✅ Schema created/verified');

  // Seed initial admin user
  await seedAdmin();
  await seedServices();
  await seedTemplates();

  console.log('🎉 Database initialized successfully!');
  process.exit(0);
}

async function seedAdmin() {
  const adminEmail = 'admin@savvion.com';
  const hashedPassword = await bcrypt.hash('admin123!', 10);

  const existing = query('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length === 0) {
    run(`
      INSERT INTO users (email, password_hash, name, role, phone, avatar_color)
      VALUES (?, ?, ?, 'admin', '+254 700 000 000', '#2da869')
    `, [adminEmail, hashedPassword, 'Emmanuel Meshack']);
    console.log('✅ Created default admin user:');
    console.log('   Email: admin@savvion.com');
    console.log('   Password: admin123!');
    console.log('   ⚠️  Change this password immediately after first login!');
  } else {
    console.log('✅ Admin user already exists');
  }
}

async function seedServices() {
  const services = [
    { name: 'Web Development', duration: 60, price: 150000, color: '#16A066', staff: 'Amara Okafor' },
    { name: 'Mobile App Development', duration: 90, price: 250000, color: '#2260B0', staff: 'Brian Otieno' },
    { name: 'UI/UX Design', duration: 60, price: 120000, color: '#7040C0', staff: 'Grace Wanjiku' },
    { name: 'SEO Optimization', duration: 90, price: 180000, color: '#B8720A', staff: 'Amara Okafor' },
    { name: 'Digital Marketing', duration: 60, price: 130000, color: '#B83030', staff: 'Brian Otieno' },
    { name: 'Brand Strategy', duration: 120, price: 200000, color: '#1AB8A8', staff: 'Grace Wanjiku' },
  ];

  const existing = query('SELECT COUNT(*) as count FROM services');
  if (existing[0].count === 0) {
    const stmt = run(`
      INSERT INTO services (name, duration_minutes, price, color, staff_assigned, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    services.forEach(s => {
      stmt.run([s.name, s.duration, s.price, s.color, s.staff, `Professional ${s.name} service`]);
    });
    console.log(`✅ Seeded ${services.length} services`);
  } else {
    console.log('✅ Services already exist');
  }
}

async function seedTemplates() {
  const whatsappTemplates = [
    {
      name: 'Booking Confirmation',
      channel: 'whatsapp',
      trigger: 'booking_created',
      body: 'Hi {{name}}, your booking for {{service}} on {{date}} at {{time}} is confirmed. See you then! 📅',
      active: true
    },
    {
      name: 'Payment Reminder',
      channel: 'whatsapp',
      trigger: '1_day_before',
      body: 'Hi {{name}}, just a reminder that payment for your {{service}} booking is due tomorrow. Please complete payment to confirm.',
      active: true
    },
    {
      name: 'Reschedule Offer',
      channel: 'whatsapp',
      trigger: 'cancellation',
      body: "We're sorry you need to cancel. Would you like to reschedule? We have availability on alternative dates.",
      active: true
    }
  ];

  const emailTemplates = [
    {
      name: 'Welcome Series',
      channel: 'email',
      trigger: 'new_client',
      subject: 'Welcome to Savvion!',
      body: 'Hi {{name}},\n\nWelcome to Savvion! We\'re excited to have you.\n\nHere\'s what you can expect:\n- Professional services\n- Reliable scheduling\n- Excellent support\n\nBest regards,\nThe Savvion Team',
      active: true
    },
    {
      name: 'Service Follow-up',
      channel: 'email',
      trigger: '3_days_after',
      subject: 'How was your {{service}} experience?',
      body: 'Hi {{name}},\n\nWe hope you enjoyed your {{service}} session.\n\nWe\'d love to hear your feedback! Your insights help us improve.\n\nThank you for choosing Savvion.',
      active: true
    }
  ];

  const allTemplates = [...whatsappTemplates, ...emailTemplates];
  const existing = query('SELECT COUNT(*) as count FROM automation_templates');
  if (existing[0].count === 0) {
    allTemplates.forEach(tpl => {
      run(`
        INSERT INTO automation_templates (name, channel, trigger_event, subject, body, active, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [tpl.name, tpl.channel, tpl.trigger, tpl.subject || null, tpl.body, tpl.active]);
    });
    console.log(`✅ Seeded ${allTemplates.length} automation templates`);
  } else {
    console.log('✅ Automation templates already exist');
  }
}

init().catch(err => {
  console.error('❌ Initialization failed:', err);
  process.exit(1);
});
