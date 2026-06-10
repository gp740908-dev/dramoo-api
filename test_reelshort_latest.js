const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  const json = JSON.parse(nextData);
  const props = json.props.pageProps;
  console.log(Object.keys(props));
  if (props.recommend) {
      console.log('recommend length:', props.recommend.length);
      console.log('First recommendation items:', props.recommend[0]?.list?.length);
      if (props.recommend[0]?.list?.length > 0) {
          console.log('First item:', props.recommend[0].list[0].book_title);
          console.log('Share URL:', props.recommend[0].list[0].book_share_url);
          console.log('Book ID:', props.recommend[0].list[0].book_id);
      }
  }
}
run();
