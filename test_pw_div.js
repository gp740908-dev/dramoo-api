const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
let output = '';
$('*').each((i, el) => {
  if ($(el).children().length === 0 && $(el).text().includes('Episode 2')) {
    output += $.html($(el).parent()) + '\n\n';
  }
});
console.log(output.substring(0, 1000));
