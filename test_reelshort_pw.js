const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('request', req => {
    if (req.url().includes('api') || req.url().includes('book') || req.url().includes('episode')) {
      console.log('Request:', req.url());
    }
  });
  await page.goto('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1', { waitUntil: 'networkidle' });
  await browser.close();
}
run();
