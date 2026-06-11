const cheerio = require('cheerio');

module.exports = {
  platform: 'melolo',
  baseUrl: 'https://melolo.com',

  // Membangun URL target berdasarkan parameter user
  buildUrl: (query) => {
    let url = 'https://melolo.com/id';

    // Contoh terjemahan category -> jadikan pencarian sementara
    if (query.category) {
      url = `https://melolo.com/id/search?q=${encodeURIComponent(query.category)}`;
    }

    // Melolo tidak mendukung filter 'exclusive', return null agar di-handle controller (kembalikan [])
    if (query.filter === 'exclusive') {
      return null;
    }

    return url;
  },

  // Ekstrak data dari HTML menjadi bentuk standar
  parseData: (html) => {
    const $ = cheerio.load(html);
    const items = [];

    $('a[href*="/dramas/"]').each((_, el) => {
      const $el = $(el);
      const urlRaw = $el.attr('href') || '';
      
      // Melolo V1 logic: img could be inside or a sibling. Often wrapped in a card.
      const parent = $el.parent();
      let $img = $el.find('img').first();
      if (!$img.length) $img = parent.find('img').first();
      if (!$img.length) $img = $el.closest('div').find('img').first();

      const src = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('src') || '';
      const alt = $img.attr('alt') || $el.text().trim();
      
      // Hindari link episode "Tonton Sekarang"
      if (!alt || alt.toLowerCase().includes('tonton') || alt.includes('ep')) return;
      if (!urlRaw || !urlRaw.includes('/dramas/')) return;
      if (urlRaw.includes('/ep')) return; // Abaikan link per-episode

      let sourceUrl = urlRaw;
      if (!sourceUrl.startsWith('http')) {
        sourceUrl = 'https://melolo.com' + (sourceUrl.startsWith('/') ? sourceUrl : '/' + sourceUrl);
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
        title: alt,
        cover_url: src.startsWith('//') ? 'https:' + src : (src.startsWith('/') ? 'https://melolo.com' + src : src),
        genre: 'Drama',
        is_exclusive: false,
        source_url: sourceUrl
      });
    });

    // Hapus duplikat berdasarkan URL
    const uniqueMap = new Map();
    items.forEach(item => {
      if (!uniqueMap.has(item.source_url)) {
        uniqueMap.set(item.source_url, item);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 20);
  }
};
