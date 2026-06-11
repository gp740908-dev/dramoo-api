const cheerio = require('cheerio');

module.exports = {
  platform: 'pinedrama',
  baseUrl: 'https://pinedrama.com/id',

  buildUrl: (query) => {
    let url = 'https://pinedrama.com/id';
    if (query.category) {
      url = `https://pinedrama.com/id/search?q=${encodeURIComponent(query.category)}`;
    }
    return url;
  },

  parseData: (html) => {
    const $ = cheerio.load(html);
    const items = [];

    $('a[href*="/dramas/"] img').each((_, imgEl) => {
      const imgLink = $(imgEl).closest('a[href*="/dramas/"]');
      const hrefRaw = imgLink.attr('href') || imgLink.attr('aria-label') || '';
      const title = ($(imgEl).attr('alt') || '').trim();
      let src = $(imgEl).attr('src') || $(imgEl).attr('data-src') || $(imgEl).attr('data-lazy-src') || '';

      if (title && hrefRaw && hrefRaw.includes('/dramas/') && !title.toLowerCase().includes('tonton') && !hrefRaw.includes('/ep')) {
        let sourceUrl = hrefRaw;
        if (!sourceUrl.startsWith('http')) {
          sourceUrl = 'https://pinedrama.com' + (sourceUrl.startsWith('/') ? sourceUrl : '/' + sourceUrl);
        }

        let id = '';
        try {
          const urlObj = new URL(sourceUrl);
          id = Buffer.from(urlObj.pathname + urlObj.search).toString('base64url');
        } catch (e) {
          id = Buffer.from(sourceUrl).toString('base64url');
        }

        items.push({
          id: id,
          title: title,
          cover_url: src.startsWith('//') ? 'https:' + src : (src.startsWith('/') ? 'https://pinedrama.com' + src : src),
          genre: 'Drama',
          is_exclusive: false,
          source_url: sourceUrl
        });
      }
    });

    const uniqueMap = new Map();
    items.forEach(item => {
      if (!uniqueMap.has(item.source_url)) {
        uniqueMap.set(item.source_url, item);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 20);
  }
};
