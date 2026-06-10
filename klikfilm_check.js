const { chromium, devices } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  // Use a mobile device
  const pixel5 = devices['Pixel 5'];
  const context = await browser.newContext({
    ...pixel5,
  });
  const page = await context.newPage();

  const results = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('.js') || url.includes('.css') || url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff2|woff|ttf)$/i)) return;
    
    let text = '';
    try {
      text = await res.text();
    } catch(e) {}
    
    results.push({ url, status: res.status(), bodySnippet: text.substring(0, 500) });
  });

  try {
    await page.goto('https://klikfilm.com/v3/mobile/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    fs.writeFileSync('klikfilm_home.html', await page.content());
    fs.writeFileSync('klikfilm_network.json', JSON.stringify(results, null, 2));

    // Try to search
    await page.goto('https://klikfilm.com/v3/mobile/search?q=cinta', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    fs.writeFileSync('klikfilm_search.html', await page.content());
    fs.writeFileSync('klikfilm_network_search.json', JSON.stringify(results, null, 2));

    // Try to click the first movie
    const firstMovie = await page.$('.list-item a, .movie-list a, a[href*="movie"]');
    if (firstMovie) {
      const url = await firstMovie.getAttribute('href');
      console.log('Found movie:', url);
      await page.goto(url.startsWith('http') ? url : 'https://klikfilm.com' + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      fs.writeFileSync('klikfilm_detail.html', await page.content());
      fs.writeFileSync('klikfilm_network_detail.json', JSON.stringify(results, null, 2));
    }

  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
