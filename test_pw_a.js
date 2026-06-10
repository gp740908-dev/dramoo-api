const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
const list = [];
$('a').each((i, el) => {
  const text = $(el).text();
  if (text.includes('Episode') || text.includes('Eps')) {
    list.push({ text: text.trim(), href: $(el).attr('href') });
  }
});
console.log('Total A tags with Episode:', list.length);
console.log(list.slice(0, 10));
