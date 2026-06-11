// src/scrapers/MeloloScraper.js
// Scraper untuk melolo.com — menggunakan Puppeteer
// Melolo punya halaman yang di-render server (SSR) tapi player video dinamis

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');

class MeloloScraper extends BaseScraper {
  constructor(options = {}) {
    super('melolo', 'https://melolo.com/id', options);

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

    // Melolo: .film-poster > a > img + .film-detail
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
      // Melolo usually uses /dramas or root for latest.
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
        if (d.title && d.url && d.url.includes('/dramas/') && !/\/ep\d+/i.test(d.url) && !/\/episode/i.test(d.url)) items.push(this.formatDrama(d));
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
      const $ = await this._fetchHtml(`/search?q=${encodeURIComponent(query)}`);

      const items = [];
      // Melolo: img and anchor are siblings inside a parent div
      $('img[alt][src]').each((_, imgEl) => {
        const $img = $(imgEl);
        const src = $img.attr('src') || $img.attr('data-src') || '';
        const alt = this.cleanText($img.attr('alt') || '');
        // Find sibling or ancestor link
        const parent = $img.parent();
        const link = parent.find('a[href*="/dramas/"]').first().attr('href') || 
                     parent.closest('[href*="/dramas/"]').attr('href') || '';
        // Also look at nearest anchor with /dramas/
        const nearestLink = $img.closest('div').find('a[href*="/dramas/"]').first();
        const url = this.toAbsoluteUrl(nearestLink.attr('href') || link);
        const thumbnail = this.toAbsoluteUrl(src);
        
        if (alt && url && url.includes('/dramas/') && !/\/ep\d+/i.test(url) && !/\/episode/i.test(url)) {
          items.push(this.formatDrama({ title: alt, url, thumbnail, episodes: null, rating: null }));
        }
      });

      const uniqueItems = Array.from(new Map(items.map(item => [item.url, item])).values());
      return { success: true, page, platform: this.platformId, data: uniqueItems };
    });
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const urlToFetch = dramaUrl.startsWith('http') ? dramaUrl : this.baseUrl + dramaUrl;
      const page = await this.newPage();
      try {
        await page.goto(urlToFetch, { waitUntil: 'networkidle2', timeout: this.timeout });

        // Evaluasi data dasar di dalam page
        const detailData = await page.evaluate(() => {
          const cleanText = str => (str || '').replace(/\s+/g, ' ').trim();
          const title = cleanText(document.querySelector('h1, h2, [class*="title"]')?.innerText);
          const thumbEl = document.querySelector('meta[property="og:image"]') || document.querySelector('img.film-poster-img, .dp-i-c-poster img, .poster img');
          const thumbnail = thumbEl ? (thumbEl.content || thumbEl.src) : null;
          const descEl = document.querySelector('meta[property="og:description"]') || document.querySelector('.dp-i-p, .film-description, .description');
          const description = descEl ? (descEl.content || descEl.innerText) : '';
          
          const genres = [];
          document.querySelectorAll('.item-list a[href*="genre"], .film-info a[href*="genre"], .genres a').forEach(el => genres.push(cleanText(el.innerText)));
          
          let year = null, status = 'unknown';
          document.querySelectorAll('.item-list, .film-info').forEach(el => {
            if (el.innerText.includes('Year')) year = parseInt(el.innerText.match(/\d{4}/)?.[0]) || null;
            if (el.innerText.includes('Status') || el.className.includes('status')) {
               if (/complet/i.test(el.innerText)) status = 'completed';
               if (/ongoing|air/i.test(el.innerText)) status = 'ongoing';
            }
          });
          
          const ratingText = document.querySelector('.film-rating strong, .film-stats .score')?.innerText;
          const rating = parseFloat(ratingText) || null;
          
          return { title, thumbnail, description, genre: genres, year, status, rating };
        });

        // Loop klik tombol "load more" dan scroll sampai habis
        await page.evaluate(async () => {
          let lastCount = 0;
          let retries = 0;
          while (retries < 5) {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const moreBtn = btns.find(b => b.innerText && b.innerText.match(/more|lainnya|selengkapnya/i));
            if (moreBtn) moreBtn.click();
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 1000));
            const count = Array.from(document.querySelectorAll('a, div')).filter(el => (el.href && el.href.includes('/ep')) || (el.innerText && el.innerText.includes('EP'))).length;
            if (count === lastCount) {
              retries++;
            } else {
              lastCount = count;
              retries = 0;
            }
          }
        });

        // Ekstrak episode list
        const rawEps = await page.evaluate(() => {
          const cleanText = str => (str || '').replace(/\s+/g, ' ').trim();
          const eps = [];
          Array.from(document.querySelectorAll('a, div')).filter(el => (el.href && el.href.includes('/ep')) || (el.innerText && /EP\s*\d+/i.test(el.innerText))).forEach((el, idx) => {
             const text = cleanText(el.innerText);
             if (/EP\s*\d+/i.test(text) || (el.href && el.href.includes('/ep'))) {
                 const epUrl = el.href || null;
                 const epNum = text.replace(/\D/g, '') || String(idx + 1);
                 eps.push({ episode: parseInt(epNum), url: epUrl, title: text });
             }
          });
          return eps;
        });

        return {
          success:  true,
          platform: this.platformId,
          data: {
            ...this.formatDrama({
              ...detailData,
              url: this.toAbsoluteUrl(dramaUrl),
              episodes: rawEps.length || null,
            }),
            episodes: rawEps.sort((a, b) => a.episode - b.episode)
          }
        };
      } finally {
        await page.close();
      }
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

        // Melolo: klik server button jika ada pilihan server
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
        const paths = [`/category`, `/`];
        let $;
        for (const p of paths) {
          try { $ = await this._fetchHtml(p); break; } catch (e) {}
        }
        if (!$) throw new Error('Gagal memuat kategori Melolo');

        const categories = [];
        $('a[href*="/category/"]').each((_, el) => {
          const name = this.cleanText($(el).text());
          const url = $(el).attr('href');
          const id = url.split('/').pop();
          if (name && id) categories.push({ id, name, url: this.toAbsoluteUrl(url) });
        });
        
        const uniqueCat = Array.from(new Map(categories.map(item => [item.id, item])).values());
        return { success: true, platform: this.platformId, categories: uniqueCat };
      }

      // Jika ada categoryId, scrape halaman kategori tersebut
      const path = `/category/${categoryId}?page=${page}`;
      const $ = await this._fetchHtml(path).catch(() => null);
      if (!$) return { success: true, page, platform: this.platformId, data: [] };

      const items = [];
      $('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/') && !/\/ep\d+/i.test(d.url) && !/\/episode/i.test(d.url)) items.push(this.formatDrama(d));
      });
      return { success: true, page, platform: this.platformId, data: items };
    });
  }

  async getTrending(page = 1, cursor = null, lang = 'id') {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(`/`);
      const items = [];
      
      // Coba cari bagian Tren / Trending di homepage
      const trendingTitle = $('h3').filter((_, el) => /tren|trending/i.test($(el).text()));
      const container = trendingTitle.length ? trendingTitle.parent().parent() : $.root();

      container.find('a[href*="/dramas/"]').each((_, el) => {
        const d = this._parseDramaItem($, el);
        if (d.title && d.url && d.url.includes('/dramas/') && !/\/ep\d+/i.test(d.url) && !/\/episode/i.test(d.url)) items.push(this.formatDrama(d));
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

module.exports = MeloloScraper;
