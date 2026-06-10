// src/config/database.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './data/dramoo.db';
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Auto-reset daily limit tiap hari
  db.function('date_eq', (a, b) => (a === b ? 1 : 0));

  return db;
}

module.exports = { getDb };
