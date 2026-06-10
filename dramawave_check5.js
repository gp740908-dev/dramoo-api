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
    const url = res.url();
    if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) return;
    console.log('RES:', url);
  });

  try {
    console.log('Loading detail...');
    await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Loading search...');
    await page.goto('https://dramawave.dramaflixs.com/search?q=love', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Loading episode...');
    await page.goto('https://dramawave.dramaflixs.com/playlet/PInDoT52ty/episode/1', { waitUntil: 'networkidle', timeout: 30000 });
    
  } catch(e) {
    console.log('Error:', e);
  } finally {
    await browser.close();
  }
})();
