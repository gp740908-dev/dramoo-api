const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  try {
    const res = await axios.get('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-2-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    console.log(res.status);
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    const json = JSON.parse(nextData);
    console.log('episode:', json.props.pageProps.episode);
    console.log('chapter_id:', json.props.pageProps.chapter_id);
  } catch(e) { console.error(e.response ? e.response.status : e.message); }
}
run();
