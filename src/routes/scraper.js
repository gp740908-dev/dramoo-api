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
 * GET /:platform/latest
 * Drama terbaru dari satu platform
 * Query: ?page=1
 */
router.get('/:platform/latest', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
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
 * GET /:platform/search
 * Cari di satu platform
 * Query: ?q=judul&page=1
 */
router.get('/:platform/search', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
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
 * GET /:platform/detail
 * Detail drama + daftar episode
 * Query: ?url=https://...
 */
router.get('/:platform/detail', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
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
 * GET /:platform/stream
 * Ambil URL video/stream dari episode
 * Query: ?url=https://...
 *
 * ⚠️  Endpoint ini lebih lambat karena membuka browser headless
 *    dan mengintersep request network
 */
router.get('/:platform/stream', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
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

// ─── Categories & Trending ───────────────────────────────────────────────────

/**
 * GET /:platform/category
 */
router.get('/:platform/category', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { id, page = 1, lang = 'id' } = req.query;
  try {
    const result = await scraper.getCategory(platform, id, parseInt(page), lang);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

/**
 * GET /:platform/trending
 */
router.get('/:platform/trending', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { page = 1, cursor, lang = 'id' } = req.query;
  try {
    const result = await scraper.getTrending(platform, parseInt(page), cursor, lang);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

/**
 * GET /:platform/languages
 */
router.get('/:platform/languages', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  try {
    const result = await scraper.getLanguages(platform);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── ALIAS DOKUMENTASI EKSTERNAL (allepisode & episode) ──────────────────────

/**
 * GET /:platform/allepisode
 * Mendapatkan semua episode list menggunakan ID
 * Query: ?id=loves-substitute
 */
router.get('/:platform/allepisode', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { id, url, lang = 'id' } = req.query;
  
  let targetUrl = url;
  if (!targetUrl && id) {
    // Construct url based on platform
    if (platform === 'pinedrama') targetUrl = `https://pinedrama.com/${lang}/dramas/${id}`;
    else if (platform === 'melolo') targetUrl = `https://melolo.com/${lang}/dramas/${id}`;
    else if (platform === 'dramabox') targetUrl = `https://www.dramabox.com/${lang}/drama/${id}`;
    // Anda bisa tambahkan logika untuk platform lain di sini jika polanya diketahui
    else targetUrl = id; 
  }

  if (!targetUrl) return res.status(400).json({ success: false, error: 'Parameter ?id wajib diisi' });

  try {
    const result = await scraper.getDetail(platform, targetUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

/**
 * GET /:platform/episode
 * Mendapatkan URL Stream MP4 menggunakan ID & EP
 * Query: ?id=loves-substitute&ep=1
 */
router.get('/:platform/episode', requireApiKey, trackUsage, validatePlatform, async (req, res) => {
  const { platform } = req.params;
  const { id, ep, url, lang = 'id' } = req.query; 

  let targetUrl = url;
  if (!targetUrl && id && ep) {
    if (platform === 'pinedrama') targetUrl = `https://pinedrama.com/${lang}/dramas/${id}/ep${ep}`;
    else if (platform === 'melolo') targetUrl = `https://melolo.com/${lang}/dramas/${id}/ep${ep}`;
    else if (platform === 'dramabox') targetUrl = `https://www.dramabox.com/${lang}/play/${id}/${ep}`; // Note: DramaBox uses play/dramaId/episodeId
    else targetUrl = `${id}/ep${ep}`;
  }

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Gunakan ?id=X&ep=N atau parameter ?url=' });
  }
  
  res.setTimeout(60000);
  try {
    const result = await scraper.getStreamUrl(platform, targetUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, platform });
  }
});

// ─── Video Proxy ─────────────────────────────────────────────────────────────

/**
 * GET /scrape/proxy
 * Proxy video stream agar URL sumber asli tidak terlihat oleh user/client
 * Query: ?url=https://...
 */
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Parameter ?url wajib diisi');
  }

  try {
    const axios = require('axios');
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Referer': 'https://pinedrama.com/',
      'Origin': 'https://pinedrama.com'
    };
    
    // Meneruskan header Range dari client (penting untuk video seek/MP4)
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios({
      url: decodeURIComponent(url),
      method: 'GET',
      responseType: 'stream',
      headers: headers,
      validateStatus: (status) => status >= 200 && status < 400
    });

    // Meneruskan header response asli ke client
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    for (const key of headersToForward) {
      if (response.headers[key]) {
        res.setHeader(key, response.headers[key]);
      }
    }
    
    res.status(response.status);
    response.data.pipe(res);
  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).send('Gagal mem-proxy video');
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
