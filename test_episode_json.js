const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1');
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  require('fs').writeFileSync('reelshort_episode.json', nextData);
}
run();
