// scripts/migrate.js
// Membuat semua tabel database SQLite

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/dramoo.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Direktori database dibuat: ${dbDir}`);
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = db.transaction(() => {
  // Tabel platforms
  db.exec(`
    CREATE TABLE IF NOT EXISTS platforms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      logo_url    TEXT,
      status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','maintenance','coming_soon')),
      api_url     TEXT,
      tier        INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      tags        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Tabel packages
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      price           INTEGER NOT NULL,
      duration_days   INTEGER NOT NULL,
      platform_count  INTEGER NOT NULL,
      daily_limit     INTEGER NOT NULL DEFAULT 900000,
      tier_access     INTEGER NOT NULL DEFAULT 1,
      is_popular      INTEGER NOT NULL DEFAULT 0,
      is_active       INTEGER NOT NULL DEFAULT 1,
      description     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Tabel package_platforms (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS package_platforms (
      package_id  TEXT NOT NULL REFERENCES packages(id),
      platform_id TEXT NOT NULL REFERENCES platforms(id),
      PRIMARY KEY (package_id, platform_id)
    );
  `);

  // Tabel users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      telegram_id   TEXT UNIQUE,
      username      TEXT,
      full_name     TEXT,
      email         TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Tabel api_keys
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id),
      package_id    TEXT NOT NULL REFERENCES packages(id),
      api_key       TEXT NOT NULL UNIQUE,
      status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','revoked','suspended')),
      expires_at    TEXT NOT NULL,
      daily_limit   INTEGER NOT NULL DEFAULT 900000,
      daily_used    INTEGER NOT NULL DEFAULT 0,
      total_used    INTEGER NOT NULL DEFAULT 0,
      last_reset    TEXT NOT NULL DEFAULT (date('now')),
      last_used_at  TEXT,
      note          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Index api_keys
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
  `);

  // Tabel transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id),
      package_id    TEXT NOT NULL REFERENCES packages(id),
      api_key_id    TEXT REFERENCES api_keys(id),
      amount        INTEGER NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded')),
      payment_method TEXT,
      payment_ref   TEXT,
      note          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Tabel request_logs (untuk monitoring usage)
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id  TEXT NOT NULL,
      endpoint    TEXT NOT NULL,
      method      TEXT NOT NULL DEFAULT 'GET',
      status_code INTEGER,
      ip_address  TEXT,
      user_agent  TEXT,
      response_ms INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_key ON request_logs(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_logs_date ON request_logs(created_at);
  `);

  // Tabel admin_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id          TEXT PRIMARY KEY,
      token       TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ Semua tabel berhasil dibuat!');
});

migrations();
db.close();
console.log('✅ Migrasi database selesai.');
