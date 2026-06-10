const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testEpisode() {
  try {
    const url = 'https://netshort.com/id/episode/bangkrutkan-suami-selingkuh-2054462935575953409';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    fs.writeFileSync('netshort_episode.html', data);
    console.log('Saved episode HTML');
    
    const $ = cheerio.load(data);
    let videoUrl = $('video').attr('src') || $('source').attr('src');
    
    if (videoUrl) {
      console.log('Found video URL using Cheerio (Metode 1):', videoUrl);
    } else {
      console.log('No video tag found. Checking scripts...');
      const scripts = $('script').map((i, el) => $(el).html()).get();
      const videoMatch = scripts.join('\n').match(/https?:\/\/[^"']+\.(mp4|m3u8)[^"']*/);
      if (videoMatch) {
         console.log('Found video URL in scripts (Regex):', videoMatch[0]);
      } else {
         console.log('Failed to find video URL using Metode 1. Need Metode 2 (Puppeteer/RSC).');
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

testEpisode();
