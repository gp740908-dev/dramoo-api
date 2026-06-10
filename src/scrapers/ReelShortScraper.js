const BaseScraper = require('./BaseScraper');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

class ReelShortScraper extends BaseScraper {
    constructor() {
        super('ReelShort', 'https://www.reelshort.com');
    }

    async getLatest() {
        try {
            const res = await axios.get(`${this.baseUrl}/id`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const $ = cheerio.load(res.data);
            const nextData = $('#__NEXT_DATA__').html();
            const json = JSON.parse(nextData);
            const fallback = json.props.pageProps.fallback['/api/video/hall/info'];
            
            const results = [];
            if (fallback && fallback.bookShelfList) {
                for (const shelf of fallback.bookShelfList) {
                    if (shelf.books && shelf.books.length > 0) {
                        for (const item of shelf.books) {
                            if (item.start_play && item.start_play.chapter_id) {
                                results.push({
                                    title: item.book_title,
                                    thumbnail: item.book_pic,
                                    url: `${this.baseUrl}/id/episodes/episode-1-${item.book_id}-${item.start_play.chapter_id}?playTime=1`,
                                    episodes: item.chapter_count || item.chapter_list?.length || 0
                                });
                            }
                        }
                    }
                }
            }
            
            // Remove duplicates
            const uniqueResults = [];
            const seen = new Set();
            for (const r of results) {
                if (!seen.has(r.title)) {
                    seen.add(r.title);
                    uniqueResults.push(r);
                }
            }
            
            return { success: true, data: uniqueResults };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async search(keyword) {
        try {
            const url = `${this.baseUrl}/id/search?keywords=${encodeURIComponent(keyword)}&type=movies&keyword=${encodeURIComponent(keyword)}`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const $ = cheerio.load(res.data);
            const nextData = $('#__NEXT_DATA__').html();
            const json = JSON.parse(nextData);
            
            const results = [];
            const books = json.props?.pageProps?.books || [];
            
            for (const item of books) {
                if (item.start_play && item.start_play.chapter_id) {
                    results.push({
                        title: item.book_title,
                        thumbnail: item.book_pic,
                        url: `${this.baseUrl}/id/episodes/episode-1-${item.book_id}-${item.start_play.chapter_id}?playTime=1`,
                        episodes: item.chapter_count || 0
                    });
                }
            }
            return { success: true, data: results };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getDetail(url) {
        try {
            // Strip any ?ep= params if present from internal passing
            const baseUrl = url.split('?')[0];
            const res = await axios.get(baseUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const $ = cheerio.load(res.data);
            const nextData = $('#__NEXT_DATA__').html();
            const json = JSON.parse(nextData);
            const data = json.props?.pageProps?.data;
            
            if (!data) throw new Error('Data not found in Next.js props');
            
            const episode_list = [];
            const chapterCount = data.chapter_count || 1;
            
            for (let i = 1; i <= chapterCount; i++) {
                episode_list.push({
                    episode: i,
                    title: `Episode ${i}`,
                    // Embed the episode number so getStreamUrl knows what to do
                    url: `${baseUrl}?ep=${i}`
                });
            }
            
            return {
                success: true,
                data: {
                    title: data.book_title,
                    thumbnail: data.book_pic,
                    description: data.special_desc || data.chapter_desc || '',
                    episodes: episode_list
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getStreamUrl(url) {
        let browser;
        try {
            const urlObj = new URL(url);
            const ep = parseInt(urlObj.searchParams.get('ep') || '1');
            const baseUrl = url.split('?')[0];
            
            if (ep === 1) {
                // Fast path: get it from JSON
                const res = await axios.get(baseUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                const $ = cheerio.load(res.data);
                const nextData = $('#__NEXT_DATA__').html();
                const json = JSON.parse(nextData);
                const data = json.props?.pageProps?.data;
                if (data && data.video_url) {
                    return { success: true, data: { url: data.video_url } };
                }
            }
            
            // Slow path: Playwright to click the episode number
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            let m3u8Url = null;
            page.on('request', req => {
                if (req.url().includes('m3u8')) {
                    m3u8Url = req.url();
                }
            });
            
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('div.w-480px', { timeout: 10000 });
            
            const eps = await page.$$('div.w-480px div');
            let clicked = false;
            for (const el of eps) {
                const text = await el.innerText();
                if (text.trim() === String(ep)) {
                    await el.click();
                    clicked = true;
                    break;
                }
            }
            
            if (!clicked) {
                throw new Error('Episode button not found');
            }
            
            // Wait for m3u8 request
            await page.waitForResponse(res => res.url().includes('m3u8') && res.status() === 200, { timeout: 15000 });
            
            if (m3u8Url) {
                return { success: true, data: { url: m3u8Url } };
            } else {
                throw new Error('m3u8 URL not found in network requests');
            }
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            if (browser) {
                await browser.close().catch(() => {});
            }
        }
    }
}

module.exports = ReelShortScraper;
