const fs = require('fs');
const data = JSON.parse(fs.readFileSync('reelshort_episode.json', 'utf8'));

function printKeys(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return;
  if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
          console.log(prefix + '[0]');
          printKeys(obj[0], prefix + '  ');
      }
      return;
  }
  for (const k in obj) {
    console.log(prefix + k);
    if (k !== '__namespaces') {
        printKeys(obj[k], prefix + '  ');
    }
  }
}

printKeys(data.props.pageProps);
