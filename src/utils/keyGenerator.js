// src/utils/keyGenerator.js
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

/**
 * Generate API key unik dengan format: drm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
function generateApiKey() {
  const random = crypto.randomBytes(24).toString('hex');
  return `drm_${random}`;
}

/**
 * Buat atau perpanjang API key untuk user
 */
function createApiKey(userId, packageId, note = null) {
  const db = getDb();

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(packageId);
  if (!pkg) throw new Error(`Paket '${packageId}' tidak ditemukan`);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pkg.duration_days);

  const keyId = uuidv4();
  const apiKey = generateApiKey();

  db.prepare(`
    INSERT INTO api_keys (id, user_id, package_id, api_key, status, expires_at, daily_limit, note)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(keyId, userId, packageId, apiKey, expiresAt.toISOString(), pkg.daily_limit, note);

  return {
    id: keyId,
    api_key: apiKey,
    package_id: packageId,
    package_name: pkg.name,
    expires_at: expiresAt.toISOString(),
    daily_limit: pkg.daily_limit,
    duration_days: pkg.duration_days,
  };
}

/**
 * Buat atau temukan user berdasarkan telegram_id
 */
function upsertUser(telegramId, username, fullName) {
  const db = getDb();

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(telegramId));

  if (!user) {
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, telegram_id, username, full_name)
      VALUES (?, ?, ?, ?)
    `).run(userId, String(telegramId), username || null, fullName || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else {
    // Update nama kalau berubah
    db.prepare(`
      UPDATE users SET username = ?, full_name = ?, updated_at = datetime('now') WHERE id = ?
    `).run(username || null, fullName || null, user.id);
  }

  return user;
}

/**
 * Format tanggal ke Indonesia
 */
function formatDateID(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Format rupiah
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

/**
 * Bersihkan log lama (> 7 hari)
 */
function cleanOldLogs() {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM request_logs WHERE created_at < datetime('now', '-7 days')
  `).run();
  return result.changes;
}

module.exports = { generateApiKey, createApiKey, upsertUser, formatDateID, formatRupiah, cleanOldLogs };
