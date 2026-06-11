const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://melolo.com/id').then(res => {
  const $ = cheerio.load(res.data);
  const nextData = $('#__NEXT_DATA__').html();
  if (nextData) {
    console.log('Next.js data found. Length:', nextData.length);
    // Don't log all keys to avoid huge output, just print success
  } else {
    console.log('No __NEXT_DATA__ found');
  }
}).catch(console.error);
