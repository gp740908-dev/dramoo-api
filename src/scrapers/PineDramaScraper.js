// src/scrapers/PineDramaScraper.js
// Scraper untuk pinedrama.com — menggunakan Puppeteer
// PineDrama punya halaman yang di-render server (SSR) tapi player video dinamis

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');

class PineDramaScraper extends BaseScraper {
  constructor(options = {}) {
    super('pinedrama', 'https://pinedrama.com', options);

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
    const titleEl   = $el.find('.film-name, .title, h3, h2').first();
    const epEl      = $el.find('.fdi-item, .episode, .eps').first();
    const ratingEl  = $el.find('.film-rate, .rating').first();

    const title     = this.cleanText(titleEl.text() || img.attr('alt') || anchor.attr('title') || '');
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
      // PineDrama biasanya: /drama/ atau /recently-added/?page=N
      const paths = [`/recently-added/page/${page}/`, `/drama/page/${page}/`, `/recently-added/?page=${page}`];
      let $;

      for (const p of paths) {
        try {
          $ = await this._fetchHtml(p);
          const count = $('.film-poster, .flw-item, .item, article').length;
          if (count > 0) break;
        } catch { /* coba path lain */ }
      }

      if (!$) throw new Error('Semua path gagal untuk getLatest');

      const items = [];
      $('.film-poster, .flw-item, .item, article, [class*="drama-item"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url) items.push(this.formatDrama(d));
      });

      // Ambil total dari pagination
      const lastPage = parseInt(
        $('.page-link:last, .pagination a:last, .wp-pagenavi a:last').attr('href')?.match(/page\/(\d+)/)?.[1]
      ) || null;

      return {
        success:    true,
        platform:   this.platformId,
        page,
        last_page:  lastPage,
        data:       items,
      };
    }, 'getLatest');
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/?s=${encodeURIComponent(query)}&page=${page}`);

      const items = [];
      $('.film-poster, .flw-item, .item, article, .search-result').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url) items.push(this.formatDrama(d));
      });

      // Coba juga hasil dalam format list
      if (items.length === 0) {
        $('a[href*="/drama/"], a[href*="/series/"]').each((_, el) => {
          const $el = $(el);
          const img = $el.find('img');
          if (!img.length) return;
          items.push(this.formatDrama({
            title:     this.cleanText($el.text() || img.attr('alt') || ''),
            url:       this.toAbsoluteUrl($el.attr('href')),
            thumbnail: this.toAbsoluteUrl(img.attr('data-src') || img.attr('src')),
          }));
        });
      }

      return { success: true, platform: this.platformId, query, page, data: items };
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const path = dramaUrl.startsWith('http')
        ? new URL(dramaUrl).pathname
        : dramaUrl;

      const $ = await this._fetchHtml(path);

      // Meta
      const title       = this.cleanText($('h1.heading-name, h1, .film-name').first().text());
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
      const episodes  = [];
      const seasonsId = $('[data-id]').first().attr('data-id') || '';

      // Static episode links
      $('.episodes-ul a, .episode-list a, .ss-list a').each((_, el) => {
        const $el   = $(el);
        const epUrl = this.toAbsoluteUrl($el.attr('href'));
        const epNum = parseInt($el.text().replace(/\D/g, '')) || episodes.length + 1;
        if (epUrl) episodes.push({ episode: epNum, url: epUrl, title: this.cleanText($el.text()) });
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
          const v = document.querySelector('video');
          return v ? (v.src || v.querySelector('source')?.src || null) : null;
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
}

module.exports = PineDramaScraper;
