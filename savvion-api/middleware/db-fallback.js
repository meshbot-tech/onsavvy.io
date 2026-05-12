/**
 * Simple JSON File Database (Fallback for when better-sqlite3 is not available)
 * This provides basic CRUD operations using JSON files
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'savvion.json');

// Load or initialize DB
let db = {};
function loadDB() {
  try {
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } else {
      db = {
        users: [],
        services: [],
        leads: [],
        bookings: [],
        clients: [],
        automation_templates: [],
        automation_logs: [],
        notifications: [],
        integrations: [],
        activity_logs: []
      };
      saveDB();
    }
  } catch (err) {
    console.error('Error loading DB:', err);
    db = { users: [], services: [], leads: [], bookings: [], clients: [], automation_templates: [], automation_logs: [], notifications: [], integrations: [], activity_logs: [] };
  }
}

function saveDB() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

// Initialize
loadDB();

module.exports = {
  initDatabase() {
    console.log('✅ JSON File DB initialized');
    return db;
  },
  query(table, conditions = {}) {
    let results = db[table] || [];
    if (Object.keys(conditions).length > 0) {
      results = results.filter(row => {
        return Object.keys(conditions).every(key => row[key] === conditions[key]);
      });
    }
    return results;
  },
  run(sql, params) {
    // Simple SQL-like parsing for basic queries
    // This is a very simplified implementation
    const lowerSql = sql.toLowerCase().trim();
    
    if (lowerSql.startsWith('insert')) {
      const tableMatch = sql.match(/insert into (\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        if (!db[table]) db[table] = [];
        
        // Parse column names and values
        const colMatch = sql.match(/\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
        if (colMatch) {
          const columns = colMatch[1].split(',').map(c => c.trim());
          const values = colMatch[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
          
          const newRecord = { id: Date.now() };
          columns.forEach((col, idx) => {
            newRecord[col] = values[idx];
          });
          
          db[table].push(newRecord);
          saveDB();
          return { lastInsertRowid: newRecord.id, insertId: newRecord.id };
        }
      }
    } else if (lowerSql.startsWith('update')) {
      const tableMatch = sql.match(/update (\w+) set/i);
      if (tableMatch) {
        const table = tableMatch[1];
        if (db[table]) {
          // Parse SET clause
          const setMatch = sql.match(/set\s+([^=]+)\s*=\s*([^,\s]+)/i);
          // Parse WHERE
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*(\d+)/i);
          if (whereMatch) {
            const idField = whereMatch[1];
            const idVal = parseInt(whereMatch[2]);
            const record = db[table].find(r => r[idField] === idVal);
            if (record) {
              // Parse all set assignments
              const setClause = sql.split(' set ')[1].split(' where ')[0];
              const assignments = setClause.split(',');
              assignments.forEach(assign => {
                const [key, value] = assign.split('=').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                if (key && value) record[key] = isNaN(value) ? value : parseFloat(value) || value;
              });
              saveDB();
              return { changes: 1 };
            }
          }
        }
      }
      return { changes: 0 };
    } else if (lowerSql.startsWith('delete')) {
      const tableMatch = sql.match(/delete from (\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        if (db[table]) {
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*(\d+)/i);
          if (whereMatch) {
            const idField = whereMatch[1];
            const idVal = parseInt(whereMatch[2]);
            const initialLen = db[table].length;
            db[table] = db[table].filter(r => r[idField] !== idVal);
            if (db[table].length < initialLen) {
              saveDB();
              return { changes: 1 };
            }
          }
        }
      }
      return { changes: 0 };
    } else if (lowerSql.startsWith('select')) {
      // Very basic SELECT implementation
      if (lowerSql.includes('count(*)')) {
        const tableMatch = sql.match(/from (\w+)/i);
        if (tableMatch) {
          const table = tableMatch[1];
          let count = (db[table] || []).length;
          // Apply WHERE if present
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
          if (whereMatch) {
            // This is simplified - real implementation would need param binding
          }
          return [{ count }];
        }
      }
      const tableMatch = sql.match(/from (\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        let results = db[table] || [];
        // Apply simple WHERE with params (positional)
        // This is simplified - we'd need full SQL parser
        return results;
      }
    }
    
    return { lastInsertRowid: 0, insertId: 0, changes: 0 };
  },
  
  // Helper methods
  find(table, conditions = {}, limit = null, orderBy = null) {
    let results = this.query(table, conditions);
    if (orderBy) {
      const [field, dir] = orderBy.split(' ');
      results.sort((a, b) => (field ? a[field] > b[field] ? 1 : -1 : 0) * (dir === 'DESC' ? -1 : 1));
    }
    if (limit) results = results.slice(0, limit);
    return results;
  },
  
  findById(table, id) {
    return this.query(table, { id: parseInt(id) });
  },
  
  findOne(table, conditions) {
    const results = this.find(table, conditions, 1);
    return results.length ? results[0] : null;
  },
  
  insert(table, data) {
    const newRecord = { id: Date.now(), ...data };
    if (!db[table]) db[table] = [];
    db[table].push(newRecord);
    saveDB();
    return newRecord;
  },
  
  update(table, id, data) {
    if (!db[table]) return { changes: 0 };
    const record = db[table].find(r => r.id === parseInt(id));
    if (record) {
      Object.assign(record, data);
      saveDB();
      return { changes: 1 };
    }
    return { changes: 0 };
  },
  
  del(table, id) {
    if (!db[table]) return { changes: 0 };
    const initialLen = db[table].length;
    db[table] = db[table].filter(r => r.id !== parseInt(id));
    if (db[table].length < initialLen) {
      saveDB();
      return { changes: 1 };
    }
    return { changes: 0 };
  },
  
  raw(sql, params = []) {
    // For complex queries, we'll need a proper parser
    // For now, return empty array
    console.warn('raw() queries not fully supported in JSON DB fallback');
    return [];
  },
  
  transaction(callback) {
    // No real transaction support in JSON DB
    return callback({ query: this.query.bind(this), commit: () => {}, rollback: () => {} });
  }
};
