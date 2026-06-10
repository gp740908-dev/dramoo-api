const axios = require('axios');
const cheerio = require('cheerio');

async function testReelShort() {
  const res = await axios.get('https://www.reelshort.com/id', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  const items = [];
  $('[class^="BookItem_bookItem"]').each((i, el) => {
    const title = $(el).find('[class^="BookItem_title"] a').text().trim() || $(el).find('img').attr('alt');
    const url = $(el).find('[class^="BookItem_title"] a').attr('href');
    const img = $(el).find('img').last().attr('src');
    if (url && title) {
      items.push({ title, url, img });
    }
  });
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
testReelShort().catch(console.error);
