const ReelShortScraper = require('./src/scrapers/ReelShortScraper');
async function test() {
    const scraper = new ReelShortScraper();
    
    console.log('Testing getLatest...');
    const latest = await scraper.getLatest();
    console.log(latest.success ? latest.data.slice(0, 2) : latest);
    
    console.log('\nTesting search...');
    const search = await scraper.search('love');
    console.log(search.success ? search.data.slice(0, 2) : search);
    
    if (search.success && search.data.length > 0) {
        console.log('\nTesting getDetail...');
        const detail = await scraper.getDetail(search.data[0].url);
        if (detail.success) {
            console.log(detail.data.title);
            console.log('Episodes:', detail.data.episode_list.length);
            console.log(detail.data.episode_list.slice(0, 2));
            
            console.log('\nTesting getStreamUrl (ep 1)...');
            const stream1 = await scraper.getStreamUrl(detail.data.episode_list[0].url);
            console.log(stream1);
        } else {
            console.log(detail);
        }
    }
}
test();
