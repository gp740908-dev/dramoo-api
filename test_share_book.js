const axios = require('axios');
async function run() {
  const res = await axios.get('https://w2a.reelshort.com/reelshort/shareBookPage?book_id=69d4a1dbeeb941714f008339&title=reelshort');
  console.log(res.data.substring(0, 500));
}
run();
