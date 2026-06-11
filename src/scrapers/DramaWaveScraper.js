// src/scrapers/DramaWaveScraper.js
// Scraper untuk dramawave.io — menggunakan Playwright
// DramaWave adalah SPA (React/Vue), butuh render JS penuh

const { chromium } = require('playwright');
const BaseScraper  = require('./BaseScraper');

class DramaWaveScraper extends BaseScraper {
  constructor(options = {}) {
    super('dramawave', 'https://dramawave.dramaflixs.com', options);
    this._browser = null;
  }

  // ─── Playwright browser ──────────────────────────────────────────────────

  async _getBrowser() {
    if (this._browser) return this._browser;
    this._browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this._browser;
  }

  async _newPage() {
    const browser = await this._getBrowser();
    const ctx     = await browser.newContext({
      userAgent: this.userAgent,
      viewport:  { width: 1280, height: 800 },
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const page = await ctx.newPage();
    // Blokir resource berat yang tidak perlu
    await page.route('**/*.{woff2,woff,ttf,svg,ico}', r => r.abort());
    await page.route('**/ads/**', r => r.abort());
    return { page, ctx };
  }

  async _closePage(ctx) {
    await ctx.close();
  }

  async closeAll() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
    }
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /** Tunggu sampai konten drama muncul (SPA perlu waktu hydrate) */
  async _waitForContent(page, selectors = []) {
    const defaults = [
      '.drama-card', '[class*="DramaCard"]', '[class*="drama-item"]',
      '[class*="MovieCard"]', '.movie-card', 'article',
    ];
    const all = [...selectors, ...defaults];
    for (const sel of all) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        return sel; // kembalikan selector yang berhasil
      } catch { /* coba berikutnya */ }
    }
    return null;
  }

  /** Scroll halaman agar lazy-load terpicu */
  async _autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let total = 0;
        const step = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          total += step;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
      });
    });
  }

  /** Ekstrak semua drama card dari halaman yang sudah ter-render */
  async _extractCards(page) {
    return page.evaluate(() => {
      // DramaWave menggunakan class dinamis — cari elemen yang memiliki link + gambar + judul
      const cards = [];
      const anchors = [...document.querySelectorAll('a[href]')].filter(a => {
        const href = a.getAttribute('href') || '';
        return /\/(drama|series|show|watch|playlet)\//i.test(href) &&
          (a.querySelector('img') || a.querySelector('[class*="title"]'));
      });

      for (const anchor of anchors) {
        const img      = anchor.querySelector('img');
        const titleEl  = anchor.querySelector('[class*="title"], [class*="name"], h2, h3, p');
        const ratingEl = anchor.querySelector('[class*="rating"], [class*="score"]');
        const epEl     = anchor.querySelector('[class*="ep"], [class*="episode"]');

        cards.push({
          title:     (titleEl?.textContent || img?.alt || '').trim(),
          thumbnail: img?.src || img?.dataset?.src || null,
          url:       anchor.href,
          rating:    ratingEl ? parseFloat(ratingEl.textContent) || null : null,
          episodes:  epEl ? parseInt(epEl.textContent.replace(/\D/g, '')) || null : null,
        });
      }

      // Deduplicate by URL
      const seen = new Set();
      return cards.filter(c => {
        if (!c.url || !c.title || seen.has(c.url)) return false;
        seen.add(c.url);
        return true;
      });
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getLatest(page = 1) {
    try {
      const axios = require('axios');
      const apiUrl = `https://dramawave.dramaflixs.com/api/dramawave/v2/en/home?next=${page}&position_index=10000&tab_key=678`;
      const response = await axios.get(apiUrl, {
        headers: { 'x-api-key': '5MwPu5YD9iauUUpyztW5DVvBrj7btX6a' }
      });
      
      const items = response.data.items || [];
      const cards = items.filter(item => item.playlet_id).map(item => this.formatDrama({
        id: item.playlet_id,
        title: item.title,
        cover: item.cover,
        thumbnail: item.cover,
        url: `${this.baseUrl}/playlet/${item.playlet_id}`,
      }));
      
      return { success: true, platform: this.platformId, page, data: cards };
    } catch (error) {
      console.error(`[${this.platformId}] getLatest attempt failed: ${error.message}`);
      return { success: false, platform: this.platformId, page, data: [], error: error.message };
    }
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      const { page: pw, ctx } = await this._newPage();
      try {
        await pw.goto(
          `${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`,
          { waitUntil: 'domcontentloaded', timeout: this.timeout }
        );
        await this._waitForContent(pw);
        await this._sleep(2000);

        const raw   = await this._extractCards(pw);
        const items = raw.map(r => this.formatDrama(r));

        return { success: true, platform: this.platformId, query, page, data: items };
      } finally {
        await this._closePage(ctx);
      }
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const { page: pw, ctx } = await this._newPage();
      try {
        const fullUrl = dramaUrl.startsWith('http') ? dramaUrl : this.baseUrl + dramaUrl;
        await pw.goto(fullUrl, { waitUntil: 'networkidle', timeout: this.timeout });
        await this._sleep(2000);

        await pw.evaluate(async () => {
          let lastCount = 0;
          let retries = 0;
          while (retries < 5) {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const moreBtn = btns.find(b => b.innerText && b.innerText.match(/more|lainnya|selengkapnya/i));
            if (moreBtn) moreBtn.click();
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 1000));
            const count = document.querySelectorAll('[class*="episode"] a, [class*="ep-item"] a, .episode-list a').length;
            if (count === lastCount) {
              retries++;
            } else {
              lastCount = count;
              retries = 0;
            }
          }
        });

        const info = await pw.evaluate(() => {
          const title       = document.querySelector('h1, [class*="title"]')?.textContent?.trim() || '';
          const description = document.querySelector('[class*="synopsis"], [class*="description"], [class*="plot"]')?.textContent?.trim() || '';
          const thumbnail   = document.querySelector('meta[property="og:image"]')?.content ||
                              document.querySelector('[class*="poster"] img, [class*="cover"] img')?.src || null;
          const ratingEl    = document.querySelector('[class*="rating"], [class*="score"]');
          const rating      = ratingEl ? parseFloat(ratingEl.textContent) || null : null;

          // Genre
          const genre = [...document.querySelectorAll('[class*="genre"] a, [class*="tag"] a')]
            .map(el => el.textContent.trim()).filter(Boolean);

          // Episode list
          const episodes = [...document.querySelectorAll('[class*="episode"] a, [class*="ep-item"] a, .episode-list a')]
            .map((el, idx) => ({
              episode: parseInt(el.textContent.replace(/\D/g, '')) || idx + 1,
              url:     el.href,
              title:   el.textContent.trim(),
            }))
            .filter(e => e.url);

          return { title, description, thumbnail, rating, genre, episodes };
        });

        return {
          success:  true,
          platform: this.platformId,
          drama: this.formatDrama({
            ...info,
            url:      fullUrl,
            episodes: info.episodes.length || null,
            status:   info.episodes.length > 0 ? 'ongoing' : null,
          }),
          episode_list: info.episodes.sort((a, b) => a.episode - b.episode),
        };
      } finally {
        await this._closePage(ctx);
      }
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const { page: pw, ctx } = await this._newPage();
      const streamUrls        = [];

      try {
        // Intersep semua request network
        pw.on('request', req => {
          const url  = req.url();
          const type = req.resourceType();
          if (type === 'media' || /\.(m3u8|mp4|webm)(\?|$)/.test(url) || /stream|hls|cdn/i.test(url)) {
            streamUrls.push(url);
          }
        });

        const fullUrl = episodeUrl.startsWith('http') ? episodeUrl : this.baseUrl + episodeUrl;
        await pw.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout });

        // Klik tombol play jika ada
        try {
          await pw.click('.play-btn, [class*="play-button"], [aria-label="Play"], button[class*="play"]');
        } catch { /* tidak ada tombol play */ }

        await this._sleep(4000);

        // Ambil src dari tag <video>
        const videoSrc = await pw.evaluate(() => {
          const v = document.querySelector('video');
          if (!v) return null;
          return v.src || v.querySelector('source')?.src || null;
        });

        // Ambil iframe embed
        const iframeSrc = await pw.evaluate(() => {
          const f = document.querySelector('iframe[src*="player"], iframe[src*="embed"]');
          return f ? f.src : null;
        });

        const sources = [...new Set([videoSrc, iframeSrc, ...streamUrls].filter(Boolean))];

        return {
          success:     true,
          platform:    this.platformId,
          episode_url: episodeUrl,
          stream_urls: sources,
          primary:     sources[0] || null,
        };
      } finally {
        await this._closePage(ctx);
      }
    }, 'getStreamUrl');
  }
}

module.exports = DramaWaveScraper;
