const { chromium } = require('playwright');

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
      console.log('URL:', req.url());
      console.log('Headers:', req.headers());
    }
  });

  try {
    await page.goto('https://dramawave.dramaflixs.com/', { waitUntil: 'networkidle', timeout: 30000 });
  } catch(e) {} finally {
    await browser.close();
  }
})();
