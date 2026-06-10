const scraperManager = require('./src/scrapers');

(async () => {
  console.log('Testing NetShort Scraper...');
  try {
    const latest = await scraperManager.getLatest('netshort', 1, false);
    console.log('Latest success:', latest.success);
    console.log('Latest items count:', latest.data.length);
    if (latest.data.length > 0) {
      console.log('Sample item:', latest.data[0]);
      
      const detailUrl = latest.data[0].url;
      console.log('\nFetching detail for:', detailUrl);
      const detail = await scraperManager.getDetail('netshort', detailUrl, false);
      console.log('Detail success:', detail.success);
      console.log('Detail info:', detail.data.title, 'Episodes:', detail.data.episodes.length);
      
      if (detail.data.episodes.length > 0) {
        const epUrl = detail.data.episodes[0].url;
        console.log('\nFetching stream for episode:', epUrl);
        const stream = await scraperManager.getStreamUrl('netshort', epUrl);
        console.log('Stream success:', stream.success);
        console.log('Stream URL:', stream.data.stream_url);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
})();
