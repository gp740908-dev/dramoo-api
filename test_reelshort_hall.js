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
  console.log(fallback ? Object.keys(fallback) : 'No fallback');
  if (fallback?.data) {
      console.log('hall info keys:', Object.keys(fallback.data));
      if (fallback.data.recommend) {
          console.log('first recommend title:', fallback.data.recommend[0].name);
          console.log('first item title:', fallback.data.recommend[0].list[0].book_title);
          console.log('first item URL:', fallback.data.recommend[0].list[0].book_share_url);
      }
  }
}
run();
