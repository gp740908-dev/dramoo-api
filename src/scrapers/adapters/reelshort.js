const cheerio = require('cheerio');

module.exports = {
  platform: 'reelshort',
  baseUrl: 'https://www.reelshort.com',

  buildUrl: (query) => {
    let url = 'https://www.reelshort.com/id';
    if (query.category) {
      url = `https://www.reelshort.com/id/search?keywords=${encodeURIComponent(query.category)}&type=movies&keyword=${encodeURIComponent(query.category)}`;
    }
    return url;
  },

  parseData: (html) => {
    const $ = cheerio.load(html);
    const nextDataRaw = $('#__NEXT_DATA__').html();
    if (!nextDataRaw) return [];

    try {
      const nextData = JSON.parse(nextDataRaw);
      let items = [];

      // If search page
      if (nextData.props?.pageProps?.books) {
        items = nextData.props.pageProps.books;
      } 
      // If home page
      else {
        const fallback = nextData.props?.pageProps?.fallback?.['/api/video/hall/info'];
        if (fallback && fallback.bookShelfList) {
          fallback.bookShelfList.forEach(shelf => {
            if (shelf.books) items.push(...shelf.books);
          });
        }
      }

      const results = [];
      const uniqueMap = new Map();

      items.forEach((item) => {
        if (!item.start_play || !item.start_play.chapter_id) return;

        const sourceUrl = `https://www.reelshort.com/id/episodes/episode-1-${item.book_id}-${item.start_play.chapter_id}?playTime=1`;
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
             title: item.book_title || 'No Title',
             cover_url: item.book_pic || '',
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
