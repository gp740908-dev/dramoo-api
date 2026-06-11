const cheerio = require('cheerio');

module.exports = {
  platform: 'dramabox',
  baseUrl: 'https://www.dramaboxapp.com',

  buildUrl: (query) => {
    let url = 'https://www.dramaboxapp.com/in';
    if (query.category) {
      url = `https://www.dramaboxapp.com/in/search?keyword=${encodeURIComponent(query.category)}`;
    }
    return url;
  },

  parseData: (html) => {
    const $ = cheerio.load(html);
    const nextDataRaw = $('#__NEXT_DATA__').html();
    if (!nextDataRaw) return [];

    try {
      const nextData = JSON.parse(nextDataRaw);
      const props = nextData.props?.pageProps || {};
      let items = [];

      // If search page
      if (props.bookList) {
        items = props.bookList;
      } 
      // If home page
      else if (props.smallData && props.smallData.length > 0) {
        // Gabungkan semua item dari smallData
        props.smallData.forEach(cat => {
           if (cat.items) items.push(...cat.items);
        });
      }

      const results = [];
      const uniqueMap = new Map();

      items.forEach((d) => {
        const idRaw = d.bookId || d.originalBookId;
        if (!idRaw) return;

        const sourceUrl = `https://www.dramaboxapp.com/in/drama/${idRaw}`;
        let id = '';
        try {
          const urlObj = new URL(sourceUrl);
          id = Buffer.from(urlObj.pathname + urlObj.search).toString('base64url');
        } catch (e) {
          id = Buffer.from(sourceUrl).toString('base64url');
        }

        if (!uniqueMap.has(sourceUrl)) {
           uniqueMap.set(sourceUrl, true);
           results.push({
             id: id,
             title: d.bookName || d.name || 'No Title',
             cover_url: d.cover || '',
             genre: 'Drama',
             is_exclusive: false,
             source_url: sourceUrl
           });
        }
      });

      return results.slice(0, 20);
    } catch (e) {
      return [];
    }
  }
};
