// src/scrapers/DramaBoxScraper.js
// Scraper untuk dramabox.com (versi web) — menggunakan Puppeteer
// DramaBox web player menggunakan API internal + video CDN

const axios   = require('axios');
const cheerio = require('cheerio');
const BaseScraper = require('./BaseScraper');

class DramaBoxScraper extends BaseScraper {
  constructor(options = {}) {
    super('dramabox', 'https://www.dramabox.com', options);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent':      this.userAgent,
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         this.baseUrl,
        'sec-ch-ua':       '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });

    // DramaBox API internal (terdeteksi dari network tab)
    this.apiBase = 'https://www.dramabox.com/api';
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  async _fetchHtml(path) {
    const res = await this.http.get(path);
    return cheerio.load(res.data);
  }

  /** Coba ambil data dari API internal DramaBox (lebih stabil dari scraping HTML) */
  async _apiGet(endpoint, params = {}) {
    try {
      const res = await this.http.get(this.apiBase + endpoint, {
        params,
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      });
      return res.data;
    } catch {
      return null;
    }
  }

  _parseCard($, el) {
    const $el = $(el);

    const anchor    = $el.is('a') ? $el : $el.find('a[href]').first();
    const img       = $el.find('img, [class*="cover"], [class*="thumb"]').first();
    const titleEl   = $el.find('[class*="title"], [class*="name"], h3, h2, p').first();
    const epEl      = $el.find('[class*="episode"], [class*="ep"], [class*="count"]').first();
    const viewsEl   = $el.find('[class*="view"], [class*="play"]').first();

    return {
      title:     this.cleanText(titleEl.text() || img.attr('alt') || anchor.attr('title') || ''),
      url:       this.toAbsoluteUrl(anchor.attr('href')),
      thumbnail: this.toAbsoluteUrl(
        img.attr('data-src') || img.attr('data-lazy') || img.attr('src') ||
        $el.find('[style*="background"]').attr('style')?.match(/url\(["']?([^"')]+)["']?\)/)?.[1]
      ),
      episodes:  epEl.length ? parseInt(epEl.text().replace(/\D/g, '')) || null : null,
      views:     viewsEl.length ? this.cleanText(viewsEl.text()) : null,
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      // Coba API internal dulu
      const apiData = await this._apiGet('/drama/list', { page, type: 'latest', size: 24 });
      if (apiData?.data?.list) {
        const items = apiData.data.list.map(d => this.formatDrama({
          id:        d.id || d.dramaId,
          title:     d.name || d.title,
          thumbnail: d.cover || d.thumbnail,
          url:       `${this.baseUrl}/drama/${d.id || d.dramaId}`,
          episodes:  d.episodeCount || d.totalEpisode || null,
          views:     d.viewCount ? String(d.viewCount) : null,
          rating:    d.score || d.rating || null,
        }));
        return { success: true, platform: this.platformId, page, data: items };
      }

      // Fallback: scraping HTML
      const $ = await this._fetchHtml(`/drama?page=${page}`);
      const items = [];

      $('[class*="drama-item"], [class*="DramaCard"], [class*="video-item"], .swiper-slide, article, li[class]').each((_, el) => {
        const d = this._parseCard($, el);
        if (d.title && d.url) items.push(this.formatDrama(d));
      });

      return { success: true, platform: this.platformId, page, data: items };
    }, 'getLatest');
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      // Coba API internal
      const apiData = await this._apiGet('/search', { keyword: query, page, size: 20 });
      if (apiData?.data?.list) {
        const items = apiData.data.list.map(d => this.formatDrama({
          id:        d.id || d.dramaId,
          title:     d.name || d.title,
          thumbnail: d.cover || d.thumbnail,
          url:       `${this.baseUrl}/drama/${d.id || d.dramaId}`,
          episodes:  d.episodeCount || null,
        }));
        return { success: true, platform: this.platformId, query, page, data: items };
      }

      // Fallback: Puppeteer untuk halaman search (mungkin perlu JS)
      const pw = await this.newPage();
      try {
        await pw.goto(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`, {
          waitUntil: 'networkidle2', timeout: this.timeout,
        });
        await this._sleep(2000);

        const raw = await pw.evaluate(() => {
          const results = [];
          document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href') || '';
            if (!/drama|series|show/i.test(href)) return;
            const img = a.querySelector('img');
            if (!img) return;
            results.push({
              title:     (a.querySelector('[class*="title"], h3, h2, p')?.textContent || img.alt || '').trim(),
              url:       a.href,
              thumbnail: img.src || img.dataset.src || null,
            });
          });
          const seen = new Set();
          return results.filter(r => {
            if (!r.url || !r.title || seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
          });
        });

        return {
          success:  true,
          platform: this.platformId,
          query, page,
          data: raw.map(r => this.formatDrama(r)),
        };
      } finally {
        await pw.close();
      }
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const fullUrl  = dramaUrl.startsWith('http') ? dramaUrl : this.baseUrl + dramaUrl;
      const dramaId  = fullUrl.split('/').filter(Boolean).pop();

      // Coba API internal
      const apiData  = await this._apiGet(`/drama/detail`, { id: dramaId });
      let info       = null;
      let episodeList = [];

      if (apiData?.data) {
        const d = apiData.data;
        info = {
          id:          dramaId,
          title:       d.name || d.title,
          thumbnail:   d.cover || d.thumbnail,
          description: d.description || d.intro,
          genre:       d.tags || d.genre || [],
          rating:      d.score || d.rating || null,
          year:        d.year || null,
          status:      d.isFinished ? 'completed' : 'ongoing',
          episodes:    d.episodeCount || null,
          url:         fullUrl,
        };

        // Episode list dari API
        const epApi = await this._apiGet(`/drama/episode/list`, { dramaId, page: 1, size: 200 });
        if (epApi?.data?.list) {
          episodeList = epApi.data.list.map(ep => ({
            episode: ep.episodeNo || ep.sort,
            url:     `${this.baseUrl}/play/${dramaId}/${ep.id || ep.episodeId}`,
            title:   ep.title || `Episode ${ep.episodeNo}`,
          }));
        }
      }

      // Fallback: scraping HTML
      if (!info) {
        const $ = await this._fetchHtml(fullUrl.replace(this.baseUrl, ''));

        const title       = this.cleanText($('h1, [class*="title"]').first().text());
        const thumbnail   = this.toAbsoluteUrl(
          $('meta[property="og:image"]').attr('content') ||
          $('[class*="cover"] img, [class*="poster"] img').first().attr('src')
        );
        const description = this.cleanText(
          $('meta[property="og:description"]').attr('content') ||
          $('[class*="description"], [class*="intro"], [class*="synopsis"]').first().text()
        );

        const genre = [];
        $('[class*="tag"] a, [class*="genre"] a, [class*="category"] a').each((_, el) => {
          const g = this.cleanText($(el).text());
          if (g) genre.push(g);
        });

        const ratingText = $('[class*="score"], [class*="rating"]').first().text();
        const rating     = parseFloat(ratingText) || null;

        $('[class*="episode"] a, [class*="ep-item"] a, .episode-list a').each((idx, el) => {
          const $el = $(el);
          const u   = this.toAbsoluteUrl($el.attr('href'));
          if (u) episodeList.push({ episode: idx + 1, url: u, title: this.cleanText($el.text()) });
        });

        info = { title, thumbnail, description, genre, rating, url: fullUrl, episodes: episodeList.length || null };
      }

      return {
        success:  true,
        platform: this.platformId,
        drama:    this.formatDrama(info),
        episode_list: episodeList.sort((a, b) => a.episode - b.episode),
      };
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const page       = await this.newPage();
      const streamUrls = [];
      const apiCalls   = [];

      try {
        // Tangkap semua request network — DramaBox memanggil API untuk mendapat URL video
        page.on('request', req => {
          const url  = req.url();
          const type = req.resourceType();
          if (type === 'media' || /\.(m3u8|mp4|webm)(\?|$)/.test(url)) {
            streamUrls.push(url);
          }
          if (/\/api\/.*episode|\/api\/.*play|\/api\/.*stream|videoSrc/i.test(url)) {
            apiCalls.push(url);
          }
        });

        page.on('response', async res => {
          const url = res.url();
          if (/\/api\/.*episode|\/api\/.*play|videoSrc/i.test(url)) {
            try {
              const json = await res.json();
              // Cari field yang mengandung URL video
              const text = JSON.stringify(json);
              const m3u8 = text.match(/https?:\/\/[^"]+\.m3u8[^"]*/g) || [];
              const mp4  = text.match(/https?:\/\/[^"]+\.mp4[^"]*/g)  || [];
              streamUrls.push(...m3u8, ...mp4);
            } catch { /* bukan JSON */ }
          }
        });

        await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
        await this._sleep(4000);

        // Klik play jika video belum mulai
        await page.evaluate(() => {
          const play = document.querySelector('[class*="play-btn"], [aria-label*="play"], button[class*="play"]');
          if (play) play.click();
        });

        await this._sleep(2000);

        const videoSrc = await page.evaluate(() => {
          const v = document.querySelector('video');
          return v ? (v.src || v.querySelector('source')?.src || null) : null;
        });

        const sources = [...new Set([videoSrc, ...streamUrls].filter(Boolean))];

        return {
          success:     true,
          platform:    this.platformId,
          episode_url: episodeUrl,
          stream_urls: sources,
          primary:     sources[0] || null,
          api_calls:   apiCalls,   // debug: API endpoint yang dipanggil
        };
      } finally {
        await page.close();
      }
    }, 'getStreamUrl');
  }
}

module.exports = DramaBoxScraper;
