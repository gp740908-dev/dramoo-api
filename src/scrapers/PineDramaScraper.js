// src/scrapers/PineDramaScraper.js
// Scraper untuk pinedrama.com — menggunakan Puppeteer
// PineDrama punya halaman yang di-render server (SSR) tapi player video dinamis

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');

class PineDramaScraper extends BaseScraper {
  constructor(options = {}) {
    super('pinedrama', 'https://pinedrama.com/id', options);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent':      this.userAgent,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         this.baseUrl,
      },
      maxRedirects: 5,
    });
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  async _fetchHtml(path) {
    const res = await this.http.get(path);
    return cheerio.load(res.data);
  }

  _parseDramaItem($, el) {
    const $el = $(el);

    // PineDrama: .film-poster > a > img + .film-detail
    const anchor    = $el.is('a') ? $el : $el.find('a').first();
    const img       = $el.find('img').first();
    const titleEl   = $el.find('[class*="title"], [class*="text-Title"]').first();
    const epEl      = $el.find('[class*="episode"]').first();
    const ratingEl  = $el.find('[class*="rating"]').first();

    const title     = this.cleanText(titleEl.text() || img.attr('alt') || anchor.attr('title') || anchor.text() || '');
    const url       = this.toAbsoluteUrl(anchor.attr('href'));
    const thumbnail = this.toAbsoluteUrl(
      img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src')
    );
    const episodes  = epEl.length ? parseInt(epEl.text().replace(/\D/g, '')) || null : null;
    const rating    = ratingEl.length ? parseFloat(ratingEl.text()) || null : null;

    return { title, url, thumbnail, episodes, rating };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      // PineDrama usually uses /dramas or root for latest.
      const paths = [`/`, `/recently-added/page/${page}/`, `/drama/page/${page}/`];
      let $;

      for (const p of paths) {
        try {
          $ = await this._fetchHtml(p);
          const count = $('a[href*="/dramas/"]').length;
          if (count > 0) break;
        } catch { /* coba path lain */ }
      }

      if (!$) throw new Error('Semua path gagal untuk getLatest');

      const items = [];
      $('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/')) items.push(this.formatDrama(d));
      });

      // Hapus duplikat berdasarkan URL
      const uniqueItems = Array.from(new Map(items.map(item => [item.url, item])).values());

      return {
        success:    true,
        platform:   this.platformId,
        page,
        data:       uniqueItems,
      };
    }, 'getLatest');
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/id/search?q=${encodeURIComponent(query)}`);

      const items = [];
      $('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/')) items.push(this.formatDrama(d));
      });

      const uniqueItems = Array.from(new Map(items.map(item => [item.url, item])).values());
      return { success: true, page, platform: this.platformId, data: uniqueItems };
    });
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      // Selalu gunakan dramaUrl lengkap untuk menghindari isu baseURL axios
      const urlToFetch = dramaUrl.startsWith('http') ? dramaUrl : this.baseUrl + dramaUrl;
      const $ = await this._fetchHtml(urlToFetch);

      // Meta
      const title       = this.cleanText($('h1, h2, [class*="title"]').first().text());
      const thumbnail   = this.toAbsoluteUrl(
        $('meta[property="og:image"]').attr('content') ||
        $('img.film-poster-img, .dp-i-c-poster img, .poster img').first().attr('src')
      );
      const description = this.cleanText(
        $('meta[property="og:description"]').attr('content') ||
        $('.dp-i-p, .film-description, .description').first().text()
      );

      // Genre
      const genre = [];
      $('.item-list a[href*="genre"], .film-info a[href*="genre"], .genres a').each((_, el) => {
        const g = this.cleanText($(el).text());
        if (g) genre.push(g);
      });

      // Info tambahan (tahun, status)
      const year   = parseInt($('.item-list:contains("Year"), .film-info:contains("Year")').text().match(/\d{4}/)?.[0]) || null;
      const statusText = this.cleanText($('.item-list:contains("Status"), [class*="status"]').text());
      const status = /complet/i.test(statusText) ? 'completed' : /ongoing|air/i.test(statusText) ? 'ongoing' : null;

      // Rating
      const ratingText = $('.film-rating strong, .film-stats .score').first().text();
      const rating     = parseFloat(ratingText) || null;

      // Daftar episode — PineDrama punya div#episodes-content yang di-load via AJAX
      // Coba ambil dari HTML statis dulu
      // Episode list
      const episodes = [];
      const seasonsId = $('[data-id]').first().attr('data-id') || '';
      $('a[href*="/ep"], div:contains("EP")').each((idx, el) => {
        const $el   = $(el);
        const text  = $el.text();
        // Cek kalau ini adalah item episode yang valid
        if (/EP\s*\d+/i.test(text) || $el.attr('href')?.includes('/ep')) {
            const epUrl = $el.is('a') ? this.toAbsoluteUrl($el.attr('href')) : null;
            const epNum = text.replace(/\D/g, '') || String(idx + 1);
            episodes.push({ episode: parseInt(epNum), url: epUrl, title: this.cleanText($el.text()) });
        }
      });

      // Jika episode tidak ada di HTML statis, ambil via API internal PineDrama
      if (episodes.length === 0 && seasonsId) {
        try {
          const ajaxRes = await this.http.get(`/ajax/v2/episode/list/${seasonsId}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': this.baseUrl + path },
          });
          const $ep = cheerio.load(ajaxRes.data?.html || '');
          $ep('a').each((idx, el) => {
            const $el = $ep(el);
            const u   = this.toAbsoluteUrl($el.attr('href'));
            if (u) episodes.push({ episode: idx + 1, url: u, title: this.cleanText($el.text()) });
          });
        } catch { /* AJAX tidak tersedia */ }
      }

      return {
        success:  true,
        platform: this.platformId,
        drama: this.formatDrama({
          title, thumbnail, description, genre, rating, year, status,
          url:      this.toAbsoluteUrl(dramaUrl),
          episodes: episodes.length || null,
        }),
        episode_list: episodes.sort((a, b) => a.episode - b.episode),
      };
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const page = await this.newPage();
      try {
        const streamUrls = [];
        page.on('request', req => {
          const url = req.url();
          if (/\.(m3u8|mp4|webm)/.test(url) || /stream|embed|player|cdn/i.test(url)) {
            streamUrls.push(url);
          }
        });

        await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: this.timeout });

        // PineDrama: klik server button jika ada pilihan server
        await page.evaluate(() => {
          const btn = document.querySelector('.srv-item, [data-type="server"], .server-item');
          if (btn) btn.click();
        });

        await this._sleep(3000);

        // Coba ambil URL dari iframe
        const iframeSrc = await page.evaluate(() => {
          const f = document.querySelector('iframe#iframe-embed, iframe[name="load_episode"], iframe[src*="player"]');
          return f ? f.src : null;
        });

        const videoSrc = await page.evaluate(() => {
          const v = document.querySelector('video source, video, .videourl');
          return v ? (v.src || v.getAttribute('src') || v.getAttribute('data-src') || v.href) : null;
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
        await page.close();
      }
    }, 'getStreamUrl');
  }

  // ─── Fitur Tambahan (Category, Trending, Languages) ─────────────────────

  async getCategory(categoryId, page = 1, lang = 'id') {
    return this.withRetry(async () => {
      // Jika categoryId kosong, kembalikan daftar genre
      if (!categoryId) {
        const paths = [`/${lang}/genres`, `/genres`, `/`];
        let $;
        for (const p of paths) {
          try { $ = await this._fetchHtml(p); break; } catch (e) {}
        }
        if (!$) throw new Error('Gagal memuat kategori PineDrama');

        const categories = [];
        $('a[href*="/genres/"]').each((_, el) => {
          const name = this.cleanText($(el).text());
          const url = $(el).attr('href');
          const id = url.split('/').pop();
          if (name && id) categories.push({ id, name, url: this.toAbsoluteUrl(url) });
        });
        
        const uniqueCat = Array.from(new Map(categories.map(item => [item.id, item])).values());
        return { success: true, platform: this.platformId, categories: uniqueCat };
      }

      // Jika ada categoryId, scrape halaman kategori tersebut
      const path = `/${lang}/genres/${categoryId}?page=${page}`;
      const $ = await this._fetchHtml(path).catch(() => null);
      if (!$) return { success: true, page, platform: this.platformId, data: [] };

      const items = [];
      $('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/')) items.push(this.formatDrama(d));
      });
      return { success: true, page, platform: this.platformId, data: items };
    });
  }

  async getTrending(page = 1, cursor = null, lang = 'id') {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/${lang}`);
      const items = [];
      
      // Coba cari bagian Tren / Trending di homepage
      const trendingTitle = $('h3').filter((_, el) => /tren|trending/i.test($(el).text()));
      const container = trendingTitle.length ? trendingTitle.parent().parent() : $.root();

      container.find('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/')) items.push(this.formatDrama(d));
      });

      // Hapus duplikat
      const uniqueItems = Array.from(new Map(items.map(item => [item.url, item])).values());
      return { success: true, page, platform: this.platformId, data: uniqueItems };
    });
  }

  async getLanguages() {
    return {
      success: true,
      platform: this.platformId,
      languages: [
        { code: 'id', name: 'Bahasa Indonesia' },
        { code: 'en', name: 'English' }
      ]
    };
  }
}

module.exports = PineDramaScraper;
