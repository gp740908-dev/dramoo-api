const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  const json = JSON.parse(nextData);
  const fallback = json.props.pageProps.fallback['/api/video/hall/info'];
  if (fallback?.bookShelfList) {
      console.log('first shelf title:', fallback.bookShelfList[0].name);
      console.log('first item title:', fallback.bookShelfList[0].list[0].book_title);
      console.log('first item URL:', fallback.bookShelfList[0].list[0].book_share_url);
      console.log('book id:', fallback.bookShelfList[0].list[0].book_id);
  }
}
run();
