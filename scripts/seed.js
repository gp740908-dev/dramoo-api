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
  { id: 'dramabox',    name: 'DramaBox',    logo_url: 'https://api-drama.dobda.id/logo/dramabox.png',    tier: 1, status: 'active',       api_url: 'https://dramabox.api.wmxservices.store/api.html',    tags: 'china,romance' },
  { id: 'reelshort',   name: 'ReelShort',   logo_url: 'https://api-drama.dobda.id/logo/reelshort.png',   tier: 1, status: 'active',       api_url: 'https://reelshort.api.wmxservices.store/api.html',   tags: 'usa,romance,thriller' },
  { id: 'microdrama',  name: 'MicroDrama',  logo_url: 'https://api-drama.dobda.id/logo/microdrama.png',  tier: 1, status: 'active',       api_url: 'https://microdrama.api.wmxservices.store/api.html',  tags: 'asia' },
  { id: 'goodshort',   name: 'GoodShort',   logo_url: 'https://api-drama.dobda.id/logo/goodshort.png',   tier: 1, status: 'active',       api_url: 'https://goodshort.api.wmxservices.store/api.html',   tags: 'asia,comedy' },
  { id: 'shortmax',    name: 'ShortMax',    logo_url: 'https://api-drama.dobda.id/logo/shortmax.png',    tier: 1, status: 'active',       api_url: 'https://shortmax.api.wmxservices.store/api.html',    tags: 'asia' },
  { id: 'idrama',      name: 'iDrama',      logo_url: 'https://api-drama.dobda.id/logo/idrama.png',      tier: 1, status: 'active',       api_url: 'https://idrama.api.wmxservices.store/api.html',      tags: 'korea,japan' },
  { id: 'netshort',    name: 'NetShort',    logo_url: 'https://api-drama.dobda.id/logo/netshort.png',    tier: 1, status: 'active',       api_url: 'https://netshort.api.wmxservices.store/api.html',    tags: 'china' },
  { id: 'dotdrama',    name: 'DotDrama',    logo_url: 'https://api-drama.dobda.id/logo/dotdrama.png',    tier: 1, status: 'active',       api_url: 'https://dotdrama.api.wmxservices.store/api.html',    tags: 'china,thriller' },
  { id: 'rapidtv',     name: 'RapidTV',     logo_url: 'https://api-drama.dobda.id/logo/rapidtv.png',     tier: 1, status: 'active',       api_url: 'https://rapidtv.api.wmxservices.store/api.html',     tags: 'asia' },
  { id: 'stardusttv',  name: 'StardustTV',  logo_url: 'https://api-drama.dobda.id/logo/stardusttv.png',  tier: 1, status: 'active',       api_url: 'https://stardusttv.api.wmxservices.store/api.html',  tags: 'romance' },
  { id: 'velolo',      name: 'Velolo',      logo_url: 'https://api-drama.dobda.id/logo/velolo.png',      tier: 1, status: 'active',       api_url: 'https://velolo.api.wmxservices.store/api.html',      tags: 'asia' },
  { id: 'reelife',     name: 'Reelife',     logo_url: 'https://api-drama.dobda.id/logo/reelife.png',     tier: 1, status: 'active',       api_url: 'https://reelife.api.wmxservices.store/api.html',     tags: 'asia' },

  // Tier 2 — Paket Standard
  { id: 'bilitv',      name: 'BiliTV',      logo_url: 'https://api-drama.dobda.id/logo/bilitv.png',      tier: 2, status: 'active',       api_url: 'https://bilitv.api.wmxservices.store/api.html',      tags: 'china,anime' },
  { id: 'cubetv',      name: 'CubeTV',      logo_url: 'https://api-drama.dobda.id/logo/cubetv.png',      tier: 2, status: 'active',       api_url: 'https://cubetv.api.wmxservices.store/api.html',      tags: 'asia' },
  { id: 'dramawave',   name: 'DramaWave',   logo_url: 'https://api-drama.dobda.id/logo/dramawave.png',   tier: 2, status: 'active',       api_url: 'https://dramawave.api.wmxservices.store/api.html',   tags: 'korea' },
  { id: 'dramanova',   name: 'DramaNova',   logo_url: 'https://api-drama.dobda.id/logo/dramanova.png',   tier: 2, status: 'active',       api_url: 'https://dramanova.api.wmxservices.store/api.html',   tags: 'china,romance' },
  { id: 'flextv',      name: 'FlexTV',      logo_url: 'https://api-drama.dobda.id/logo/flextv.png',      tier: 2, status: 'maintenance',  api_url: null,                                     tags: 'usa' },
  { id: 'flickreels',  name: 'FlickReels',  logo_url: 'https://api-drama.dobda.id/logo/flickreels.png',  tier: 2, status: 'active',       api_url: 'https://flickreels.api.wmxservices.store/api.html',  tags: 'romance,thriller' },
  { id: 'freereels',   name: 'FreeReels',   logo_url: 'https://api-drama.dobda.id/logo/freereels.png',   tier: 2, status: 'active',       api_url: 'https://freereels.api.wmxservices.store/api.html',   tags: 'asia' },
  { id: 'fundrama',    name: 'FunDrama',    logo_url: 'https://api-drama.dobda.id/logo/fundrama.png',    tier: 2, status: 'active',       api_url: 'https://fundrama.api.wmxservices.store/api.html',    tags: 'comedy,asia' },
  { id: 'happyshort',  name: 'HappyShort',  logo_url: 'https://api-drama.dobda.id/logo/happyshort.png',  tier: 2, status: 'active',       api_url: 'https://happyshort.api.wmxservices.store/api.html',  tags: 'comedy' },
  { id: 'melolo',      name: 'Melolo',      logo_url: 'https://api-drama.dobda.id/logo/melolo.png',      tier: 2, status: 'active',       api_url: 'https://melolo.api.wmxservices.store/api.html',      tags: 'romance' },
  { id: 'starshort',   name: 'StarShort',   logo_url: 'https://api-drama.dobda.id/logo/starshort.png',   tier: 2, status: 'active',       api_url: 'https://starshort.api.wmxservices.store/api.html',   tags: 'romance,comedy' },
  { id: 'vigloo',      name: 'Vigloo',      logo_url: 'https://api-drama.dobda.id/logo/vigloo.png',      tier: 2, status: 'active',       api_url: 'https://vigloo.api.wmxservices.store/api.html',      tags: 'asia' },
  { id: 'reelala',     name: 'Reelala',     logo_url: 'https://api-drama.dobda.id/logo/reelala.png',     tier: 2, status: 'maintenance',  api_url: null,                                     tags: 'asia' },
  { id: 'shortwave',   name: 'ShortsWave',  logo_url: 'https://api-drama.dobda.id/logo/shortwave.png',   tier: 2, status: 'active',       api_url: 'https://shortwave.api.wmxservices.store/api.html',   tags: 'thriller,action' },
  { id: 'serialplus',  name: 'Serial+',     logo_url: 'https://api-drama.dobda.id/logo/serialplus.png',  tier: 2, status: 'active',       api_url: 'https://serialplus.api.wmxservices.store/api.html',  tags: 'romance,drama' },
  { id: 'dramawave2',  name: 'DramaWave+',  logo_url: 'https://api-drama.dobda.id/logo/dramawave.png',   tier: 2, status: 'active',       api_url: 'https://dramawave2.api.wmxservices.store/api.html',  tags: 'korea,japan' },

  // Tier 3 — Paket Pro & Ultimate
  { id: 'flareflow',   name: 'FlareFlow',   logo_url: 'https://api-drama.dobda.id/logo/flareflow.png',   tier: 3, status: 'active',       api_url: 'https://flareflow.api.wmxservices.store/api.html',   tags: 'action,thriller' },
  { id: 'moboreels',   name: 'MoboReels',   logo_url: 'https://api-drama.dobda.id/logo/moboreels.png',   tier: 3, status: 'active',       api_url: 'https://moboreels.api.wmxservices.store/api.html',   tags: 'asia' },
  { id: 'pinedrama',   name: 'PineDrama',   logo_url: 'https://api-drama.dobda.id/logo/pinedrama.png',   tier: 3, status: 'active',       api_url: 'https://pinedrama.api.wmxservices.store/api.html',   tags: 'romance' },
  { id: 'reelbuzz',    name: 'ReelBuzz',    logo_url: 'https://api-drama.dobda.id/logo/reelbuzz.png',    tier: 3, status: 'active',       api_url: 'https://reelbuzz.api.wmxservices.store/api.html',    tags: 'comedy,romance' },

  // Tier 4 — Ultimate Only
  { id: 'anyreel',     name: 'Anyreel',     logo_url: 'https://api-drama.dobda.id/logo/anyreel.png',     tier: 4, status: 'active',       api_url: 'https://anyreel.api.wmxservices.store/api.html',     tags: 'asia' },
  { id: 'bonustv',     name: 'BonusTV',     logo_url: 'https://api-drama.dobda.id/logo/bonustv.png',     tier: 4, status: 'active',       api_url: 'https://bonustv.api.wmxservices.store/api.html',     tags: 'asia' },
  { id: 'golddrama',   name: 'Gold Drama',  logo_url: 'https://api-drama.dobda.id/logo/golddrama.png',   tier: 4, status: 'active',       api_url: 'https://golddrama.api.wmxservices.store/api.html',   tags: 'china,romance' },
  { id: 'minitv',      name: 'MiniTV',      logo_url: 'https://api-drama.dobda.id/logo/minitv.png',      tier: 4, status: 'active',       api_url: 'https://minitv.api.wmxservices.store/api.html',      tags: 'india,asia' },
  { id: 'raptdrama',   name: 'RaptDrama',   logo_url: 'https://api-drama.dobda.id/logo/raptdrama.png',   tier: 4, status: 'active',       api_url: 'https://raptdrama.api.wmxservices.store/api.html',   tags: 'action,thriller' },
  { id: 'iqiyi',       name: 'iQIYI',       logo_url: 'https://api-drama.dobda.id/logo/iqiyi.png',       tier: 4, status: 'coming_soon',  api_url: null,                                     tags: 'china,korea' },
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
