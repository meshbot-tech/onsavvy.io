/**
 * Database Configuration
 * Supports SQLite (development) and PostgreSQL (production)
 * Falls back to JSON file storage if better-sqlite3 is unavailable
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists for SQLite
const dataDir = path.join(__dirname, '..', 'data');
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
    return db;
  }

  // Try SQLite first, fall back to JSON DB
  try {
    const betterSqlite3 = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'savvion.db');
    db = betterSqlite3(dbPath);
    db.pragma('journal_mode = WAL'); // Better concurrency
    console.log('✅ Connected to SQLite:', dbPath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('⚠️  better-sqlite3 not available, using JSON file database fallback');
      const jsonDb = require('../middleware/db-fallback');
      db = jsonDb;
      // Initialize the JSON DB
      db.initDatabase();
    } else {
      console.error('❌ Database initialization failed:', err);
      throw err;
    }
  }
  return db;
}

/**
 * Execute a query (PostgreSQL returns Promise, SQLite/JSON are sync)
 */
function query(sql, params = []) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
      return db.query(sql, params);
    }
    // SQLite or JSON DB - both have synchronous query
    return db.query(sql, params);
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

/**
 * Execute a single statement (INSERT/UPDATE/DELETE)
 */
function run(sql, params = []) {
  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    return db.query(sql, params);
  }
  return db.run(sql, params);
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
