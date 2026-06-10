// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter global: 1000 req/menit per IP
 */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.query.key || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Terlalu banyak request. Maksimal 1000 request/menit.',
      retry_after: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * Rate limiter ketat untuk endpoint auth/admin
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
    });
  },
});

module.exports = { globalLimiter, strictLimiter };
