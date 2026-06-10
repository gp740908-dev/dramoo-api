# 🕷️ Dramoo Web Scraper

Modul scraping untuk mengambil data drama dari versi web platform yang memiliki web player.

---

## Platform yang Didukung

| Platform  | URL                       | Tool       | Metode          |
|-----------|---------------------------|------------|-----------------|
| Melolo    | https://melolo.tv         | Cheerio    | HTML parsing    |
| DramaWave | https://dramawave.io      | Playwright | SPA / JS render |
| PineDrama | https://pinedrama.com     | Puppeteer  | SSR + AJAX      |
| DramaBox  | https://www.dramabox.com  | Puppeteer  | SSR + API intersep |

---

## Arsitektur

```
src/scrapers/
├── BaseScraper.js      ← Kelas dasar (launch browser, helpers, retry)
├── MeloloScraper.js    ← Cheerio: parsing HTML statis
├── DramaWaveScraper.js ← Playwright: render SPA React/Vue
├── PineDramaScraper.js ← Puppeteer: SSR + AJAX endpoint internal
├── DramaBoxScraper.js  ← Puppeteer: intersep API & network request
└── index.js            ← ScraperManager (cache, registry, paralel)

src/routes/
└── scraper.js          ← Express routes untuk endpoint /scrape/*
```

---

## API Endpoints

Semua endpoint membutuhkan header `X-Api-Key`.

### Daftar Platform
```
GET /scrape/platforms
```

### Drama Terbaru
```
GET /scrape/latest?page=1                    # semua platform (paralel)
GET /scrape/latest/:platform?page=1          # satu platform
```
Platform: `melolo` | `dramawave` | `pinedrama` | `dramabox`

### Pencarian
```
GET /scrape/search?q=judul&page=1            # semua platform
GET /scrape/search/:platform?q=judul&page=1  # satu platform
```

### Detail Drama + Daftar Episode
```
GET /scrape/detail/:platform?url=https://...
```

### URL Stream Video
```
GET /scrape/stream/:platform?url=https://...
```
> ⚠️ Endpoint ini lebih lambat (~5-15 detik) karena membuka browser headless.

### Cache Management (Admin)
```
GET    /scrape/cache          # Info cache (X-Master-Key)
DELETE /scrape/cache          # Bersihkan cache (X-Master-Key)
```

---

## Contoh Penggunaan

### 1. Ambil drama terbaru dari DramaBox
```bash
curl -H "X-Api-Key: drm_xxxx" \
  "https://api.dramoo.id/scrape/latest/dramabox?page=1"
```

Response:
```json
{
  "success": true,
  "platform": "dramabox",
  "page": 1,
  "data": [
    {
      "id": null,
      "title": "My CEO Husband",
      "thumbnail": "https://cdn.dramabox.com/cover/xxx.jpg",
      "url": "https://www.dramabox.com/drama/123",
      "description": "",
      "genre": [],
      "episodes": 60,
      "rating": 9.2,
      "views": "1.2M",
      "year": null,
      "status": null,
      "platform": "dramabox",
      "scraped_at": "2026-06-10T10:00:00.000Z"
    }
  ]
}
```

### 2. Cari drama di semua platform
```bash
curl -H "X-Api-Key: drm_xxxx" \
  "https://api.dramoo.id/scrape/search?q=CEO+husband"
```

### 3. Detail drama Melolo
```bash
curl -H "X-Api-Key: drm_xxxx" \
  "https://api.dramoo.id/scrape/detail/melolo?url=https://melolo.tv/drama/my-ceo-husband"
```

### 4. Ambil URL stream episode
```bash
curl -H "X-Api-Key: drm_xxxx" \
  "https://api.dramoo.id/scrape/stream/pinedrama?url=https://pinedrama.com/watch/my-drama/ep-1"
```

Response:
```json
{
  "success": true,
  "platform": "pinedrama",
  "episode_url": "https://...",
  "stream_urls": [
    "https://cdn.example.com/hls/drama123/ep1/index.m3u8",
    "https://embed.example.com/player/xxx"
  ],
  "primary": "https://cdn.example.com/hls/drama123/ep1/index.m3u8"
}
```

---

## Catatan Teknis

### Mengapa 3 tools berbeda?

| Tool       | Kapan digunakan                                         |
|------------|---------------------------------------------------------|
| **Cheerio**    | Situs dengan HTML statis / SSR — cepat, ringan      |
| **Playwright** | SPA (React/Vue) yang butuh JS render penuh          |
| **Puppeteer**  | Situs hybrid + perlu intersep network request       |

### Cache
- Semua hasil scraping di-cache **10 menit** di memory
- Endpoint `/scrape/stream/` **tidak di-cache** (URL video kedaluwarsa)
- Admin bisa clear cache via `DELETE /scrape/cache`

### Retry & Error Handling
- Setiap scraper otomatis **retry 2x** jika gagal
- Timeout default: **20 detik** per request
- Error dikembalikan dalam format JSON konsisten

### Menambah Platform Baru

1. Buat file `src/scrapers/NamaPlatformScraper.js` extends `BaseScraper`
2. Implementasi: `getLatest()`, `search()`, `getDetail()`, `getStreamUrl()`
3. Daftarkan di `src/scrapers/index.js`:
   ```js
   const NamaScraper = require('./NamaPlatformScraper');
   const SCRAPERS = {
     // ... existing
     namaplatform: () => new NamaScraper(),
   };
   ```
4. Tambahkan ke `validatePlatform` di `src/routes/scraper.js`

---

## Install di VPS

Dependencies tambahan yang dibutuhkan (otomatis diinstall via `setup.sh`):

```bash
# Sistem dependencies untuk headless Chrome
apt-get install -y libnss3 libxss1 libasound2 libatk-bridge2.0-0 \
  libgtk-3-0 libgbm1 libxshmfence1 libdrm2 fonts-liberation

# Playwright Chromium
npx playwright install chromium

# Puppeteer bundled Chromium (otomatis saat npm install)
npm install puppeteer
```

---

## Troubleshooting

**Browser tidak bisa launch:**
```bash
# Cek dependency sistem
npx puppeteer browsers install chrome
npx playwright install chromium --with-deps
```

**Scraping gagal / data kosong:**
- Cek apakah website target mengubah struktur HTML
- Tambahkan `headless: false` saat development untuk debug visual
- Periksa log: `pm2 logs dramoo-api | grep Scraper`

**Timeout:**
- Naikkan `timeout` di constructor scraper (default 20000ms)
- Pastikan VPS punya koneksi ke internet dan domain target tidak diblokir
