const fs = require('fs');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const match = html.match(/(https?:\/\/[^"'\\]*(?:chapter|episode)[^"'\\]*)/i);
if (match) {
    console.log(match[0]);
} else {
    console.log('Not found');
}
