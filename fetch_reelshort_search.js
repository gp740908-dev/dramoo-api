const axios = require('axios');
const fs = require('fs');
async function run() {
  const res = await axios.get('https://www.reelshort.com/id/search?keyword=cinta');
  fs.writeFileSync('reelshort_search.html', res.data);
}
run();
