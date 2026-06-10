const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  page.on('request', req => {
    if(req.url().includes('api/dramawave')) {
      console.log('--- REQ ---');
      console.log('URL:', req.url());
      console.log('Headers:', req.headers());
    }
  });
  
  page.on('response', async res => {
    if(res.url().includes('api/dramawave')) {
      console.log('--- RES ---');
      console.log('URL:', res.url());
      try {
        const json = await res.json();
        fs.writeFileSync('dramawave_api_dump.json', JSON.stringify(json, null, 2));
        console.log('Dumped API response.');
      } catch(e) {
        console.log('Error reading res json:', e);
      }
    }
  });

  try {
    await page.goto('https://dramawave.dramaflixs.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(10000); // Wait for API calls
  } catch(e) {
    console.log('Navigation error:', e);
  } finally {
    await browser.close();
  }
})();
