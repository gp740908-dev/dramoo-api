const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'dramawave_broken.png', fullPage: true });
  await browser.close();
})();
