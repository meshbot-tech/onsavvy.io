/**
 * Database Query Helper
 * Provides a consistent interface for SQLite and PostgreSQL
 */

const { initDatabase, query: dbQuery, run: dbRun } = require('../config/database');

/**
 * Generic SELECT query
 */
 async function find(table, conditions = {}, limit = null, orderBy = null) {
  let sql = `SELECT * FROM ${table}`;
  const params = [];

  if (Object.keys(conditions).length > 0) {
    const whereClauses = [];
    Object.keys(conditions).forEach(key => {
      whereClauses.push(`${key} = ?`);
      params.push(conditions[key]);
    });
    sql += ' WHERE ' + whereClauses.join(' AND ');
  }

  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  return dbQuery(sql, params);
}

/**
 * Get single record by id
 */
function findById(table, id) {
  return dbQuery(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

/**
 * Get single record by field
 */
function findOne(table, conditions) {
  const results = find(table, conditions, 1);
  return results.length ? results[0] : null;
}

/**
 * Insert record
 */
function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = dbRun(sql, values);

  // Return the inserted row
  return findById(table, result.lastInsertRowid || result.insertId);
}

/**
 * Update record
 */
function update(table, id, data) {
  const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const params = [...Object.values(data), id];
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  return dbRun(sql, params);
}

/**
 * Delete record
 */
function del(table, id) {
  return dbRun(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

/**
 * Custom query (for complex operations)
 */
function raw(sql, params = []) {
  return dbQuery(sql, params);
}

/**
 * Start a transaction (PostgreSQL only - SQLite auto-commit)
 */
async function transaction(callback) {
  if (process.env.NODE_ENV === 'production' && process.env.PG_HOST) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback({ query: client.query, commit: () => client.query('COMMIT'), rollback: () => client.query('ROLLBACK') });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    // SQLite - just run the callback
    return callback({ query: dbQuery, commit: () => {}, rollback: () => {} });
  }
}

module.exports = {
  find,
  findById,
  findOne,
  insert,
  update,
  del,
  raw,
  transaction
};
