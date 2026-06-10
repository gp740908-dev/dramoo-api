const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
const el = $('div.w-480px');
console.log(el.html().substring(0, 1000));
