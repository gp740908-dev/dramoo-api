// src/routes/api.js
// Endpoint publik: /api/status, /api/status/:id, /api/validate
// Endpoint terproteksi: /api/platforms, /api/me

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireApiKey, trackUsage } = require('../middleware/auth');

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/**
 * GET /api/status
 * Daftar semua platform + summary (publik, tidak butuh API key)
 */
router.get('/status', (req, res) => {
  const db = getDb();
  const platforms = db.prepare(`
    SELECT id, name, logo_url, status, api_url, tags
    FROM platforms
    ORDER BY tier ASC, name ASC
  `).all();

  const active = platforms.filter(p => p.status === 'active').length;
  const maintenance = platforms.filter(p => p.status === 'maintenance').length;
  const comingSoon = platforms.filter(p => p.status === 'coming_soon').length;

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: platforms.length,
      active,
      maintenance,
      coming_soon: comingSoon,
    },
    platforms: platforms.map(p => ({
      id: p.id,
      name: p.name,
      logo: p.logo_url,
      status: p.status,
      api_url: p.api_url || null,
      tags: p.tags ? p.tags.split(',') : [],
    })),
  });
});

/**
 * GET /api/status/:id
 * Detail satu platform
 */
router.get('/status/:id', (req, res) => {
  const db = getDb();
  const platform = db.prepare('SELECT * FROM platforms WHERE id = ?').get(req.params.id);

  if (!platform) {
    return res.status(404).json({
      success: false,
      error: `Platform '${req.params.id}' tidak ditemukan`,
    });
  }

  res.json({
    success: true,
    platform: {
      id: platform.id,
      name: platform.name,
      logo: platform.logo_url,
      status: platform.status,
      api_url: platform.api_url || null,
      tier: platform.tier,
      tags: platform.tags ? platform.tags.split(',') : [],
      description: platform.description || null,
      updated_at: platform.updated_at,
    },
  });
});

/**
 * GET /api/packages
 * Daftar paket harga (publik)
 */
router.get('/packages', (req, res) => {
  const db = getDb();
  const packages = db.prepare(`
    SELECT p.*, GROUP_CONCAT(pp.platform_id) AS platform_ids
    FROM packages p
    LEFT JOIN package_platforms pp ON p.id = pp.package_id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.price ASC
  `).all();

  const result = packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    price: pkg.price,
    price_formatted: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pkg.price),
    duration_days: pkg.duration_days,
    platform_count: pkg.platform_count,
    daily_limit: pkg.daily_limit,
    is_popular: pkg.is_popular === 1,
    description: pkg.description,
    platforms: pkg.platform_ids ? pkg.platform_ids.split(',') : [],
    buy_url: 'https://t.me/dramoobot',
  }));

  res.json({ success: true, packages: result });
});

// ─── PROTECTED (Butuh API Key) ────────────────────────────────────────────────

/**
 * GET /api/validate
 * Validasi API key + info sisa waktu
 */
router.get('/validate', requireApiKey, trackUsage, (req, res) => {
  const k = req.apiKey;
  const now = new Date();
  const expiresAt = new Date(k.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

  res.json({
    success: true,
    valid: true,
    key_info: {
      package: k.package_name,
      tier: k.tier_access,
      status: k.status,
      expires_at: k.expires_at,
      days_remaining: daysLeft,
      daily_limit: k.daily_limit,
      daily_used: k.daily_used + 1, // +1 untuk request ini
      daily_remaining: Math.max(0, k.daily_limit - k.daily_used - 1),
      total_requests: k.total_used + 1,
    },
  });
});

/**
 * GET /api/me
 * Info user + platforms yang bisa diakses
 */
router.get('/me', requireApiKey, trackUsage, (req, res) => {
  const db = getDb();
  const k = req.apiKey;

  // Ambil platforms yang bisa diakses
  const platforms = db.prepare(`
    SELECT p.id, p.name, p.logo_url, p.status, p.api_url, p.tags
    FROM platforms p
    JOIN package_platforms pp ON p.id = pp.platform_id
    WHERE pp.package_id = ?
    ORDER BY p.name ASC
  `).all(k.package_id);

  const now = new Date();
  const expiresAt = new Date(k.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

  res.json({
    success: true,
    user: {
      telegram_id: k.telegram_id,
      username: k.username,
      full_name: k.full_name,
    },
    subscription: {
      package: k.package_name,
      status: k.status,
      expires_at: k.expires_at,
      days_remaining: daysLeft,
      daily_limit: k.daily_limit,
      daily_used: k.daily_used,
      total_requests: k.total_used,
    },
    platforms: platforms.map(p => ({
      id: p.id,
      name: p.name,
      logo: p.logo_url,
      status: p.status,
      api_url: p.status === 'active' ? p.api_url : null,
      tags: p.tags ? p.tags.split(',') : [],
    })),
  });
});

/**
 * GET /api/platforms
 * List platform yang bisa diakses oleh key ini
 */
router.get('/platforms', requireApiKey, trackUsage, (req, res) => {
  const db = getDb();
  const { status, tag } = req.query;

  let query = `
    SELECT p.id, p.name, p.logo_url, p.status, p.api_url, p.tags, p.description
    FROM platforms p
    JOIN package_platforms pp ON p.id = pp.platform_id
    WHERE pp.package_id = ?
  `;
  const params = [req.apiKey.package_id];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (tag) {
    query += ' AND p.tags LIKE ?';
    params.push(`%${tag}%`);
  }

  query += ' ORDER BY p.name ASC';

  const platforms = db.prepare(query).all(...params);

  res.json({
    success: true,
    total: platforms.length,
    platforms: platforms.map(p => ({
      id: p.id,
      name: p.name,
      logo: p.logo_url,
      status: p.status,
      api_url: p.status === 'active' ? p.api_url : null,
      tags: p.tags ? p.tags.split(',') : [],
      description: p.description || null,
    })),
  });
});

module.exports = router;
