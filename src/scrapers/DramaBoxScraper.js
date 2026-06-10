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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  async _getNextData(path) {
    const res = await this.http.get(path);
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    if (!nextData) return null;
    try {
      return JSON.parse(nextData);
    } catch {
      return null;
    }
  }

  async getLatest(page = 1) {
    return this.withRetry(async () => {
      // DramaBox pagination is complex via Next.js, so we just return the first page bigList
      const nextJson = await this._getNextData('/in');
      if (!nextJson?.props?.pageProps?.bigList) throw new Error('Failed to extract NEXT_DATA from homepage');

      const items = nextJson.props.pageProps.bigList.map(d => this.formatDrama({
        id:        d.bookId || d.originalBookId,
        title:     d.bookName || d.name,
        thumbnail: d.cover,
        url:       `${this.baseUrl}/drama/${d.bookId || d.originalBookId}`,
        episodes:  d.chapterCount || null,
        views:     d.viewCountDisplay || null,
      }));

      return { success: true, platform: this.platformId, page, data: items };
    }, 'getLatest');
  }

  async getCategory(categoryId = null, page = 1) {
    return this.withRetry(async () => {
      const nextJson = await this._getNextData('/in');
      if (!nextJson?.props?.pageProps?.smallData) return { success: true, platform: this.platformId, categories: [], data: [] };
      
      const smallData = nextJson.props.pageProps.smallData;

      if (!categoryId) {
        const categories = smallData.map((s, idx) => ({
          id: s.id || `cat_${idx}`,
          name: s.name,
          url: `${this.baseUrl}/category/${s.id || idx}`
        }));
        return { success: true, platform: this.platformId, categories };
      }

      // If categoryId is provided, find the category in smallData
      const cat = smallData.find((s, idx) => String(s.id) === categoryId || `cat_${idx}` === categoryId);
      if (!cat || !cat.items) return { success: true, platform: this.platformId, page, data: [] };

      const items = cat.items.map(d => this.formatDrama({
        id:        d.bookId || d.originalBookId,
        title:     d.bookName || d.name,
        thumbnail: d.cover,
        url:       `${this.baseUrl}/drama/${d.bookId || d.originalBookId}`,
        episodes:  d.chapterCount || null,
        views:     d.viewCountDisplay || null,
      }));

      return { success: true, platform: this.platformId, page, data: items };
    }, 'getCategory');
  }

  async getTrending(page = 1) {
    return this.withRetry(async () => {
      // Return first category from smallData as trending, usually the most popular ones
      const res = await this.getCategory('cat_0', page);
      return res;
    }, 'getTrending');
  }

  async getLanguages() {
    return [
      { code: 'in', name: 'English (India)' },
      { code: 'en', name: 'English' },
      { code: 'id', name: 'Bahasa Indonesia' },
      { code: 'th', name: 'Thai' },
      { code: 'es', name: 'Spanish' }
    ];
  }

  async search(query, page = 1) {
    return this.withRetry(async () => {
      const nextJson = await this._getNextData(`/in/search?keyword=${encodeURIComponent(query)}`);
      if (!nextJson?.props?.pageProps?.bookList) return { success: true, platform: this.platformId, query, page, data: [] };

      const items = nextJson.props.pageProps.bookList.map(d => this.formatDrama({
        id:        d.bookId || d.originalBookId,
        title:     d.bookName || d.name,
        thumbnail: d.cover,
        url:       `${this.baseUrl}/drama/${d.bookId || d.originalBookId}`,
        episodes:  d.chapterCount || null,
      }));

      return { success: true, platform: this.platformId, query, page, data: items };
    }, 'search');
  }

  async getDetail(dramaUrl) {
    return this.withRetry(async () => {
      let dramaId = dramaUrl;
      if (dramaUrl.startsWith('http')) {
        dramaId = dramaUrl.split('/').filter(Boolean).pop();
      }
      const fullUrl = `${this.baseUrl}/in/drama/${dramaId}`;

      const nextJson = await this._getNextData(`/in/drama/${dramaId}`);
      if (!nextJson?.props?.pageProps?.bookInfo) throw new Error('Drama not found or NEXT_DATA missing');

      const d = nextJson.props.pageProps.bookInfo;
      const chList = nextJson.props.pageProps.chapterList || [];

      const info = {
        id:          dramaId,
        title:       d.bookName || d.name,
        thumbnail:   d.cover,
        description: d.introduction || d.description || '',
        genre:       d.labels || d.tags || [],
        url:         fullUrl,
        episodes:    d.chapterCount || chList.length || null,
      };

      const episodeList = chList.map((ep, idx) => ({
        episode: idx + 1,
        url:     `${this.baseUrl}/in/play/${dramaId}/${ep.id}`,
        title:   ep.name || `Episode ${idx + 1}`,
        _raw_mp4: ep.mp4 || null,
        _raw_m3u8: ep.m3u8Url || null,
      }));

      return {
        success:  true,
        platform: this.platformId,
        drama:    this.formatDrama(info),
        episode_list: episodeList,
      };
    }, 'getDetail');
  }

  async getStreamUrl(episodeUrl) {
    return this.withRetry(async () => {
      // Url is like https://www.dramabox.com/in/play/{dramaId}/{episodeId}
      const parts = episodeUrl.split('/');
      const episodeId = parts.pop();
      const dramaId = parts.pop();

      const detailRes = await this.getDetail(dramaId);
      
      let targetEp = detailRes.episode_list.find(ep => ep.url.includes(episodeId));
      if (!targetEp) throw new Error('Episode not found in drama detail');

      const streamUrls = [targetEp._raw_mp4, targetEp._raw_m3u8].filter(Boolean);

      return {
        success:     true,
        platform:    this.platformId,
        episode_url: episodeUrl,
        stream_urls: streamUrls,
        primary:     streamUrls[0] || null,
      };
    }, 'getStreamUrl');
  }
}

module.exports = DramaBoxScraper;
