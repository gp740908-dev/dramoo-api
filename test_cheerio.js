const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('klikfilm_search.html', 'utf8');
const $ = cheerio.load(html);
console.log('Cards:', $('.card_film').length);
