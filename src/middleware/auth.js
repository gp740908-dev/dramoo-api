// src/middleware/auth.js
const { getDb } = require('../config/database');

/**
 * Middleware: Validasi API Key dari header X-Api-Key atau query ?key=
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key tidak ditemukan. Kirim via header X-Api-Key atau query ?key=',
      docs: 'https://dramoo.id/#api-docs',
    });
  }

  const db = getDb();

  // Cari key di database
  const keyRow = db.prepare(`
    SELECT
      ak.*,
      u.telegram_id, u.username, u.full_name,
      p.name AS package_name, p.tier_access,
      p.duration_days
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    JOIN packages p ON ak.package_id = p.id
    WHERE ak.api_key = ?
  `).get(apiKey);

  if (!keyRow) {
    return res.status(401).json({
      success: false,
      error: 'API key tidak valid',
    });
  }

  // Cek status key
  if (keyRow.status !== 'active') {
    const messages = {
      expired: 'API key sudah kadaluarsa. Silakan perpanjang paket Anda.',
      revoked: 'API key telah dicabut. Hubungi admin.',
      suspended: 'API key ditangguhkan. Hubungi admin.',
    };
    return res.status(403).json({
      success: false,
      error: messages[keyRow.status] || 'API key tidak aktif',
      status: keyRow.status,
    });
  }

  // Cek expiry
  const now = new Date();
  const expiresAt = new Date(keyRow.expires_at);
  if (now > expiresAt) {
    // Update status ke expired
    db.prepare(`UPDATE api_keys SET status = 'expired', updated_at = datetime('now') WHERE id = ?`)
      .run(keyRow.id);
    return res.status(403).json({
      success: false,
      error: 'API key sudah kadaluarsa.',
      expired_at: keyRow.expires_at,
    });
  }

  // Reset daily counter jika sudah hari baru
  const today = new Date().toISOString().split('T')[0];
  if (keyRow.last_reset !== today) {
    db.prepare(`
      UPDATE api_keys
      SET daily_used = 0, last_reset = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(today, keyRow.id);
    keyRow.daily_used = 0;
  }

  // Cek daily limit
  if (keyRow.daily_used >= keyRow.daily_limit) {
    return res.status(429).json({
      success: false,
      error: 'Limit harian tercapai. Reset otomatis besok pukul 00:00.',
      daily_limit: keyRow.daily_limit,
      daily_used: keyRow.daily_used,
      reset_at: today + 'T00:00:00.000Z',
    });
  }

  // Inject ke request
  req.apiKey = keyRow;
  next();
}

/**
 * Middleware: Update usage counter setelah response
 */
function trackUsage(req, res, next) {
  const originalJson = res.json.bind(res);
  const startTime = Date.now();

  res.json = function (body) {
    const responseMs = Date.now() - startTime;

    if (req.apiKey) {
      const db = getDb();
      // Increment counters
      db.prepare(`
        UPDATE api_keys
        SET daily_used = daily_used + 1,
            total_used = total_used + 1,
            last_used_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(req.apiKey.id);

      // Log request (hanya simpan 7 hari terakhir untuk hemat storage)
      try {
        db.prepare(`
          INSERT INTO request_logs (api_key_id, endpoint, method, status_code, ip_address, user_agent, response_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.apiKey.id,
          req.path,
          req.method,
          res.statusCode,
          req.ip || req.connection?.remoteAddress,
          req.headers['user-agent']?.substring(0, 200),
          responseMs
        );
      } catch (_) { /* log error tidak critical */ }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Middleware: Cek akses ke platform tertentu
 */
function requirePlatformAccess(platformId) {
  return (req, res, next) => {
    const db = getDb();
    const access = db.prepare(`
      SELECT 1 FROM package_platforms
      WHERE package_id = ? AND platform_id = ?
    `).get(req.apiKey.package_id, platformId);

    if (!access) {
      return res.status(403).json({
        success: false,
        error: `Platform '${platformId}' tidak termasuk dalam paket Anda (${req.apiKey.package_name}).`,
        upgrade_url: 'https://t.me/dramoobot',
      });
    }
    next();
  };
}

/**
 * Middleware: Admin only (Master Key)
 */
function requireAdmin(req, res, next) {
  const masterKey = req.headers['x-master-key'] || req.query.master_key;
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return res.status(403).json({ success: false, error: 'Akses ditolak' });
  }
  next();
}

module.exports = { requireApiKey, trackUsage, requirePlatformAccess, requireAdmin };
