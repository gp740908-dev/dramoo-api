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
  
  page.on('response', async res => {
    if(res.url().includes('api/dramawave')) {
      console.log('--- RES --- URL:', res.url());
      try {
        const json = await res.json();
        if (res.url().includes('detail')) fs.writeFileSync('dw_detail.json', JSON.stringify(json, null, 2));
        if (res.url().includes('play')) fs.writeFileSync('dw_play.json', JSON.stringify(json, null, 2));
      } catch(e) {}
    }
  });

  try {
    await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('Detail loaded');
    
    await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty/episode/1', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('Episode loaded');
    
  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
