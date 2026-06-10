const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  const apis = [];
  page.on('response', async (res) => {
    const url = res.url();
    // Catch JSON responses
    try {
      const type = res.headers()['content-type'] || '';
      if (type.includes('json') || type.includes('application/json')) {
        const json = await res.json();
        apis.push({ url, json });
      }
    } catch(e) {}
  });

  try {
    await page.goto('https://netshort.com/id', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.error('Goto error:', e.message);
  }
  
  fs.writeFileSync('netshort_apis.json', JSON.stringify(apis, null, 2));
  console.log('Saved network API data to netshort_apis.json');
  await browser.close();
})();
