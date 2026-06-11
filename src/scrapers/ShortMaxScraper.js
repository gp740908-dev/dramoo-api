const puppeteer = require('puppeteer');
const BaseScraper = require('./BaseScraper');

class ShortMaxScraper extends BaseScraper {
  constructor(options = {}) {
    super('shortmax', 'https://www.shorttv.live', options);
  }

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      const browserPage = await this.newPage();
      try {
        await browserPage.goto(`${this.baseUrl}/id`, { waitUntil: 'networkidle2', timeout: this.timeout });

        const items = await browserPage.evaluate(() => {
          const results = [];
          document.querySelectorAll('a[href*="/drama/"]').forEach(el => {
            const parent = el.closest('div')?.parentElement;
            if (!parent) return;
            const img = parent.querySelector('img');
            if (img && img.alt) {
              results.push({
                title: img.alt.trim(),
                url: el.href,
                thumbnail: img.src || img.dataset?.src || ''
              });
            }
          });

          // Deduplicate
          const map = new Map();
          results.forEach(i => map.set(i.url, i));
          return Array.from(map.values());
        });

        const formatted = items.map(i => this.formatDrama({
          title: i.title,
          url: i.url,
          thumbnail: i.thumbnail,
          episodes: null,
          rating: null
        }));

        return { success: true, platform: this.platformId, page, data: formatted };
      } finally {
        await browserPage.close();
      }
    }, 'getLatest');
  }

  async search(query, page = 1) {
    // ShortMax relies heavily on client-side state, simulating search by filtering latest for now
    return this.withRetry(async () => {
      const res = await this.getLatest(1);
      if (res.success) {
        const q = query.toLowerCase();
        res.data = res.data.filter(d => d.title.toLowerCase().includes(q));
      }
      return res;
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      const urlToFetch = dramaUrl.startsWith('http') ? dramaUrl : this.baseUrl + dramaUrl;
      const browserPage = await this.newPage();
      try {
        await browserPage.goto(urlToFetch, { waitUntil: 'networkidle2', timeout: this.timeout });

        const detailData = await browserPage.evaluate(() => {
          const title = document.querySelector('h1, [class*="title"]')?.innerText?.trim() || '';
          const description = document.querySelector('[class*="desc"], .synopsis')?.innerText?.trim() || '';
          const thumbnail = document.querySelector('meta[property="og:image"]')?.content ||
                            document.querySelector('img[alt="' + title.replace(/"/g, '\\"') + '"]')?.src || '';

          const eps = [];
          document.querySelectorAll('a[href*="/episode/"]').forEach((el, idx) => {
            const text = el.innerText.trim();
            const epNumMatch = el.href.match(/-(\d+)$/);
            const num = epNumMatch ? parseInt(epNumMatch[1]) : (parseInt(text.replace(/\D/g, '')) || idx + 1);
            eps.push({
              episode: num,
              url: el.href,
              title: text || `Episode ${num}`
            });
          });

          return { title, description, thumbnail, episodes: eps };
        });

        // Hapus duplikat eps jika ada berdasarkan URL
        const uniqueEpsMap = new Map();
        detailData.episodes.forEach(e => uniqueEpsMap.set(e.url, e));
        const episodesList = Array.from(uniqueEpsMap.values()).sort((a, b) => a.episode - b.episode);

        return {
          success: true,
          platform: this.platformId,
          data: {
            ...this.formatDrama({
              title: detailData.title,
              description: detailData.description,
              thumbnail: detailData.thumbnail,
              url: urlToFetch,
              episodes: episodesList.length || null,
            }),
            episodes: episodesList
          }
        };
      } finally {
        await browserPage.close();
      }
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      const browserPage = await this.newPage();
      let videoUrl = null;

      browserPage.on('request', req => {
        const url = req.url();
        if (!videoUrl && (url.endsWith('.mp4') || url.endsWith('.m3u8') || url.includes('mime_type=video'))) {
          videoUrl = url;
        }
      });

      try {
        await browserPage.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const videoTagSrc = await browserPage.evaluate(() => {
          const v = document.querySelector('video');
          return v ? v.src : null;
        });

        if (videoTagSrc && !videoTagSrc.startsWith('blob:')) {
          videoUrl = videoUrl || videoTagSrc;
        }

        if (!videoUrl) {
          // Coba klik tombol play di tengah jika ada
          await browserPage.evaluate(() => {
            const btn = document.querySelector('[class*="play"]');
            if (btn) btn.click();
          });
          await browserPage.waitForTimeout(2000);
        }

        if (!videoUrl) {
          // Cari state NUXT sebagai fallback
          const nuxtSrc = await browserPage.evaluate(() => {
             const m = document.body.innerHTML.match(/https?:\\\/\\\/[^"']+\.(?:m3u8|mp4)/);
             return m ? m[0].replace(/\\\//g, '/') : null;
          });
          if (nuxtSrc) videoUrl = nuxtSrc;
        }

      } finally {
        await browserPage.close();
      }

      if (!videoUrl) throw new Error('Video URL not found via Puppeteer interception on ShortMax');

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

module.exports = ShortMaxScraper;
