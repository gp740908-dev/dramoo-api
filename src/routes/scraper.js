// src/routes/scraper.js
// Endpoint untuk semua fitur web scraping drama
// Semua endpoint membutuhkan API key yang valid

const express = require('express');
const router  = express.Router();
const scraper = require('../scrapers');
const { requireApiKey, trackUsage } = require('../middleware/auth');

// ─── Middleware: validasi platform ID ────────────────────────────────────────

function validatePlatform(req, res, next) {
  const { platform } = req.params;
  const available = ['melolo', 'dramawave', 'pinedrama', 'dramabox'];

  if (platform && !available.includes(platform)) {
    return res.status(400).json({
      success: false,
      error: `Platform '${platform}' tidak valid.`,
      available,
    });
  }
  next();
}

// ─── Info platform yang bisa di-scrape ───────────────────────────────────────

/**
 * GET /scrape/platforms
 * Daftar platform yang mendukung scraping
 */
router.get('/platforms', requireApiKey, trackUsage, (req, res) => {
  const platforms = scraper.listPlatforms();
  res.json({ success: true, total: platforms.length, platforms });
});

// ─── Latest ──────────────────────────────────────────────────────────────────

/**
 * GET /scrape/latest
 * Drama terbaru dari SEMUA platform (paralel)
 * Query: ?page=1
 */
router.get('/latest', requireApiKey, trackUsage, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  if (page < 1 || page > 100) {
    return res.status(400).json({ success: false, error: 'page harus antara 1-100' });
  }

  try {
    const result = await scraper.getLatestAll(page);
    res.json(result);
  } catch (err) {
    console.error('[Scraper] getLatestAll error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /scrape/latest/:platform
 * Drama terbaru dari satu platform
 * Query: ?page=1
 */
router.get('/latest/:platform', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const page         = parseInt(req.query.page) || 1;

  try {
    const result = await scraper.getLatest(platform, page);
    res.json(result);
  } catch (err) {
    console.error(`[Scraper] getLatest(${platform}) error:`, err);
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * GET /scrape/search
 * Cari dari SEMUA platform sekaligus
 * Query: ?q=judul&page=1
 */
router.get('/search', requireApiKey, trackUsage, async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Parameter ?q wajib diisi (min. 2 karakter)' });
  }

  try {
    const result = await scraper.searchAll(q.trim(), parseInt(page));
    res.json(result);
  } catch (err) {
    console.error('[Scraper] searchAll error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /scrape/search/:platform
 * Cari di satu platform
 * Query: ?q=judul&page=1
 */
router.get('/search/:platform', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { q, page = 1 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Parameter ?q wajib diisi (min. 2 karakter)' });
  }

  try {
    const result = await scraper.search(platform, q.trim(), parseInt(page));
    res.json(result);
  } catch (err) {
    console.error(`[Scraper] search(${platform}) error:`, err);
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── Detail ──────────────────────────────────────────────────────────────────

/**
 * GET /scrape/detail/:platform
 * Detail drama + daftar episode
 * Query: ?url=https://...
 */
router.get('/detail/:platform', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { url }      = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Parameter ?url wajib diisi' });
  }

  // Validasi URL sederhana
  if (!url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'URL harus dimulai dengan http/https' });
  }

  try {
    const result = await scraper.getDetail(platform, url);
    res.json(result);
  } catch (err) {
    console.error(`[Scraper] getDetail(${platform}) error:`, err);
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── Stream URL ───────────────────────────────────────────────────────────────

/**
 * GET /scrape/stream/:platform
 * Ambil URL video/stream dari episode
 * Query: ?url=https://...
 *
 * ⚠️  Endpoint ini lebih lambat karena membuka browser headless
 *    dan mengintersep request network
 */
router.get('/stream/:platform', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { url }      = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Parameter ?url wajib diisi' });
  }
  if (!url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'URL harus dimulai dengan http/https' });
  }

  // Set timeout header agar tidak terkena proxy timeout
  res.setTimeout(60000);

  try {
    const result = await scraper.getStreamUrl(platform, url);
    res.json(result);
  } catch (err) {
    console.error(`[Scraper] getStreamUrl(${platform}) error:`, err);
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── Cache management (admin helper) ─────────────────────────────────────────

/**
 * DELETE /scrape/cache
 * Bersihkan cache scraper (gunakan X-Master-Key)
 */
router.delete('/cache', (req, res) => {
  const masterKey = req.headers['x-master-key'];
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return res.status(401).json({ success: false, error: 'X-Master-Key tidak valid' });
  }

  const deleted = scraper.clearCache();
  res.json({ success: true, message: `Cache berhasil dihapus (${deleted} entri)` });
});

/**
 * GET /scrape/cache
 * Info cache (admin)
 */
router.get('/cache', (req, res) => {
  const masterKey = req.headers['x-master-key'];
  if (!masterKey || masterKey !== process.env.MASTER_KEY) {
    return res.status(401).json({ success: false, error: 'X-Master-Key tidak valid' });
  }
  res.json({ success: true, cache: scraper.cacheInfo() });
});

module.exports = router;
