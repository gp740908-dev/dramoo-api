// scripts/seed.js
// Isi data awal: platform & paket

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/dramoo.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// ─── PLATFORMS ──────────────────────────────────────────────────────────────
const platforms = [
  // Tier 1 — Paket Starter
  { id: 'dramabox',    name: 'DramaBox',    logo_url: '/logos/dramabox.svg',    tier: 1, status: 'active',       api_url: 'https://dramabox.dramoo.id/api.html',    tags: 'china,romance' },
  { id: 'reelshort',   name: 'ReelShort',   logo_url: '/logos/reelshort.svg',   tier: 1, status: 'active',       api_url: 'https://reelshort.dramoo.id/api.html',   tags: 'usa,romance,thriller' },
  { id: 'microdrama',  name: 'MicroDrama',  logo_url: '/logos/microdrama.svg',  tier: 1, status: 'active',       api_url: 'https://microdrama.dramoo.id/api.html',  tags: 'asia' },
  { id: 'goodshort',   name: 'GoodShort',   logo_url: '/logos/goodshort.svg',   tier: 1, status: 'active',       api_url: 'https://goodshort.dramoo.id/api.html',   tags: 'asia,comedy' },
  { id: 'shortmax',    name: 'ShortMax',    logo_url: '/logos/shortmax.svg',    tier: 1, status: 'active',       api_url: 'https://shortmax.dramoo.id/api.html',    tags: 'asia' },
  { id: 'idrama',      name: 'iDrama',      logo_url: '/logos/idrama.svg',      tier: 1, status: 'active',       api_url: 'https://idrama.dramoo.id/api.html',      tags: 'korea,japan' },
  { id: 'netshort',    name: 'NetShort',    logo_url: '/logos/netshort.svg',    tier: 1, status: 'active',       api_url: 'https://netshort.dramoo.id/api.html',    tags: 'china' },
  { id: 'dotdrama',    name: 'DotDrama',    logo_url: '/logos/dotdrama.svg',    tier: 1, status: 'active',       api_url: 'https://dotdrama.dramoo.id/api.html',    tags: 'china,thriller' },
  { id: 'rapidtv',     name: 'RapidTV',     logo_url: '/logos/rapidtv.svg',     tier: 1, status: 'active',       api_url: 'https://rapidtv.dramoo.id/api.html',     tags: 'asia' },
  { id: 'stardusttv',  name: 'StardustTV',  logo_url: '/logos/stardusttv.svg',  tier: 1, status: 'active',       api_url: 'https://stardusttv.dramoo.id/api.html',  tags: 'romance' },
  { id: 'velolo',      name: 'Velolo',      logo_url: '/logos/velolo.svg',      tier: 1, status: 'active',       api_url: 'https://velolo.dramoo.id/api.html',      tags: 'asia' },
  { id: 'reelife',     name: 'Reelife',     logo_url: '/logos/reelife.svg',     tier: 1, status: 'active',       api_url: 'https://reelife.dramoo.id/api.html',     tags: 'asia' },

  // Tier 2 — Paket Standard
  { id: 'bilitv',      name: 'BiliTV',      logo_url: '/logos/bilitv.svg',      tier: 2, status: 'active',       api_url: 'https://bilitv.dramoo.id/api.html',      tags: 'china,anime' },
  { id: 'cubetv',      name: 'CubeTV',      logo_url: '/logos/cubetv.svg',      tier: 2, status: 'active',       api_url: 'https://cubetv.dramoo.id/api.html',      tags: 'asia' },
  { id: 'dramawave',   name: 'DramaWave',   logo_url: '/logos/dramawave.svg',   tier: 2, status: 'active',       api_url: 'https://dramawave.dramoo.id/api.html',   tags: 'korea' },
  { id: 'dramanova',   name: 'DramaNova',   logo_url: '/logos/dramanova.svg',   tier: 2, status: 'active',       api_url: 'https://dramanova.dramoo.id/api.html',   tags: 'china,romance' },
  { id: 'flextv',      name: 'FlexTV',      logo_url: '/logos/flextv.svg',      tier: 2, status: 'maintenance',  api_url: null,                                     tags: 'usa' },
  { id: 'flickreels',  name: 'FlickReels',  logo_url: '/logos/flickreels.svg',  tier: 2, status: 'active',       api_url: 'https://flickreels.dramoo.id/api.html',  tags: 'romance,thriller' },
  { id: 'freereels',   name: 'FreeReels',   logo_url: '/logos/freereels.svg',   tier: 2, status: 'active',       api_url: 'https://freereels.dramoo.id/api.html',   tags: 'asia' },
  { id: 'fundrama',    name: 'FunDrama',    logo_url: '/logos/fundrama.svg',    tier: 2, status: 'active',       api_url: 'https://fundrama.dramoo.id/api.html',    tags: 'comedy,asia' },
  { id: 'happyshort',  name: 'HappyShort',  logo_url: '/logos/happyshort.svg',  tier: 2, status: 'active',       api_url: 'https://happyshort.dramoo.id/api.html',  tags: 'comedy' },
  { id: 'melolo',      name: 'Melolo',      logo_url: '/logos/melolo.svg',      tier: 2, status: 'active',       api_url: 'https://melolo.dramoo.id/api.html',      tags: 'romance' },
  { id: 'starshort',   name: 'StarShort',   logo_url: '/logos/starshort.svg',   tier: 2, status: 'active',       api_url: 'https://starshort.dramoo.id/api.html',   tags: 'romance,comedy' },
  { id: 'vigloo',      name: 'Vigloo',      logo_url: '/logos/vigloo.svg',      tier: 2, status: 'active',       api_url: 'https://vigloo.dramoo.id/api.html',      tags: 'asia' },
  { id: 'reelala',     name: 'Reelala',     logo_url: '/logos/reelala.svg',     tier: 2, status: 'maintenance',  api_url: null,                                     tags: 'asia' },
  { id: 'shortwave',   name: 'ShortsWave',  logo_url: '/logos/shortwave.svg',   tier: 2, status: 'active',       api_url: 'https://shortwave.dramoo.id/api.html',   tags: 'thriller,action' },
  { id: 'serialplus',  name: 'Serial+',     logo_url: '/logos/serialplus.svg',  tier: 2, status: 'active',       api_url: 'https://serialplus.dramoo.id/api.html',  tags: 'romance,drama' },
  { id: 'dramawave2',  name: 'DramaWave+',  logo_url: '/logos/dramawave.svg',   tier: 2, status: 'active',       api_url: 'https://dramawave2.dramoo.id/api.html',  tags: 'korea,japan' },

  // Tier 3 — Paket Pro & Ultimate
  { id: 'flareflow',   name: 'FlareFlow',   logo_url: '/logos/flareflow.svg',   tier: 3, status: 'active',       api_url: 'https://flareflow.dramoo.id/api.html',   tags: 'action,thriller' },
  { id: 'moboreels',   name: 'MoboReels',   logo_url: '/logos/moboreels.svg',   tier: 3, status: 'active',       api_url: 'https://moboreels.dramoo.id/api.html',   tags: 'asia' },
  { id: 'pinedrama',   name: 'PineDrama',   logo_url: '/logos/pinedrama.svg',   tier: 3, status: 'active',       api_url: 'https://pinedrama.dramoo.id/api.html',   tags: 'romance' },
  { id: 'reelbuzz',    name: 'ReelBuzz',    logo_url: '/logos/reelbuzz.svg',    tier: 3, status: 'active',       api_url: 'https://reelbuzz.dramoo.id/api.html',    tags: 'comedy,romance' },

  // Tier 4 — Ultimate Only
  { id: 'anyreel',     name: 'Anyreel',     logo_url: '/logos/anyreel.svg',     tier: 4, status: 'active',       api_url: 'https://anyreel.dramoo.id/api.html',     tags: 'asia' },
  { id: 'bonustv',     name: 'BonusTV',     logo_url: '/logos/bonustv.svg',     tier: 4, status: 'active',       api_url: 'https://bonustv.dramoo.id/api.html',     tags: 'asia' },
  { id: 'golddrama',   name: 'Gold Drama',  logo_url: '/logos/golddrama.svg',   tier: 4, status: 'active',       api_url: 'https://golddrama.dramoo.id/api.html',   tags: 'china,romance' },
  { id: 'minitv',      name: 'MiniTV',      logo_url: '/logos/minitv.svg',      tier: 4, status: 'active',       api_url: 'https://minitv.dramoo.id/api.html',      tags: 'india,asia' },
  { id: 'raptdrama',   name: 'RaptDrama',   logo_url: '/logos/raptdrama.svg',   tier: 4, status: 'active',       api_url: 'https://raptdrama.dramoo.id/api.html',   tags: 'action,thriller' },
  { id: 'iqiyi',       name: 'iQIYI',       logo_url: '/logos/iqiyi.svg',       tier: 4, status: 'coming_soon',  api_url: null,                                     tags: 'china,korea' },
];

// ─── PACKAGES ────────────────────────────────────────────────────────────────
const packages = [
  {
    id: 'starter',
    name: 'Starter',
    price: 40000,
    duration_days: 30,
    platform_count: 12,
    daily_limit: 100000,
    tier_access: 1,
    is_popular: 0,
    description: 'Cocok untuk pemula, akses 12 platform populer',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 65000,
    duration_days: 35,
    platform_count: 27,
    daily_limit: 500000,
    tier_access: 2,
    is_popular: 1,
    description: 'Paling populer! Akses 27 platform termasuk DramaBox & ReelShort',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79000,
    duration_days: 35,
    platform_count: 32,
    daily_limit: 700000,
    tier_access: 3,
    is_popular: 0,
    description: 'Untuk developer serius, akses 32 platform + platform eksklusif',
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 129000,
    duration_days: 30,
    platform_count: 37,
    daily_limit: 900000,
    tier_access: 4,
    is_popular: 0,
    description: 'Akses penuh semua platform, limit request terbesar',
  },
];

const insertPlatform = db.prepare(`
  INSERT OR REPLACE INTO platforms (id, name, logo_url, tier, status, api_url, tags)
  VALUES (@id, @name, @logo_url, @tier, @status, @api_url, @tags)
`);

const insertPackage = db.prepare(`
  INSERT OR REPLACE INTO packages (id, name, price, duration_days, platform_count, daily_limit, tier_access, is_popular, description)
  VALUES (@id, @name, @price, @duration_days, @platform_count, @daily_limit, @tier_access, @is_popular, @description)
`);

const insertPackagePlatform = db.prepare(`
  INSERT OR IGNORE INTO package_platforms (package_id, platform_id) VALUES (?, ?)
`);

const seed = db.transaction(() => {
  // Insert platforms
  for (const p of platforms) {
    insertPlatform.run(p);
  }
  console.log(`✅ ${platforms.length} platform di-seed`);

  // Insert packages
  for (const pkg of packages) {
    insertPackage.run(pkg);
  }
  console.log(`✅ ${packages.length} paket di-seed`);

  // Map platforms ke packages berdasarkan tier
  for (const pkg of packages) {
    const accessible = platforms.filter(p => p.tier <= pkg.tier_access && p.status !== 'coming_soon');
    for (const p of accessible) {
      insertPackagePlatform.run(pkg.id, p.id);
    }
    console.log(`   📦 ${pkg.name}: ${accessible.length} platform`);
  }
  console.log('✅ Package-platform mapping selesai');
});

seed();
db.close();
console.log('\n🎉 Seed data selesai!');
