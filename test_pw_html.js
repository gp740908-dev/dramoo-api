const { chromium } = require('playwright');
const fs = require('fs');
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.reelshort.com/id/episodes/%2Fepisodes%2Fepisode-1-versi-dub-penipuan-jalanan-legenda-bela-diri-699d1eefa3a7262cff05534b-adj8qcpiob?playTime=1', { waitUntil: 'networkidle' });
  const html = await page.content();
  fs.writeFileSync('reelshort_pw_html.html', html);
  await browser.close();
}
run();
