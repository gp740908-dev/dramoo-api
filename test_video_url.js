const fs = require('fs');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const nextData = $('#__NEXT_DATA__').html();
const json = JSON.parse(nextData);
console.log('Video URL:', json.props.pageProps.data.video_url);
