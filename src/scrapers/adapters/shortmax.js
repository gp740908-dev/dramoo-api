const { getScraper } = require('../index');

module.exports = {
  platform: 'shortmax',
  baseUrl: 'https://www.shorttv.live',

  buildUrl: (query) => {
    let url = 'https://www.shorttv.live/id';
    if (query.category) {
       url += `/search?keyword=${encodeURIComponent(query.category)}`;
    }
    return url;
  },

  parseData: (html) => {
    const results = [];
    
    // We try to find the window.__NUXT_DATA__ or similar script tag 
    // But since Nuxt 3 devalue is hard to parse in pure node without eval,
    // let's just do a naive regex extraction for covers and titles.
    try {
      const titleMatches = html.match(/alt="([^"]+)" loading="lazy" data-nuxt-img srcset="([^"]+)"/g);
      if (titleMatches) {
        titleMatches.forEach(match => {
          const m = match.match(/alt="([^"]+)".*?srcset="([^" ]+)/);
          if (m) {
            results.push({
              id: Buffer.from('/id/drama/' + encodeURIComponent(m[1].toLowerCase().replace(/\s+/g, '-'))).toString('base64url'),
              title: m[1],
              cover_url: m[2],
              genre: 'Drama',
              is_exclusive: false,
              source_url: `https://www.shorttv.live/id/drama/${encodeURIComponent(m[1].toLowerCase().replace(/\s+/g, '-'))}`
            });
          }
        });
      }
      
      // Fallback: extract hrefs
      const hrefs = html.match(/href="\/id\/drama\/([^"]+)"/g);
      if (hrefs && results.length === 0) {
        const unique = [...new Set(hrefs)];
        unique.forEach(href => {
           const slug = href.match(/href="\/id\/drama\/([^"]+)"/)[1];
           const sourceUrl = `https://www.shorttv.live/id/drama/${slug}`;
           results.push({
             id: Buffer.from(new URL(sourceUrl).pathname).toString('base64url'),
             title: slug.replace(/-/g, ' '),
             cover_url: '',
             genre: 'Drama',
             is_exclusive: false,
             source_url: sourceUrl
           });
        });
      }
    } catch (e) {}

    return results.slice(0, 20);
  }
};
