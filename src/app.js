// src/app.js
// Entry point Dramoo API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const apiRoutes     = require('./routes/api');
const adminRoutes   = require('./routes/admin');
const scraperRoutes = require('./routes/scraper');
const { globalLimiter } = require('./middleware/rateLimiter');
const { cleanOldLogs } = require('./utils/keyGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── SECURITY ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://*"]
    },
  },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Api-Key', 'X-Master-Key', 'Authorization'],
}));

// ─── BODY PARSER ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGING ─────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const accessLog = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLog }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── RATE LIMITER ────────────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── STATIC FILES (logos) ────────────────────────────────────────────────────
const logosDir = path.join(__dirname, '../public/logos');
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
app.use('/logos', express.static(logosDir));

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dramoo API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  });
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/api', scraperRoutes); // Endpoint kini tergabung di dalam /api agar elegan

// ─── ROOT ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/docs.html', (req, res) => {
  res.redirect('/docs/');
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan`,
    docs: 'https://api.wmxservices.store/#api-docs',
  });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── CRON JOBS ───────────────────────────────────────────────────────────────

// Reset daily usage setiap tengah malam
cron.schedule('0 0 * * *', () => {
  console.log('⏰ Cron: Reset daily usage counters');
  const { getDb } = require('./config/database');
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    UPDATE api_keys SET daily_used = 0, last_reset = ?
    WHERE last_reset != ? AND status = 'active'
  `).run(today, today);
  console.log(`   ✅ Reset ${result.changes} keys`);
}, { timezone: 'Asia/Jakarta' });

// Auto-expire keys setiap jam
cron.schedule('0 * * * *', () => {
  const { getDb } = require('./config/database');
  const db = getDb();
  const result = db.prepare(`
    UPDATE api_keys SET status = 'expired', updated_at = datetime('now')
    WHERE status = 'active' AND expires_at < datetime('now')
  `).run();
  if (result.changes > 0) {
    console.log(`⏰ Cron: ${result.changes} key(s) expired`);
  }
});

// Bersihkan log lama setiap hari jam 03:00
cron.schedule('0 3 * * *', () => {
  const deleted = cleanOldLogs();
  console.log(`⏰ Cron: Hapus ${deleted} log lama`);
}, { timezone: 'Asia/Jakarta' });

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 ===== DRAMOO API =====`);
  console.log(`🚀 Server: http://0.0.0.0:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
  console.log(`========================\n`);
});

module.exports = app;
