const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function check() {
  try {
    const res = await axios.get('https://www.dramabox.com/in/play/41000105764/578668219', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      fs.writeFileSync('dramabox_play.json', nextData);
      console.log('Play data saved to dramabox_play.json');
    }
  } catch(e) {
    console.error(e.message);
  }
}
check();
