const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Intercept requests to see m3u8
  let m3u8Url = '';
  page.on('request', req => {
    if (req.url().includes('m3u8')) {
      console.log('M3U8:', req.url());
      m3u8Url = req.url();
    }
  });

  await page.goto('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1', { waitUntil: 'domcontentloaded' });
  
  // Wait for the drawer
  await page.waitForSelector('div.w-480px');
  
  // Find the element with text "2" and click it
  // Since it's a grid of numbers, we can find it by text
  const eps = await page.$$('div.w-480px div');
  let clicked = false;
  for (const ep of eps) {
      const text = await ep.innerText();
      if (text.trim() === '2') {
          console.log('Clicking Episode 2!');
          await ep.click();
          clicked = true;
          break;
      }
  }

  if (clicked) {
      // wait a bit for m3u8 request
      await page.waitForTimeout(5000);
      
      // also check the new URL
      console.log('Current Page URL:', page.url());
  } else {
      console.log('Episode 2 button not found.');
  }

  await browser.close();
}
run();
