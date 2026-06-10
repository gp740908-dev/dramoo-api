const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: "new"
  });
  
  const page = await browser.newPage();
  const url = 'https://netshort.com/id/episode/bangkrutkan-suami-selingkuh-2054462935575953409';
  
  console.log('Navigating to', url);
  
  let videoUrl = null;
  // Intercept network requests to catch video/m3u8 URLs
  page.on('request', request => {
    const reqUrl = request.url();
    if (reqUrl.includes('.m3u8') || reqUrl.includes('.mp4') || reqUrl.includes('vod')) {
      // Netshort might use standard video extensions or something specific in the URL.
      if (!videoUrl && (reqUrl.endsWith('.mp4') || reqUrl.endsWith('.m3u8'))) {
        videoUrl = reqUrl;
        console.log('Caught video URL from network:', videoUrl);
      }
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if there's a video tag
    const videoTagSrc = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? v.src : null;
    });
    
    if (videoTagSrc) {
       console.log('Found video tag src:', videoTagSrc);
       videoUrl = videoUrl || videoTagSrc;
    }
    
    // Also try to get episode list info
    const episodes = await page.evaluate(() => {
      const eps = [];
      const items = document.querySelectorAll('.episode-list-item, [class*="episode"]'); // Adjust selector as needed
      items.forEach(el => {
        if (el.innerText.match(/^\d+/)) {
           eps.push(el.innerText.trim());
        }
      });
      return eps.slice(0, 5); // Return a few just to test
    });
    
    console.log('Episodes extracted (sample):', episodes);
    
    // See if RSC payload has it (React Server Components)
    const rscData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
         if (s.innerText.includes('video_url') || s.innerText.includes('m3u8')) {
            return s.innerText.substring(0, 200) + '...';
         }
      }
      return null;
    });
    
    if (rscData) {
       console.log('Found RSC data containing video keyword:', rscData);
    }

  } catch(e) {
    console.error('Error navigating:', e.message);
  } finally {
    await browser.close();
  }
})();
