const axios = require('axios');
async function run() {
  try {
    const res = await axios.get('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1');
    console.log(res.status);
  } catch(e) { console.error(e.response ? e.response.status : e.message); }
}
run();
