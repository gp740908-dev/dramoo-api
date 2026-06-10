const ReelShortScraper = require('./src/scrapers/ReelShortScraper');
async function test() {
    const scraper = new ReelShortScraper();
    console.log('Testing getStreamUrl (ep 2)...');
    const stream2 = await scraper.getStreamUrl('https://www.reelshort.com/id/episodes/episode-1-699d1eefa3a7262cff05534b-adj8qcpiob?ep=2');
    console.log(stream2);
}
test();
