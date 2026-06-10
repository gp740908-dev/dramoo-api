// src/scrapers/BaseScraper.js
// Kelas dasar yang diwarisi oleh semua platform scraper

const puppeteer = require('puppeteer');

class BaseScraper {
  constructor(platformId, baseUrl, options = {}) {
    this.platformId   = platformId;
    this.baseUrl      = baseUrl;
    this.timeout      = options.timeout      || 20000;
    this.retries      = options.retries      || 2;
    this.headless     = options.headless     !== false;   // default: true
    this.userAgent    = options.userAgent    || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    this.browser      = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async launchBrowser() {
    if (this.browser) return this.browser;
    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async newPage() {
    const browser = await this.launchBrowser();
    const page    = await browser.newPage();

    // Sembunyikan tanda automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent(this.userAgent);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9,id;q=0.8' });
    page.setDefaultTimeout(this.timeout);
    return page;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Retry wrapper — coba ulang hingga `this.retries` kali jika gagal */
  async withRetry(fn, label = 'task') {
    let lastErr;
    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        console.warn(`[${this.platformId}] ${label} attempt ${attempt} failed: ${err.message}`);
        if (attempt <= this.retries) await this._sleep(1500 * attempt);
      }
    }
    throw lastErr;
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Bersihkan teks (hapus whitespace berlebih) */
  cleanText(str = '') {
    return str.replace(/\s+/g, ' ').trim();
  }

  /** Ubah URL relatif menjadi absolut */
  toAbsoluteUrl(url = '') {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//'))   return 'https:' + url;
    return this.baseUrl.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
  }

  /** Format output drama yang konsisten lintas platform */
  formatDrama(raw = {}) {
    const url = raw.url || null;
    let id = raw.id;
    if (!id && url) {
      id = Buffer.from(url).toString('base64url');
    }

    return {
      id:          id,
      title:       this.cleanText(raw.title || ''),
      thumbnail:   raw.thumbnail   || null,
      url:         url,
      description: this.cleanText(raw.description || ''),
      genre:       Array.isArray(raw.genre)    ? raw.genre    : (raw.genre ? [raw.genre] : []),
      episodes:    raw.episodes    || null,
      rating:      raw.rating      || null,
      views:       raw.views       || null,
      year:        raw.year        || null,
      status:      raw.status      || null,   // 'ongoing' | 'completed'
      platform:    this.platformId,
      scraped_at:  new Date().toISOString(),
    };
  }

  // ─── Abstract methods (override di subclass) ──────────────────────────────

  /** Ambil daftar drama terbaru / trending */
  async getLatest(_page = 1)   { throw new Error(`${this.platformId}: getLatest() not implemented`); }

  /** Cari drama berdasarkan keyword */
  async search(_query, _page = 1) { throw new Error(`${this.platformId}: search() not implemented`); }

  /** Detail satu drama (episode list, info lengkap) */
  async getDetail(_url) { throw new Error(`${this.platformId}: getDetail() not implemented`); }

  /** URL stream / embed video untuk satu episode */
  async getStreamUrl(_episodeUrl) { throw new Error(`${this.platformId}: getStreamUrl() not implemented`); }

  /** Ambil kategori drama */
  async getCategory(_categoryId, _page = 1, _lang = 'id') { throw new Error(`${this.platformId}: getCategory() not implemented`); }

  /** Ambil trending drama */
  async getTrending(_page = 1, _cursor = null, _lang = 'id') { throw new Error(`${this.platformId}: getTrending() not implemented`); }

  /** Ambil daftar bahasa */
  async getLanguages() { throw new Error(`${this.platformId}: getLanguages() not implemented`); }
}

module.exports = BaseScraper;
