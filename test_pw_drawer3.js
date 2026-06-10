const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
const list = [];
$('div.w-480px a').each((i, el) => {
  const text = $(el).text().trim();
  const href = $(el).attr('href');
  if (parseInt(text) > 0) {
      list.push({text, href});
  }
});
console.log('Valid number links:', list.length);
console.log(list.slice(0, 5));
