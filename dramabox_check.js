const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function check() {
  try {
    const res = await axios.get('https://www.dramabox.com/in', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      fs.writeFileSync('dramabox_next.json', nextData);
    }
  } catch(e) {
    console.error(e.message);
  }
}
check();
