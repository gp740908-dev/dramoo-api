const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  const res = await axios.get('https://www.reelshort.com/id/search?keywords=love&type=movies&keyword=love', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  const json = JSON.parse(nextData);
  console.log(JSON.stringify(json.props.pageProps.books.slice(0, 3), null, 2));
}
run().catch(console.error);
