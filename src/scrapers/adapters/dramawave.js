const cheerio = require('cheerio');

module.exports = {
  platform: 'dramawave',
  baseUrl: 'https://dramawave.dramaflixs.com',

  buildUrl: (query) => {
    let url = 'https://dramawave.dramaflixs.com/category';

    if (query.category) {
      url += `/${encodeURIComponent(query.category)}`;
    }

    if (query.filter === 'exclusive') {
      return null; // Asumsi tidak support filter exclusive
    }

    return url;
  },

  parseData: (html) => {
    const $ = cheerio.load(html);
    const results = [];

    $('.video-item, .drama-card, a[href*="/video/"]').each((i, el) => {
      if (i >= 20) return;

      const $el = $(el);
      const anchor = $el.is('a') ? $el : $el.find('a').first();
      const img = $el.find('img').first();
      const titleEl = $el.find('.title, h2, h3');

      const title = titleEl.text().trim() || img.attr('alt') || anchor.attr('title') || 'No Title';
      
      let sourceUrl = anchor.attr('href') || '';
      if (sourceUrl && !sourceUrl.startsWith('http')) {
        sourceUrl = 'https://dramawave.dramaflixs.com' + (sourceUrl.startsWith('/') ? sourceUrl : '/' + sourceUrl);
      }

      const coverUrl = img.attr('src') || img.attr('data-src') || '';
      
      let id = '';
      if (sourceUrl) {
        try {
          const urlObj = new URL(sourceUrl);
          id = Buffer.from(urlObj.pathname + urlObj.search).toString('base64url');
        } catch (e) {
          id = Buffer.from(sourceUrl).toString('base64url');
        }
      }

      if (id && sourceUrl) {
        results.push({
          id: id,
          title: title,
          cover_url: coverUrl.startsWith('//') ? 'https:' + coverUrl : coverUrl,
          genre: 'Drama',
          is_exclusive: false,
          source_url: sourceUrl
        });
      }
    });

    return results;
  }
};
