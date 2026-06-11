const cheerio = require('cheerio');

module.exports = {
  platform: 'netshort',
  baseUrl: 'https://netshort.com',

  buildUrl: (query) => {
    let url = 'https://netshort.com/explore';

    if (query.category) {
      url += `?tag=${encodeURIComponent(query.category)}`;
    }

    if (query.filter === 'exclusive') {
      url += (url.includes('?') ? '&' : '?') + 'exclusive=true';
    }

    return url;
  },

  parseData: (html) => {
    const $ = cheerio.load(html);
    const results = [];

    $('.drama-card, .video-list-item, a[href*="/episode/"]').each((i, el) => {
      if (i >= 20) return;

      const $el = $(el);
      const anchor = $el.is('a') ? $el : $el.find('a').first();
      const img = $el.find('img').first();
      const titleEl = $el.find('.drama-title, h3');

      const title = titleEl.text().trim() || img.attr('alt') || anchor.attr('title') || 'No Title';
      
      let sourceUrl = anchor.attr('href') || '';
      if (sourceUrl && !sourceUrl.startsWith('http')) {
        sourceUrl = 'https://netshort.com' + (sourceUrl.startsWith('/') ? sourceUrl : '/' + sourceUrl);
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
          genre: 'Romance',
          is_exclusive: $el.find('.badge-exclusive').length > 0,
          source_url: sourceUrl
        });
      }
    });

    return results;
  }
};
