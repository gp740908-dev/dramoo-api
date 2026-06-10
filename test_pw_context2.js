const fs = require('fs');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const index = html.indexOf('alt="Episode 2"');
console.log(html.substring(Math.max(0, index - 500), index + 500));
