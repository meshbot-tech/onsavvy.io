/**
 * Database Configuration
 * Supports SQLite (development) and PostgreSQL (production)
 */

const { Pool } = require('pg');
const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists for SQLite
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

/**
 * Initialize database connection based on environment
 */
function initDatabase() {
  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    // PostgreSQL for production
    db = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT) || 5432,
      database: process.env.PG_DATABASE || 'savvion',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    console.log('✅ Connected to PostgreSQL');
  } else {
    // SQLite for development (no external DB needed)
    const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'savvion.db');
    db = sqlite3(dbPath);
    db.pragma('journal_mode = WAL'); // Better concurrency
    console.log('✅ Connected to SQLite:', dbPath);
  }
  return db;
}

/**
 * Execute a query (PostgreSQL returns Promise, SQLite is sync)
 */
function query(sql, params = []) {
  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    return db.query(sql, params);
  }
  // SQLite
  const stmt = db.prepare(sql);
  if (params.length) {
    return stmt.all(params);
  }
  return stmt.all();
}

/**
 * Execute a single statement (INSERT/UPDATE/DELETE)
 */
function run(sql, params = []) {
  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    return db.query(sql, params);
  }
  const stmt = db.prepare(sql);
  return stmt.run(params);
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

module.exports = {
  initDatabase,
  query,
  run,
  getDb
};
