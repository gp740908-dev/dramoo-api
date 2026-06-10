const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1');
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  const json = JSON.parse(nextData);
  const props = json.props.pageProps;
  console.log('books key length:', props.book ? Object.keys(props.book).length : 'no book');
  if (props.episodes) {
    console.log('episodes:', props.episodes.length);
  }
}
run();
