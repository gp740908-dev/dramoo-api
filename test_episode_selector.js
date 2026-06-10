const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const $ = cheerio.load(html);

// Find the div containing the text "Semua Episode"
let allEpisodesHeader;
$('div').each((i, el) => {
    if ($(el).text().trim() === 'Semua Episode') {
        allEpisodesHeader = $(el);
    }
});
if (allEpisodesHeader) {
    console.log('Found Semua Episode header');
    const container = allEpisodesHeader.next();
    console.log('Container classes:', container.attr('class'));
    const items = container.children();
    console.log('Items count:', items.length);
    if (items.length) {
        console.log('First item classes:', items.first().attr('class'));
        console.log('First item text:', items.first().text());
    }
} else {
    console.log('Semua Episode not found');
}
