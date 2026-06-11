// src/scrapers/index.js
// Manager terpusat untuk semua platform scraper
// Daftarkan scraper baru di sini — routes & cache otomatis akan menggunakannya

const MeloloScraper    = require('./MeloloScraper');
const DramaWaveScraper = require('./DramaWaveScraper');
const PineDramaScraper = require('./PineDramaScraper');
const DramaBoxScraper  = require('./DramaBoxScraper');

const NetShortScraper  = require('./NetShortScraper');
const KlikFilmScraper  = require('./KlikFilmScraper');
const ReelShortScraper = require('./ReelShortScraper');
const ShortMaxScraper  = require('./ShortMaxScraper');

// ─── Registry ────────────────────────────────────────────────────────────────

const SCRAPERS = {
  melolo:    () => new MeloloScraper(),
  dramawave: () => new DramaWaveScraper(),
  pinedrama: () => new PineDramaScraper(),
  dramabox:  () => new DramaBoxScraper(),
  netshort:  () => new NetShortScraper(),
  klikfilm:  () => new KlikFilmScraper(),
  reelshort: () => new ReelShortScraper(),
  shortmax:  () => new ShortMaxScraper(),
};

const PLATFORM_INFO = {
  melolo:    { name: 'Melolo',    url: 'https://melolo.tv',        tool: 'cheerio' },
  dramawave: { name: 'DramaWave', url: 'https://dramawave.io',     tool: 'playwright' },
  pinedrama: { name: 'PineDrama', url: 'https://pinedrama.com',    tool: 'puppeteer' },
  dramabox:  { name: 'DramaBox',  url: 'https://www.dramabox.com', tool: 'puppeteer' },
  netshort:  { name: 'NetShort',  url: 'https://netshort.com',     tool: 'puppeteer' },
  klikfilm:  { name: 'KlikFilm',  url: 'https://klikfilm.com',     tool: 'puppeteer' },
  reelshort: { name: 'ReelShort', url: 'https://www.reelshort.com',tool: 'playwright' },
  shortmax:  { name: 'ShortMax',  url: 'https://www.shorttv.live', tool: 'puppeteer' },
};

// ─── Cache sederhana in-memory (TTL 10 menit) ────────────────────────────────

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 menit

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  // Batasi ukuran cache
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ─── ScraperManager ──────────────────────────────────────────────────────────

class ScraperManager {
  /**
   * Daftar platform yang tersedia
   */
  listPlatforms() {
    return Object.entries(PLATFORM_INFO).map(([id, info]) => ({
      id,
      ...info,
      available: true,
    }));
  }

  /**
   * Ambil instance scraper untuk platform tertentu
   * @param {string} platformId
   */
  getScraper(platformId) {
    const factory = SCRAPERS[platformId];
    if (!factory) throw new Error(`Platform '${platformId}' tidak tersedia. Pilihan: ${Object.keys(SCRAPERS).join(', ')}`);
    return factory();
  }

  /**
   * Ambil drama terbaru dari satu platform
   * @param {string} platformId
   * @param {number} page
   * @param {boolean} useCache
   */
  async getLatest(platformId, page = 1, useCache = true) {
    const cacheKey = `latest:${platformId}:${page}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.getLatest(page);
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Cari drama di satu platform
   */
  async search(platformId, query, page = 1, useCache = true) {
    const cacheKey = `search:${platformId}:${query}:${page}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.search(query, page);
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Detail satu drama
   */
  async getDetail(platformId, dramaUrl, useCache = true) {
    const cacheKey = `detail:${platformId}:${dramaUrl}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.getDetail(dramaUrl);
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * URL stream episode
   * (Tidak di-cache karena URL stream biasanya bertanda waktu / kedaluwarsa)
   */
  async getStreamUrl(platformId, episodeUrl) {
    const scraper = this.getScraper(platformId);
    try {
      return await scraper.getStreamUrl(episodeUrl);
    } finally {
      await scraper.closeBrowser?.();
    }
  }

  /**
   * Cari berdasarkan kategori / genre
   */
  async getCategory(platformId, categoryId, page = 1, lang = 'id', useCache = true) {
    const cacheKey = `category:${platformId}:${categoryId || 'all'}:${page}:${lang}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.getCategory(categoryId, page, lang);
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Ambil trending drama
   */
  async getTrending(platformId, page = 1, cursor = null, lang = 'id', useCache = true) {
    const cacheKey = `trending:${platformId}:${page}:${cursor || 'start'}:${lang}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.getTrending(page, cursor, lang);
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Ambil daftar bahasa yang didukung
   */
  async getLanguages(platformId, useCache = true) {
    const cacheKey = `languages:${platformId}`;
    if (useCache) {
      const cached = cacheGet(cacheKey);
      if (cached) return { ...cached, from_cache: true };
    }

    const scraper = this.getScraper(platformId);
    let result;
    try {
      result = await scraper.getLanguages();
    } finally {
      await scraper.closeBrowser?.();
    }

    if (useCache && result.success) cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Cari dari semua platform secara paralel
   */
  async searchAll(query, page = 1) {
    const platformIds = Object.keys(SCRAPERS);
    const results = await Promise.allSettled(
      platformIds.map(id => this.search(id, query, page))
    );

    const combined = [];
    const errors   = [];

    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value.success) {
        combined.push(...res.value.data.map(d => ({ ...d, platform: platformIds[i] })));
      } else {
        errors.push({ platform: platformIds[i], error: res.reason?.message || 'Unknown error' });
      }
    });

    return {
      success:  true,
      query,
      page,
      total:    combined.length,
      data:     combined,
      errors:   errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Ambil latest dari semua platform secara paralel
   */
  async getLatestAll(page = 1) {
    const platformIds = Object.keys(SCRAPERS);
    const results = await Promise.allSettled(
      platformIds.map(id => this.getLatest(id, page))
    );

    const byPlatform = {};
    const errors     = [];

    results.forEach((res, i) => {
      const id = platformIds[i];
      if (res.status === 'fulfilled' && res.value.success) {
        byPlatform[id] = res.value.data;
      } else {
        byPlatform[id] = [];
        errors.push({ platform: id, error: res.reason?.message || 'Unknown error' });
      }
    });

    return {
      success:     true,
      page,
      by_platform: byPlatform,
      errors:      errors.length > 0 ? errors : undefined,
    };
  }

  /** Bersihkan seluruh cache */
  clearCache() {
    const size = cache.size;
    cache.clear();
    return size;
  }

  /** Info cache saat ini */
  cacheInfo() {
    return { size: cache.size, max: 500, ttl_minutes: CACHE_TTL / 60000 };
  }
}

module.exports = new ScraperManager();
