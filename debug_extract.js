const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://dramawave.dramaflixs.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000); // wait for content
  
  const raw = await page.evaluate(() => {
    const cards = [];
    const anchors = [...document.querySelectorAll('a[href]')].filter(a => {
      const href = a.getAttribute('href') || '';
      return /\/(drama|series|show|watch|playlet)\//i.test(href) &&
        (a.querySelector('img') || a.querySelector('[class*="title"]'));
    });
    
    // Also just return ALL links to see what they are!
    const allLinks = [...document.querySelectorAll('a[href]')].map(a => a.href);

    for (const anchor of anchors) {
      const img = anchor.querySelector('img');
      cards.push({ title: img ? img.alt : 'no-img', url: anchor.href });
    }
    return { cards, totalAnchors: anchors.length, allLinks: allLinks.slice(0, 5) };
  });
  
  console.log(raw);
  await browser.close();
})();
