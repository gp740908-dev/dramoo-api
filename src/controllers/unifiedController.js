const axios = require('axios');
const NodeCache = require('node-cache');
const adapters = require('../scrapers/adapters');

// Cache untuk 10 menit (600 detik)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

class UnifiedController {
  async getDramas(req, res) {
    const { platform, category, filter } = req.query;

    if (!platform) {
      return res.status(400).json({
        status: 'error',
        message: 'Query parameter "platform" wajib diisi. Contoh: ?platform=melolo'
      });
    }

    const adapter = adapters[platform.toLowerCase()];
    if (!adapter) {
      return res.status(400).json({
        status: 'error',
        message: `Platform '${platform}' tidak ditemukan atau belum didukung di V2.`
      });
    }

    // Cek apakah platform aktif di admin panel (database)
    const { getDb } = require('../config/database');
    const db = getDb();
    const platformRow = db.prepare('SELECT status FROM platforms WHERE id = ?').get(platform.toLowerCase());
    
    if (!platformRow || platformRow.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: `Platform '${platform}' sedang dinonaktifkan atau maintenance.`
      });
    }

    // Generate Cache Key unik dengan page dan query pencarian
    const page = req.query.page || 1;
    const q = req.query.q || '';
    const cacheKey = `v2_dramas_${platform}_${category || 'all'}_${filter || 'all'}_p${page}_q${q}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json({
        status: 'success',
        platform: adapter.platform,
        cached: true,
        pagination: { current_page: parseInt(page), has_next: cachedData.length >= 20 },
        data: cachedData
      });
    }

    try {
      // 1. Build URL
      const targetUrl = adapter.buildUrl(req.query);

      // Graceful handling jika fitur tidak didukung oleh platform
      if (!targetUrl) {
        return res.json({
          status: 'success',
          platform: adapter.platform,
          cached: false,
          data: []
        });
      }

      // 2. Fetch HTML (menggunakan axios dengan User-Agent standar)
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 15000 // 15 detik timeout
      });

      // 3. Parse Data menggunakan adapter
      const parsedData = adapter.parseData(response.data);

      // 4. Set Cache
      if (parsedData && parsedData.length > 0) {
         cache.set(cacheKey, parsedData);
      }

      // 5. Response
      return res.json({
        status: 'success',
        platform: adapter.platform,
        cached: false,
        pagination: { current_page: parseInt(page), has_next: parsedData.length >= 20 },
        data: parsedData
      });

    } catch (error) {
      console.error(`[Unified API Error] Platform: ${platform}`, error.message);
      return res.status(500).json({
        status: 'error',
        platform: platform,
        message: 'Gagal mengambil data dari platform tujuan.',
        error: error.message
      });
    }
  }

  // Endpoint Detail V2 (Membungkus Engine Puppeteer V1 untuk Keseragaman V2)
  async getDramaDetail(req, res) {
    const { platform, id } = req.query;
    if (!platform || !id) {
      return res.status(400).json({ status: 'error', message: 'Parameter platform dan id wajib diisi.' });
    }

    try {
      const cacheKey = `v2_detail_${platform.toLowerCase()}_${id}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json({ status: 'success', cached: true, ...cachedData });
      }

      const scraper = require('../scrapers');
      const platformInstance = scraper.getScraper(platform.toLowerCase());
      if (!platformInstance) {
        return res.status(400).json({ status: 'error', message: 'Platform tidak didukung.' });
      }

      // Decode ID ke URL
      let url = Buffer.from(id, 'base64url').toString('utf8');
      if (!url.startsWith('http')) {
        try {
          const base = new URL(platformInstance.baseUrl);
          url = new URL(url, base.origin).href;
        } catch (e) {
          url = platformInstance.toAbsoluteUrl(url) || url;
        }
      }

      const result = await scraper.getDetail(platform.toLowerCase(), url);
      
      if (!result || !result.success) {
         return res.status(404).json({ status: 'error', message: 'Detail tidak ditemukan.' });
      }

      const d = result.data || result;
      let rawEpisodes = result.episodes || result.episode_list || d.episodes || [];
      
      // Bersihkan dan hapus duplikat episode
      const uniqueEpisodes = new Map();
      rawEpisodes.forEach((ep, idx) => {
        const titleRaw = (ep.title || '').trim();
        if (titleRaw.toLowerCase().includes('trailer')) return; // Abaikan trailer
        
        const epNum = ep.episode || idx + 1;
        if (!uniqueEpisodes.has(epNum)) {
           uniqueEpisodes.set(epNum, ep);
        }
      });

      const episodes = Array.from(uniqueEpisodes.values()).map((ep, idx) => {
        const epUrl = ep.url || '';
        let epId = '';
        try { epId = Buffer.from(new URL(epUrl).pathname + new URL(epUrl).search).toString('base64url'); } 
        catch (e) { epId = Buffer.from(epUrl).toString('base64url'); }
        
        return {
          episode_id: epId || `ep_${ep.episode}`,
          episode_number: ep.episode,
          title: ep.title || `Episode ${ep.episode}`
        };
      });

      // Fetch related dramas for "You may also like" using trending logic
      let relatedDramas = [];
      try {
        const trendingRes = await scraper.getTrending(platform.toLowerCase(), 1, null, 'id', true);
        if (trendingRes && trendingRes.success && trendingRes.data) {
          // Exclude current drama and take top 6
          relatedDramas = trendingRes.data.filter(item => item.id !== id).slice(0, 6);
        }
      } catch (err) {
        // Ignore errors for related dramas
      }

      const responseData = {
        platform: platform.toLowerCase(),
        data: {
          id: id,
          title: d.title || 'No Title',
          cover_url: d.thumbnail || d.cover_url || '',
          description: d.description || '',
          genre: Array.isArray(d.genre) ? d.genre : (d.genre ? d.genre.split(',').map(s => s.trim()) : []),
          status: d.status || 'unknown',
          episodes_count: episodes.length,
          episodes_list: episodes,
          related_dramas: relatedDramas
        }
      };

      // Cache for 30 minutes
      cache.set(cacheKey, responseData, 1800);

      return res.json({
        status: 'success',
        cached: false,
        ...responseData
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Endpoint Stream V2
  async getDramaStream(req, res) {
    const { platform, episode_id } = req.query;
    if (!platform || !episode_id) {
      return res.status(400).json({ status: 'error', message: 'Parameter platform dan episode_id wajib diisi.' });
    }

    try {
      const cacheKey = `v2_stream_${platform.toLowerCase()}_${episode_id}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json({ status: 'success', cached: true, ...cachedData });
      }

      const scraper = require('../scrapers');
      const platformInstance = scraper.getScraper(platform.toLowerCase());
      if (!platformInstance) {
        return res.status(400).json({ status: 'error', message: 'Platform tidak didukung.' });
      }

      let epUrl = Buffer.from(episode_id, 'base64url').toString('utf8');
      if (!epUrl.startsWith('http')) {
        try {
          const base = new URL(platformInstance.baseUrl);
          epUrl = new URL(epUrl, base.origin).href;
        } catch (e) {
          epUrl = platformInstance.toAbsoluteUrl(epUrl) || epUrl;
        }
      }

      // Set timeout agar Puppeteer bisa bekerja
      res.setTimeout(60000);

      const stream = await platformInstance.getStreamUrl(epUrl);
      if (!stream.success) {
        return res.status(500).json({ status: 'error', message: stream.error || 'Gagal mengambil video stream' });
      }

      const responseData = {
        platform: platform.toLowerCase(),
        data: {
          episode_id: episode_id,
          stream_url: stream.data?.stream_url || stream.primary || stream.stream_urls?.[0],
          type: stream.data?.type || 'mp4',
          all_resolutions: stream.stream_urls || []
        }
      };

      // Cache for 10 minutes to prevent DDoS on Puppeteer
      cache.set(cacheKey, responseData, 600);

      return res.json({
        status: 'success',
        cached: false,
        ...responseData
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Endpoint All Episodes Stream
  async getDramaAllEpisodeStream(req, res) {
    // Mendukung /api/v2/platform/allepisode?id=... (platform dari params atau query)
    const platform = req.params.platform || req.query.platform || 'melolo';
    const dramaId = req.query.id;
    if (!dramaId) {
      return res.status(400).json({ status: 'error', message: 'Parameter id wajib diisi.' });
    }

    try {
      const cacheKey = `v2_allep_${platform.toLowerCase()}_${dramaId}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.json({ status: 'success', cached: true, ...cachedData });
      }

      const scraper = require('../scrapers');
      const platformInstance = scraper.getScraper(platform.toLowerCase());
      if (!platformInstance) {
        return res.status(400).json({ status: 'error', message: 'Platform tidak didukung.' });
      }

      let dramaUrl = Buffer.from(dramaId, 'base64url').toString('utf8');
      if (!dramaUrl.startsWith('http')) {
        try {
          const base = new URL(platformInstance.baseUrl);
          dramaUrl = new URL(dramaUrl, base.origin).href;
        } catch (e) {
          dramaUrl = platformInstance.toAbsoluteUrl(dramaUrl) || dramaUrl;
        }
      }

      const detail = await platformInstance.getDetail(dramaUrl);
      if (!detail.success || !detail.data) {
        return res.status(404).json({ status: 'error', message: 'Drama tidak ditemukan' });
      }

      const d = detail.data;
      const episodesList = detail.episodes || detail.episode_list || d.episodes || d.episode_list || [];

      // Konkurensi sangat dibatasi agar server tidak timeout
      const maxConcurrent = 1;
      const results = [];
      for (let i = 0; i < episodesList.length; i += maxConcurrent) {
        const batch = episodesList.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(batch.map(async (ep, idx) => {
          let videoUrl = ep._raw_mp4 || ep._raw_m3u8 || '';
          let streamUrls = videoUrl ? [videoUrl] : [];
          
          if (!videoUrl && ep.url) {
            try {
              const streamData = await platformInstance.getStreamUrl(ep.url);
              if (streamData.success) {
                videoUrl = streamData.data?.stream_url || streamData.primary || streamData.stream_urls?.[0];
                streamUrls = streamData.stream_urls || (videoUrl ? [videoUrl] : []);
              }
            } catch (err) {
              console.error(`Error fetching stream for ep ${ep.episode}:`, err.message);
            }
          }
          
          const qualityList = [];
          if (videoUrl) {
            qualityList.push({
              backupUrl: videoUrl,
              bitrate: 337524,
              codec: "bytevc1",
              label: videoUrl.includes('.m3u8') ? "auto" : "720p",
              url: videoUrl
            });
          }

          return {
            locked: false,
            number: ep.episode || (i + idx + 1),
            qualityList: qualityList,
            vid: `ep_${ep.episode || (i + idx + 1)}`,
            videoUrl: videoUrl
          };
        }));
        results.push(...batchResults);
      }

      const responseData = {
        cover: d.thumbnail || d.cover_url || '',
        description: d.description || '',
        episodes: results
      };

      // Cache sangat panjang karena endpoint ini mahal (1 jam)
      cache.set(cacheKey, responseData, 3600);

      return res.json({
        status: 'success',
        cached: false,
        ...responseData
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Endpoint Trending V2
  async getDramaTrending(req, res) {
    const { platform, page } = req.query;
    if (!platform) return res.status(400).json({ status: 'error', message: 'Parameter platform wajib diisi.' });

    try {
      const scraper = require('../scrapers');
      const result = await scraper.getTrending(platform.toLowerCase(), parseInt(page) || 1, null, 'id', true);
      if (!result.success) return res.status(500).json({ status: 'error', message: 'Gagal mengambil data trending.' });

      return res.json({
        status: 'success',
        platform: platform.toLowerCase(),
        pagination: { current_page: parseInt(page) || 1, has_next: result.data && result.data.length >= 10 },
        data: result.data.map(item => ({
          id: item.id || Buffer.from(item.url || '').toString('base64url'),
          title: item.title,
          cover_url: item.thumbnail || item.cover_url || '',
          episodes_count: item.episodes || null,
          rating: item.rating || null,
          genre: item.genre || [],
          status: item.status || 'unknown'
        }))
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Endpoint Latest V2
  async getDramaLatest(req, res) {
    const { platform, page } = req.query;
    if (!platform) return res.status(400).json({ status: 'error', message: 'Parameter platform wajib diisi.' });

    try {
      const scraper = require('../scrapers');
      const result = await scraper.getLatest(platform.toLowerCase(), parseInt(page) || 1, true);
      if (!result.success) return res.status(500).json({ status: 'error', message: 'Gagal mengambil data terbaru.' });

      return res.json({
        status: 'success',
        platform: platform.toLowerCase(),
        pagination: { current_page: parseInt(page) || 1, has_next: result.data && result.data.length >= 10 },
        data: result.data.map(item => ({
          id: item.id || Buffer.from(item.url || '').toString('base64url'),
          title: item.title,
          cover_url: item.thumbnail || item.cover_url || '',
          episodes_count: item.episodes || null,
          rating: item.rating || null,
          genre: item.genre || [],
          status: item.status || 'unknown'
        }))
      });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = new UnifiedController();
