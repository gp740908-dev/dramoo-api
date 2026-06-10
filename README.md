# 🎬 Dramoo API

**API Aggregator Platform Drama Pendek Asia — siap deploy di VPS**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 📋 Fitur

- ✅ **38+ platform drama pendek Asia** (DramaBox, ReelShort, MicroDrama, dll)
- 🔑 **Sistem API Key** dengan tier paket (Starter/Standard/Pro/Ultimate)
- 📊 **Rate limiting** per key (daily limit + per-menit limit)
- 🤖 **Telegram Bot** otomatis untuk pembelian & pengiriman key
- 👑 **Admin API** lengkap (stats, kelola key, user, platform)
- 📝 **Request logging** dengan auto-cleanup
- ⏰ **Cron jobs** untuk reset harian & auto-expire
- 🔒 **SSL/HTTPS** via Let's Encrypt
- 🚀 **PM2 cluster mode** untuk high availability

---

## 🏗️ Struktur Proyek

```
dramoo/
├── src/
│   ├── app.js              # Entry point server
│   ├── bot.js              # Telegram Bot
│   ├── config/
│   │   └── database.js     # SQLite connection
│   ├── middleware/
│   │   ├── auth.js         # API key auth + tracking
│   │   └── rateLimiter.js  # Rate limiting
│   ├── routes/
│   │   ├── api.js          # Public & protected endpoints
│   │   └── admin.js        # Admin endpoints
│   └── utils/
│       └── keyGenerator.js # Key generation utilities
├── scripts/
│   ├── migrate.js          # Buat database schema
│   └── seed.js             # Data awal platform & paket
├── nginx/
│   └── dramoo.conf         # Nginx reverse proxy config
├── deploy/
│   ├── setup.sh            # Script install otomatis
│   └── update.sh           # Script update
├── data/                   # SQLite database (auto-created)
├── logs/                   # Log files (auto-created)
├── public/logos/           # Logo platform
├── .env.example
├── ecosystem.config.js     # PM2 config
└── package.json
```

---

## 🚀 Deploy di VPS

### Syarat VPS
- Ubuntu 22.04 / 24.04
- RAM minimal 512MB (rekomendasi 1GB)
- Storage minimal 5GB
- Port 80 & 443 terbuka
- DNS domain sudah diarahkan ke IP VPS

### Cara Deploy Otomatis

```bash
# 1. Upload folder dramoo ke VPS
scp -r dramoo/ root@IP_VPS:/tmp/

# 2. Login ke VPS
ssh root@IP_VPS

# 3. Jalankan setup
cd /tmp/dramoo
bash deploy/setup.sh
```

Script akan otomatis:
- Install Node.js 20, PM2, Nginx, Certbot
- Setup database & seed data
- Konfigurasi Nginx reverse proxy
- Install SSL certificate
- Aktifkan firewall

### Cara Deploy Manual

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install PM2 & Nginx
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx

# Setup aplikasi
cd /var/www/dramoo
cp .env.example .env
nano .env                    # Isi semua variabel

# Install dependencies & setup DB
npm install --production
node scripts/migrate.js
node scripts/seed.js

# Jalankan
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup

# Setup Nginx
sudo cp nginx/dramoo.conf /etc/nginx/sites-available/dramoo
sudo ln -s /etc/nginx/sites-available/dramoo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d api.wmxservices.store
```

---

## ⚙️ Konfigurasi `.env`

```env
NODE_ENV=production
PORT=3000
APP_URL=https://api.wmxservices.store

MASTER_KEY=random_string_panjang_untuk_admin
JWT_SECRET=random_string_untuk_jwt

DB_PATH=./data/dramoo.db

TELEGRAM_BOT_TOKEN=token_dari_botfather
TELEGRAM_ADMIN_ID=telegram_user_id_kamu

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000
```

---

## 📡 API Endpoints

### Public (Tanpa API Key)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Info API |
| GET | `/health` | Health check |
| GET | `/api/status` | Status semua platform |
| GET | `/api/status/:id` | Detail platform |
| GET | `/api/packages` | Daftar paket harga |

### Protected (Butuh `X-Api-Key`)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/validate` | Validasi key + info sisa waktu |
| GET | `/api/me` | Info akun + platform akses |
| GET | `/api/platforms` | Platform yang bisa diakses |

### Admin (Butuh `X-Master-Key`)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/admin/stats` | Dashboard statistik |
| POST | `/admin/keys` | Buat API key baru |
| GET | `/admin/keys` | Daftar semua key |
| GET | `/admin/keys/:id` | Detail key |
| PATCH | `/admin/keys/:id/status` | Update status key |
| DELETE | `/admin/keys/:id` | Hapus key |
| GET | `/admin/users` | Daftar user |
| GET | `/admin/platforms` | Daftar platform |
| PATCH | `/admin/platforms/:id` | Update platform |
| GET | `/admin/transactions` | Riwayat transaksi |

---

## 📖 Contoh Penggunaan

### Cek Status Platform
```bash
curl https://api.wmxservices.store/api/status
```

### Validasi API Key
```bash
curl -H "X-Api-Key: drm_xxxxxxxxxxxx" \
  https://api.wmxservices.store/api/validate
```

### Lihat Platform yang Bisa Diakses
```bash
curl -H "X-Api-Key: drm_xxxxxxxxxxxx" \
  "https://api.wmxservices.store/api/platforms?status=active"
```

### Buat API Key (Admin)
```bash
curl -X POST https://api.wmxservices.store/admin/keys \
  -H "X-Master-Key: MASTER_KEY_KAMU" \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_id": "123456789",
    "username": "johndoe",
    "package_id": "standard"
  }'
```

---

## 🤖 Telegram Bot

Bot otomatis menangani:
- `/start` — Menu utama
- Lihat & beli paket
- Upload bukti pembayaran → notif ke admin
- Admin approve (inline button) → key otomatis terkirim
- Cek API key aktif milik user

### Perintah Admin Bot
```
/admin_approve <telegram_id> <package_id>  — Approve manual
/admin_revoke <api_key>                    — Cabut key
/admin_stats                               — Statistik
```

---

## 🗄️ Paket Default

| Paket | Harga | Durasi | Platform | Limit/Hari |
|-------|-------|--------|----------|------------|
| Starter | Rp 40.000 | 30 hari | 12 | 100K req |
| Standard ⭐ | Rp 65.000 | 35 hari | 27 | 500K req |
| Pro | Rp 79.000 | 35 hari | 32 | 700K req |
| Ultimate | Rp 129.000 | 30 hari | 37 | 900K req |

---

## 🔧 PM2 Commands

```bash
pm2 status              # Status semua proses
pm2 logs dramoo-api     # Log API server
pm2 logs dramoo-bot     # Log Telegram bot
pm2 restart all         # Restart semua
pm2 reload dramoo-api   # Reload API (zero-downtime)
pm2 monit               # Monitor real-time
```

---

## 📄 License

MIT © 2026 Dramoo
