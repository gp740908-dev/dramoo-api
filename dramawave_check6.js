const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  const results = [];
  
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('.js') || url.includes('.css') || url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff2|woff)$/i)) return;
    
    let text = '';
    try {
      text = await res.text();
    } catch(e) {}
    
    results.push({
      url,
      status: res.status(),
      headers: res.headers(),
      bodySnippet: text.substring(0, 500)
    });
  });

  try {
    await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
  } catch(e) {} finally {
    fs.writeFileSync('dramawave_network.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
})();
