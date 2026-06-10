const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  const json = JSON.parse(nextData);
  const fallback = json.props.pageProps.fallback;
  console.log(fallback ? Object.keys(fallback) : 'No fallback');
}
run();
