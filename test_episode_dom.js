const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1');
  const $ = cheerio.load(res.data);
  let text = '';
  $('*').each((i, el) => {
    if ($(el).text().includes('Episode')) {
      const cls = $(el).attr('class');
      if (cls && !text.includes(cls)) text += cls + '\n';
    }
  });
  console.log(text);
}
run();
