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
  
  const responses = [];
  page.on('response', res => {
    if(res.url().includes('api') || res.url().includes('json')) {
      responses.push(res.url());
    }
  });

  try {
    await page.goto('https://dramawave.dramaflixs.com/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Title:', await page.title());
    await page.screenshot({ path: 'dramawave.png', fullPage: true });
    
    // Wait for a bit
    await page.waitForTimeout(5000);
    console.log('Network APIs:', responses);
    
    // dump html
    fs.writeFileSync('dramawave.html', await page.content());
    console.log('Success!');
  } catch(e) {
    console.log('Error:', e);
    await page.screenshot({ path: 'dramawave_error.png' });
  } finally {
    await browser.close();
  }
})();
