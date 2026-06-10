const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);
const eps = [];
$('[class*="EpisodeItem"]').each((i, el) => {
  const text = $(el).text().trim();
  const url = $(el).attr('href') || $(el).find('a').attr('href');
  eps.push({ text, url });
});
console.log('Eps count:', eps.length);
if (eps.length) {
  console.log(eps.slice(0, 3));
} else {
  // Try to find any list items inside the episode drawer
  const alist = [];
  $('a[href*="/id/episodes/"]').each((i, el) => {
      alist.push({
          text: $(el).text().trim(),
          href: $(el).attr('href')
      });
  });
  console.log('A tags with /id/episodes/ :', alist.length);
  console.log(alist.slice(0, 5));
}
