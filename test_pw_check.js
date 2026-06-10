const fs = require('fs');
const html = fs.readFileSync('reelshort_pw_html.html', 'utf8');
if (html.includes('<video')) {
  console.log('Video tag found!');
} else {
  console.log('No video tag.');
}
if (html.includes('Episode 2') || html.includes('episode-2')) {
  console.log('Episode 2 found!');
} else {
  console.log('No Episode 2.');
}
console.log(html.substring(0, 500));
