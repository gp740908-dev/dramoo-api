const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
$('img[alt^="Episode "]').each((i, el) => {
  let parent = $(el).parent();
  while(parent.length && parent.prop('tagName') !== 'BODY') {
    if (parent.attr('href') || parent.attr('onClick') || parent.attr('class')?.includes('Episode')) {
      console.log('Parent', parent.prop('tagName'), parent.attr('class'), parent.attr('href'));
      break;
    }
    parent = parent.parent();
  }
});
