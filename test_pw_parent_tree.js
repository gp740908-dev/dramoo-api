const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
$('img[alt="Episode 2"]').each((i, el) => {
  let parent = $(el).parent();
  while(parent.length && parent.prop('tagName') !== 'BODY') {
    console.log(parent.prop('tagName'), parent.attr('class'));
    parent = parent.parent();
  }
});
