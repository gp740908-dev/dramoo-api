const express = require('express');
const router = express.Router();
const unifiedController = require('../controllers/unifiedController');
const { requireApiKey, trackUsage } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter khusus untuk endpoint berat (Puppeteer)
// Maksimal 15 request per menit per IP untuk menghindari DDoS
const heavyEndpointLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 15, // limit each IP to 15 requests per windowMs
  message: {
    status: 'error',
    message: 'Terlalu banyak permintaan ke server. Silakan coba lagi setelah 1 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global endpoint untuk scraping drama dengan Adapter Pattern
router.get('/dramas', requireApiKey, trackUsage, unifiedController.getDramas);
router.get('/dramas/search', requireApiKey, trackUsage, unifiedController.getDramas); // Alias untuk mempermudah developer
router.get('/dramas/trending', requireApiKey, trackUsage, unifiedController.getDramaTrending);
router.get('/dramas/latest', requireApiKey, trackUsage, unifiedController.getDramaLatest);

// Endpoint berat (menggunakan Puppeteer) diberikan rate-limiter
router.get('/dramas/detail', requireApiKey, heavyEndpointLimiter, trackUsage, unifiedController.getDramaDetail);
router.get('/dramas/stream', requireApiKey, heavyEndpointLimiter, trackUsage, unifiedController.getDramaStream);

// Custom endpoint for bulk getting all episodes streams formatted specifically (sangat berat)
router.get('/platform/allepisode', requireApiKey, heavyEndpointLimiter, trackUsage, unifiedController.getDramaAllEpisodeStream);
router.get('/:platform/allepisode', requireApiKey, heavyEndpointLimiter, trackUsage, unifiedController.getDramaAllEpisodeStream);

module.exports = router;
