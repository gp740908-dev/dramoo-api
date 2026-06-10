const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

async function check() {
  try {
    const res = await axios.get('https://netshort.com/id', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    fs.writeFileSync('netshort_dump.html', res.data);
    const $ = cheerio.load(res.data);
    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      console.log('NEXT_DATA found! Length:', nextData.length);
      fs.writeFileSync('netshort_next.json', nextData);
    } else {
      console.log('No NEXT_DATA. Probably a traditional site or CSR.');
    }
  } catch(e) {
    console.error('Error fetching netshort:', e.message);
  }
}
check();
