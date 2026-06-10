// src/scrapers/MeloloScraper.js
// Scraper untuk melolo.tv — menggunakan Cheerio (HTML parsing ringan)
// Melolo punya web player dengan struktur HTML yang cukup statis

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');

class MeloloScraper extends BaseScraper {
  constructor(options = {}) {
    super('melolo', 'https://melolo.tv', options);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': this.baseUrl,
      },
    });
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  async _fetchHtml(path) {
    const res = await this.http.get(path);
    return cheerio.load(res.data);
  }

  _parseDramaCard($, el) {
    const $el    = $(el);
    const anchor = $el.find('a').first();
    const img    = $el.find('img').first();
    const title  = $el.find('.title, h3, h2, .name').first().text();
    const ep     = $el.find('.episode, .ep, .eps').first().text();
    const rating = $el.find('.rating, .score').first().text();

    return this.formatDrama({
      title:     title || img.attr('alt') || '',
      thumbnail: this.toAbsoluteUrl(img.attr('data-src') || img.attr('src')),
      url:       this.toAbsoluteUrl(anchor.attr('href')),
      episodes:  ep ? parseInt(ep.replace(/\D/g, '')) || null : null,
      rating:    rating ? parseFloat(rating) || null : null,
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Ambil drama terbaru
   * @param {number} page - Halaman (1-based)
   */
  async getLatest(page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/drama?page=${page}`);

      const items = [];
      // Selector umum untuk grid card di Melolo
      $('article, .drama-card, .item, .movie-item, [class*="card"]').each((_, el) => {
        const drama = this._parseDramaCard($, el);
        if (drama.title && drama.url) items.push(drama);
      });

      // Fallback: coba selector berbeda
      if (items.length === 0) {
        $('a[href*="/drama/"], a[href*="/series/"]').each((_, el) => {
          const $el = $(el);
          const img = $el.find('img').first();
          if (!img.length) return;
          items.push(this.formatDrama({
            title:     this.cleanText($el.text()) || img.attr('alt') || '',
            thumbnail: this.toAbsoluteUrl(img.attr('data-src') || img.attr('src')),
            url:       this.toAbsoluteUrl($el.attr('href')),
          }));
        });
      }

      const totalText = $('.pagination .total, .total-drama').first().text();
      const total     = parseInt(totalText.replace(/\D/g, '')) || null;

      return {
        success:  true,
        platform: this.platformId,
        page,
        total,
        data: items,
      };
    }, 'getLatest');
  }

  /**
   * Cari drama
   * @param {string} query
   * @param {number} page
   */
  async search(query, page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/search?q=${encodeURIComponent(query)}&page=${page}`);

      const items = [];
      $('article, .drama-card, .item, .search-result-item').each((_, el) => {
        const drama = this._parseDramaCard($, el);
        if (drama.title && drama.url) items.push(drama);
      });

      return {
        success:  true,
        platform: this.platformId,
        query,
        page,
        data: items,
      };
    }, 'search');
  }

  /**
   * Detail drama + daftar episode
   * @param {string} dramaUrl - URL lengkap atau path
   */
  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const path = dramaUrl.startsWith('http')
        ? new URL(dramaUrl).pathname + new URL(dramaUrl).search
        : dramaUrl;

      const $ = await this._fetchHtml(path);

      // Meta info
      const title       = this.cleanText($('h1, .drama-title, .title').first().text());
      const thumbnail   = this.toAbsoluteUrl(
        $('meta[property="og:image"]').attr('content') ||
        $('.poster img, .cover img, .thumb img').first().attr('src')
      );
      const description = this.cleanText(
        $('meta[property="og:description"]').attr('content') ||
        $('.synopsis, .description, .plot').first().text()
      );

      // Genre
      const genre = [];
      $('.genre a, .genres a, [class*="genre"] a').each((_, el) => {
        const g = this.cleanText($(el).text());
        if (g) genre.push(g);
      });

      // Rating
      const ratingText = $('.rating-value, .score, .imdb-score').first().text();
      const rating     = parseFloat(ratingText) || null;

      // Episode list
      const episodes = [];
      $('.episode-list a, .ep-list a, [class*="episode"] a').each((idx, el) => {
        const $el   = $(el);
        const epUrl = this.toAbsoluteUrl($el.attr('href'));
        const epNum = $el.text().replace(/\D/g, '') || String(idx + 1);
        if (epUrl) {
          episodes.push({ episode: parseInt(epNum), url: epUrl });
        }
      });

      return {
        success:  true,
        platform: this.platformId,
        drama: this.formatDrama({
          title, thumbnail, description, genre, rating,
          url:      this.toAbsoluteUrl(dramaUrl),
          episodes: episodes.length || null,
          status:   episodes.length > 0 ? 'ongoing' : null,
        }),
        episode_list: episodes.sort((a, b) => a.episode - b.episode),
      };
    }, 'getDetail');
  }

  /**
   * Ambil URL stream/embed untuk 1 episode
   * @param {string} episodeUrl
   */
  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const page = await this.newPage();
      try {
        const streamUrls = [];

        // Tangkap request ke CDN/video
        page.on('request', req => {
          const url = req.url();
          if (/\.(m3u8|mp4|webm)/.test(url) || /stream|video|cdn|player/i.test(url)) {
            streamUrls.push(url);
          }
        });

        await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
        await page.waitForSelector('video, iframe[src*="player"], .player', { timeout: 8000 }).catch(() => {});
        await this._sleep(3000);

        // Coba ambil dari tag <video>
        const videoSrc = await page.evaluate(() => {
          const v = document.querySelector('video source, video');
          return v ? (v.src || v.getAttribute('src')) : null;
        });

        // Coba ambil dari iframe embed
        const iframeSrc = await page.evaluate(() => {
          const f = document.querySelector('iframe[src*="player"], iframe[src*="embed"], iframe[src*="stream"]');
          return f ? f.src : null;
        });

        const sources = [...new Set([videoSrc, iframeSrc, ...streamUrls].filter(Boolean))];

        return {
          success:  true,
          platform: this.platformId,
          episode_url: episodeUrl,
          stream_urls: sources,
          primary:     sources[0] || null,
        };
      } finally {
        await page.close();
      }
    }, 'getStreamUrl');
  }
}

module.exports = MeloloScraper;
