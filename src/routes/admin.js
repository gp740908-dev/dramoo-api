// src/routes/admin.js
// Endpoint admin (butuh X-Master-Key)

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { createApiKey, upsertUser, formatRupiah } = require('../utils/keyGenerator');
const { v4: uuidv4 } = require('uuid');

// Semua route admin butuh master key
router.use(requireAdmin);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalKeys = db.prepare('SELECT COUNT(*) as c FROM api_keys').get().c;
  const activeKeys = db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE status = 'active'").get().c;
  const expiredKeys = db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE status = 'expired'").get().c;
  const totalRequests = db.prepare('SELECT SUM(total_used) as s FROM api_keys').get().s || 0;
  const todayRequests = db.prepare('SELECT SUM(daily_used) as s FROM api_keys').get().s || 0;

  const packageStats = db.prepare(`
    SELECT p.name, COUNT(ak.id) as total_keys
    FROM packages p
    LEFT JOIN api_keys ak ON ak.package_id = p.id
    GROUP BY p.id
    ORDER BY p.price ASC
  `).all();

  const recentKeys = db.prepare(`
    SELECT ak.api_key, ak.status, ak.created_at, ak.expires_at, ak.total_used,
           u.username, u.full_name, p.name AS package_name
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    JOIN packages p ON ak.package_id = p.id
    ORDER BY ak.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    success: true,
    stats: {
      users: totalUsers,
      keys: { total: totalKeys, active: activeKeys, expired: expiredKeys },
      requests: { total: totalRequests, today: todayRequests },
    },
    packages: packageStats,
    recent_keys: recentKeys,
  });
});

// ─── API KEYS ─────────────────────────────────────────────────────────────────

/**
 * POST /admin/keys
 * Buat API key baru untuk user (dari Telegram atau manual)
 */
router.post('/keys', (req, res) => {
  const { telegram_id, username, full_name, package_id, note } = req.body;

  if (!telegram_id || !package_id) {
    return res.status(400).json({ success: false, error: 'telegram_id dan package_id wajib diisi' });
  }

  try {
    const user = upsertUser(telegram_id, username, full_name);
    const keyData = createApiKey(user.id, package_id, note);

    // Catat transaksi
    const db = getDb();
    const pkg = db.prepare('SELECT price FROM packages WHERE id = ?').get(package_id);
    db.prepare(`
      INSERT INTO transactions (id, user_id, package_id, api_key_id, amount, status, payment_method, note)
      VALUES (?, ?, ?, ?, ?, 'paid', 'manual', ?)
    `).run(uuidv4(), user.id, package_id, keyData.id, pkg?.price || 0, note || 'Manual by admin');

    res.json({
      success: true,
      message: 'API key berhasil dibuat',
      key: keyData,
      user: { id: user.id, telegram_id: user.telegram_id, username: user.username },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/keys
 * Daftar semua API key
 */
router.get('/keys', (req, res) => {
  const db = getDb();
  const { status, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT ak.*, u.telegram_id, u.username, u.full_name, p.name AS package_name
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    JOIN packages p ON ak.package_id = p.id
  `;
  const params = [];

  if (status) {
    query += ' WHERE ak.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ak.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const keys = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM api_keys${status ? ' WHERE status = ?' : ''}`).get(...(status ? [status] : [])).c;

  res.json({
    success: true,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    keys,
  });
});

/**
 * GET /admin/keys/:key
 * Detail satu API key
 */
router.get('/keys/:key', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT ak.*, u.telegram_id, u.username, u.full_name, p.name AS package_name, p.tier_access
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    JOIN packages p ON ak.package_id = p.id
    WHERE ak.api_key = ? OR ak.id = ?
  `).get(req.params.key, req.params.key);

  if (!row) return res.status(404).json({ success: false, error: 'Key tidak ditemukan' });

  // Ambil 10 log terakhir
  const logs = db.prepare(`
    SELECT endpoint, method, status_code, ip_address, response_ms, created_at
    FROM request_logs WHERE api_key_id = ?
    ORDER BY created_at DESC LIMIT 10
  `).all(row.id);

  res.json({ success: true, key: row, recent_logs: logs });
});

/**
 * PATCH /admin/keys/:id/status
 * Update status key (revoke, suspend, activate)
 */
router.patch('/keys/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'revoked', 'suspended'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: `Status harus salah satu dari: ${allowed.join(', ')}` });
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE api_keys SET status = ?, updated_at = datetime('now')
    WHERE id = ? OR api_key = ?
  `).run(status, req.params.id, req.params.id);

  if (result.changes === 0) return res.status(404).json({ success: false, error: 'Key tidak ditemukan' });

  res.json({ success: true, message: `Status key diupdate ke '${status}'` });
});

/**
 * DELETE /admin/keys/:id
 * Hapus API key (hard delete)
 */
router.delete('/keys/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM api_keys WHERE id = ? OR api_key = ?').run(req.params.id, req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'Key tidak ditemukan' });
  res.json({ success: true, message: 'API key dihapus' });
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.*, COUNT(ak.id) AS total_keys,
           SUM(CASE WHEN ak.status = 'active' THEN 1 ELSE 0 END) AS active_keys
    FROM users u
    LEFT JOIN api_keys ak ON ak.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json({ success: true, total: users.length, users });
});

// ─── PLATFORMS ───────────────────────────────────────────────────────────────
router.get('/platforms', (req, res) => {
  const db = getDb();
  const platforms = db.prepare('SELECT * FROM platforms ORDER BY tier, name').all();
  res.json({ success: true, platforms });
});

router.patch('/platforms/:id', (req, res) => {
  const { status, api_url, description } = req.body;
  const db = getDb();

  const fields = [];
  const params = [];

  if (status) { fields.push('status = ?'); params.push(status); }
  if (api_url !== undefined) { fields.push('api_url = ?'); params.push(api_url); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }

  if (fields.length === 0) return res.status(400).json({ success: false, error: 'Tidak ada field yang diupdate' });

  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);

  const result = db.prepare(`UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'Platform tidak ditemukan' });

  res.json({ success: true, message: 'Platform diupdate' });
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
router.get('/transactions', (req, res) => {
  const db = getDb();
  const transactions = db.prepare(`
    SELECT t.*, u.telegram_id, u.username, p.name AS package_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    JOIN packages p ON t.package_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 100
  `).all();

  res.json({ success: true, total: transactions.length, transactions });
});

module.exports = router;
