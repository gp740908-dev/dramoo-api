const fs = require('fs');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
const id = 'adj8qcpiob';
const regex = new RegExp(`.{0,50}${id}.{0,50}`, 'g');
const matches = [...html.matchAll(regex)];
console.log('Matches:', matches.length);
if (matches.length) {
  console.log(matches.slice(0, 5).map(m => m[0]).join('\n'));
}
