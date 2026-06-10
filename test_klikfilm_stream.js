const KlikFilmScraper = require('./src/scrapers/KlikFilmScraper');
(async () => {
  const scraper = new KlikFilmScraper();
  try {
    const res = await scraper.getStreamUrl('https://klikfilm.com/v3/mobile/film/detail/5559/49');
    console.log(res);
  } catch(e) {
    console.error(e);
  }
})();
