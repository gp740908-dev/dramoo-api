const axios   = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const BaseScraper = require('./BaseScraper');

class NetShortScraper extends BaseScraper {
  constructor(options = {}) {
    super('netshort', 'https://netshort.com', options);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  async _fetchHtml(path) {
    const res = await this.http.get(path);
    return cheerio.load(res.data);
  }

  _parseDramaItem($, el) {
    const $el = $(el);
    const anchor = $el.find('a').first();
    const img = $el.find('.list-item-img, img').first();
    const titleEl = $el.find('.list-item-info-name, p.line-clamp-2');

    let title = this.cleanText(titleEl.text() || img.attr('alt') || '');
    let url = this.toAbsoluteUrl(anchor.attr('href') || '');
    let thumbnail = this.toAbsoluteUrl(img.attr('src') || '');

    // Fallback if not standard list-item
    if (!url && $el.is('a')) url = this.toAbsoluteUrl($el.attr('href'));

    // ID extraction
    let id = url.split('-').pop() || Buffer.from(title).toString('base64');
    
    return this.formatDrama({ id, title, url, thumbnail });
  }

  // ─── API Methods ─────────────────────────────────────────────────────────

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml('/id');
      const items = [];
      
      // Parse .list-item from homepage
      $('.list-item').each((i, el) => {
        items.push(this._parseDramaItem($, el));
      });

      if (items.length === 0) {
         // Fallback to li elements
         $('li').each((i, el) => {
           const a = $(el).find('a');
           const img = $(el).find('img');
           if (a.length && img.length) {
              items.push(this.formatDrama({
                id: a.attr('href').split('-').pop(),
                title: img.attr('alt') || '',
                url: this.toAbsoluteUrl(a.attr('href')),
                thumbnail: this.toAbsoluteUrl(img.attr('src'))
              }));
           }
         });
      }

      return { success: true, platform: this.platformId, page, data: items };
    }, 'getLatest');
  }

  async search(query, page = 1) {
    // Note: Netshort search mechanism usually depends on React Router state
    // We will simulate it by doing a getLatest for now or doing a request to search page
    return this.withRetry(async () => {
      // Netshort might not have a simple server-side search URL, fallback to latest
      const res = await this.getLatest(1);
      if (res.success) {
        // Filter locally
        const q = query.toLowerCase();
        res.data = res.data.filter(d => d.title.toLowerCase().includes(q));
      }
      return res;
    }, 'search');
  }

  async getDetail(url) {
    return this.withRetry(async () => {
      const $ = await this._fetchHtml(url);
      
      const title = $('h1').text() || $('title').text().split('-')[0].trim();
      const thumbnail = $('meta[property="og:image"]').attr('content') || '';
      const description = $('meta[name="description"]').attr('content') || '';
      
      // Load with Puppeteer to get episodes list reliably (Metode 2)
      const page = await this.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const episodes = await page.evaluate((currentUrl) => {
         const eps = [];
         const items = document.querySelectorAll('.episode-list-item, [class*="episode"]');
         items.forEach(el => {
            const txt = el.innerText.trim();
            if (txt.match(/^\d+$/)) {
               eps.push({
                 num: parseInt(txt),
                 url: window.location.href // They use react state, so same url but handle click
               });
            }
         });
         return eps.length ? eps : [{ num: 1, url: currentUrl }]; // fallback
      }, url);

      await page.close();

      return {
        success: true,
        platform: this.platformId,
        data: {
          id: url.split('-').pop(),
          title: this.cleanText(title),
          url,
          thumbnail: this.toAbsoluteUrl(thumbnail),
          description: this.cleanText(description),
          episodes
        }
      };
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      // Use Metode 2 (Puppeteer) to extract video URL
      const page = await this.newPage();
      let videoUrl = null;
      
      // Catch network requests for .mp4 or .m3u8
      page.on('request', req => {
         const rUrl = req.url();
         if (!videoUrl && (rUrl.endsWith('.mp4') || rUrl.endsWith('.m3u8') || rUrl.includes('mime_type=video'))) {
             videoUrl = rUrl;
         }
      });

      try {
         await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
         
         const videoTagSrc = await page.evaluate(() => {
           const v = document.querySelector('video');
           return v ? v.src : null;
         });
         
         if (videoTagSrc) videoUrl = videoUrl || videoTagSrc;
         
         // Try clicking play if video URL not loaded immediately
         if (!videoUrl) {
            await page.evaluate(() => {
               const playBtn = document.querySelector('[class*="play"]');
               if (playBtn) playBtn.click();
            });
            await page.waitForTimeout(2000); // Wait for request
         }
         
      } finally {
         await page.close();
      }

      if (!videoUrl) throw new Error('Video URL not found via Puppeteer interception');

      return {
        success: true,
        platform: this.platformId,
        data: {
          stream_url: videoUrl,
          type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4'
        }
      };
    }, 'getStreamUrl');
  }
}

module.exports = NetShortScraper;
