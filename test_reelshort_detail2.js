const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  try {
    const res = await axios.get('https://www.reelshort.com/id/episodes/episode-1-versi-dub-cinta-tersembunyi-di-balik-cadar-68ca69ea4385e3fd030db94b-1zksd6174p', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    const json = JSON.parse(nextData);
    const pageProps = json.props.pageProps;
    console.log(Object.keys(pageProps));
    console.log('book_id:', pageProps.book.book_id);
    if (pageProps.episodes) {
      console.log('episodes:', pageProps.episodes.length);
      console.log(JSON.stringify(pageProps.episodes.slice(0, 2), null, 2));
    }
  } catch(e) { console.error(e.response ? e.response.status : e.message); }
}
run();
