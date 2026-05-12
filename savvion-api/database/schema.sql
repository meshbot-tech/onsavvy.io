-- ============================================
-- SAVVION DATABASE SCHEMA
-- ============================================

-- Enable UUID extension for PostgreSQL
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (Clients, Admins, Staff)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite
  -- id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- PostgreSQL
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'client' CHECK(role IN ('admin', 'client', 'staff')),
  phone VARCHAR(50),
  avatar_color VARCHAR(20) DEFAULT '#3b82f6',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SERVICES (What you sell)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL,
  color VARCHAR(20) DEFAULT '#16A066',
  staff_assigned VARCHAR(255),
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEADS (Prospective clients - sales pipeline)
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  service_id INTEGER,
  source VARCHAR(50) CHECK(source IN ('website', 'referral', 'social', 'direct', 'form')),
  value DECIMAL(10,2) DEFAULT 0,
  stage VARCHAR(50) DEFAULT 'new' CHECK(stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  assigned_to INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- BOOKINGS (Confirmed appointments)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  reference_code VARCHAR(50) UNIQUE,
  location TEXT,
  staff VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- ============================================
-- CLIENTS (Extended profile info)
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE, -- Links to users table if they have an account
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  type VARCHAR(50) DEFAULT 'individual' CHECK(type IN ('individual', 'business')),
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_active DATE,
  tags TEXT, -- JSON array as text
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- AUTOMATION TEMPLATES (WhatsApp & Email)
-- ============================================
CREATE TABLE IF NOT EXISTS automation_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK(channel IN ('whatsapp', 'email')),
  trigger_event VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  variables TEXT, -- JSON array of variables like {{name}}, {{service}}
  active BOOLEAN DEFAULT TRUE,
  sent_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- AUTOMATION LOGS (Track all sent messages)
-- ============================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read', 'failed')),
  payload TEXT, -- JSON of message details
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES automation_templates(id) ON DELETE SET NULL
);

-- ============================================
-- NOTIFICATIONS (In-app notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  icon VARCHAR(100) DEFAULT 'ti-info-circle',
  icon_color VARCHAR(50) DEFAULT 'var(--blue)',
  text TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- INTEGRATIONS (Connected services status)
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  status VARCHAR(50) DEFAULT 'disconnected' CHECK(status IN ('connected', 'disconnected', 'error')),
  config_json TEXT, -- encrypted credentials
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACTIVITY LOG (System-wide activity feed)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon VARCHAR(100),
  icon_color VARCHAR(50),
  text TEXT NOT NULL,
  metadata TEXT, -- JSON: { leadId, bookingId, etc. }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_sent_at ON automation_logs(sent_at);

-- ============================================
-- TRIGGERS for automatic timestamp updates (PostgreSQL only)
-- ============================================
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = CURRENT_TIMESTAMP;
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';
--
-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--
-- CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--
-- CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
