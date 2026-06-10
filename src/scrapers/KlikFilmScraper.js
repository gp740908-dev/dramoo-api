const axios   = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const BaseScraper = require('./BaseScraper');

class KlikFilmScraper extends BaseScraper {
  constructor(options = {}) {
    super('klikfilm', 'https://klikfilm.com/v3/mobile', options);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status <= 302,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      // KlikFilm redirects desktop users, so a mobile UA is strictly necessary.
    });
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  async _fetchHtml(path) {
    const res = await this.http.get(path);
    return cheerio.load(res.data);
  }

  // ─── API Methods ─────────────────────────────────────────────────────────

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml('/home/special/trending');
      const items = [];
      
      // Home cards in KlikFilm mobile
      $('.card_film').each((i, el) => {
        const $el = $(el);
        // Anchor is usually wrapping the card, or the card is inside anchor
        let anchor = $el.closest('a');
        if (anchor.length === 0) anchor = $el.find('a');
        
        let url = this.toAbsoluteUrl(anchor.attr('href') || '');
        let title = this.cleanText($el.find('.list').text() || '');
        
        let photoDiv = $el.find('.photo');
        let thumbnail = photoDiv.attr('data-src');
        if (!thumbnail) {
            let bg = photoDiv.css('background-image') || photoDiv.attr('style') || '';
            let m = bg.match(/url\(['"]?(.*?)['"]?\)/);
            if (m) thumbnail = m[1];
        }
        thumbnail = this.toAbsoluteUrl(thumbnail || '');

        let id = url.split('detail/').pop() || Buffer.from(title).toString('base64');
        if (url && title) {
            items.push(this.formatDrama({ id, title, url, thumbnail }));
        }
      });

      // If trending page is empty, fallback to index
      if (items.length === 0) {
          const $home = await this._fetchHtml('/');
          $home('.card_film').each((i, el) => {
            const $el = $home(el);
            let anchor = $el.closest('a');
            if (anchor.length === 0) anchor = $el.find('a');
            let url = this.toAbsoluteUrl(anchor.attr('href') || '');
            let title = this.cleanText($el.find('.list').text() || '');
            let photoDiv = $el.find('.photo');
            let thumbnail = photoDiv.attr('data-src');
            if (!thumbnail) {
                let bg = photoDiv.css('background-image') || photoDiv.attr('style') || '';
                let m = bg.match(/url\(['"]?(.*?)['"]?\)/);
                if (m) thumbnail = m[1];
            }
            thumbnail = this.toAbsoluteUrl(thumbnail || '');
            let id = url.split('detail/').pop() || Buffer.from(title).toString('base64');
            if (url && title) items.push(this.formatDrama({ id, title, url, thumbnail }));
          });
      }

      return { success: true, platform: this.platformId, page, data: items };
    }, 'getLatest');
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      // The search endpoint might use query strings or POST, but mobile HTML showed URL format like /search
      // Let's assume ?q=query
      const $ = await this._fetchHtml(`/search?q=${encodeURIComponent(query)}`);
      const items = [];

      // Search results in KlikFilm mobile
      $('.search_result').closest('tr').each((i, el) => {
        const $el = $(el);
        const anchor = $el.find('a').first();
        const img = $el.find('img').first();
        
        let url = this.toAbsoluteUrl(anchor.attr('href') || '');
        let title = this.cleanText($el.find('.search_result').text() || '');
        let thumbnail = this.toAbsoluteUrl(img.attr('src') || '');

        let id = url.split('detail/').pop() || Buffer.from(title).toString('base64');
        if (url && title) {
            items.push(this.formatDrama({ id, title, url, thumbnail }));
        }
      });

      return { success: true, platform: this.platformId, query, page, data: items };
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      // Ensure mobile version
      let mobileUrl = dramaUrl.replace('/v3/desktop/', '/v3/mobile/');
      mobileUrl = mobileUrl.startsWith('http') ? mobileUrl : this.baseUrl + mobileUrl;
      
      const $ = await this._fetchHtml(mobileUrl);
      
      let title = this.cleanText($('.play_detail_title center').text() || $('title').text() || '');
      let description = this.cleanText($('#pdb_description').text() || '');
      let thumbnail = '';
      
      // Parse JSON-LD if available
      let rating = null;
      let genre = [];
      let year = null;
      
      $('script[type="application/ld+json"]').each((i, el) => {
          try {
              let ld = JSON.parse($(el).html());
              if (ld.image) thumbnail = ld.image;
              if (ld.genre) genre = typeof ld.genre === 'string' ? ld.genre.split(',') : ld.genre;
              if (ld.contentRating) rating = ld.contentRating;
              if (ld.copyrightYear) year = ld.copyrightYear;
              if (ld.name) title = ld.name;
          } catch(e) {}
      });
      
      // Fallback extraction
      if (!thumbnail) {
          thumbnail = $('meta[property="og:image"]').attr('content') || '';
      }
      if (!title) {
          title = $('meta[property="og:title"]').attr('content') || '';
      }
      
      const id = mobileUrl.split('detail/').pop();

      return {
        success: true,
        platform: this.platformId,
        drama: this.formatDrama({
          id,
          title,
          url: mobileUrl,
          thumbnail,
          description,
          genre,
          rating,
          year,
          episodes: 1, // Usually movie
          status: 'completed'
        }),
        episode_list: [
            { episode: 1, url: mobileUrl, title: title }
        ]
      };
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(this.http.defaults.headers['User-Agent']);
      
      const streamUrls = [];

      try {
        await page.setRequestInterception(true);
        page.on('request', req => {
          const url = req.url();
          if (url.includes('itms-appss:') || url.includes('apps.apple.com') || url.includes('play.google.com')) {
              return req.abort();
          }
          if (/\.(m3u8|mp4)(\?|$)/i.test(url) || /stream|hls|cdn/i.test(url)) {
             // Avoid matching .png/.css stuff that might have 'cdn'
             if (!url.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js|woff2|woff|ttf)$/i)) {
                 streamUrls.push(url);
             }
          }
          req.continue();
        });

        const fullUrl = episodeUrl.startsWith('http') ? episodeUrl : this.baseUrl + episodeUrl;
        
        try {
            await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout });
        } catch(e) {
            // Ignore ERR_ABORTED or ERR_FAILED due to redirect to app store
        }

        try {
          await page.waitForSelector('.play-btn, [class*="play"], video', { timeout: 4000 });
          await page.click('.play-btn, [class*="play"]').catch(() => {});
        } catch(e) {}

        await this._sleep(3000);

        const videoSrc = await page.evaluate(() => {
          const v = document.querySelector('video');
          return v ? (v.src || (v.querySelector('source') ? v.querySelector('source').src : null)) : null;
        }).catch(() => null);
        
        if (videoSrc) streamUrls.push(videoSrc);

        return {
          success: true,
          platform: this.platformId,
          episode_url: episodeUrl,
          stream_urls: [...new Set(streamUrls)],
          primary: streamUrls[0] || null,
        };
      } finally {
        await page.close();
      }
    }, 'getStreamUrl');
  }
}

module.exports = KlikFilmScraper;
