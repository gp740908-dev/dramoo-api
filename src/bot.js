// src/bot.js
// Telegram Bot Dramoo — Pembelian & Pengiriman API Key

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createApiKey, upsertUser, formatDateID, formatRupiah, cleanOldLogs } = require('./utils/keyGenerator');
const { getDb } = require('./config/database');
const { v4: uuidv4 } = require('uuid');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 Dramoo Bot berjalan...');

// ─── HELPER ──────────────────────────────────────────────────────────────────
function getPackages() {
  const db = getDb();
  return db.prepare('SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC').all();
}

function getPackageById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(id);
}

function getPlatformsByPackage(packageId) {
  const db = getDb();
  return db.prepare(`
    SELECT p.name FROM platforms p
    JOIN package_platforms pp ON p.id = pp.platform_id
    WHERE pp.package_id = ?
    ORDER BY p.name
  `).all(packageId);
}

function getUserKeys(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT ak.*, p.name AS package_name
    FROM api_keys ak
    JOIN packages p ON ak.package_id = p.id
    WHERE ak.user_id = ?
    ORDER BY ak.created_at DESC
  `).all(userId);
}

function isAdmin(chatId) {
  return String(chatId) === String(ADMIN_ID);
}

// Simpan state percakapan sementara
const userState = new Map();

// ─── MENU UTAMA ───────────────────────────────────────────────────────────────
function sendMainMenu(chatId, name) {
  const text = `🎬 *Selamat datang di Dramoo API!* ${name ? `, ${name}` : ''}

Layanan API aggregator terlengkap untuk *38+ platform drama pendek Asia*.

Pilih menu di bawah:`;

  const opts = {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '📦 Lihat Paket' }, { text: '🔑 API Key Saya' }],
        [{ text: '📊 Cek Status Platform' }, { text: '📖 Cara Pakai' }],
        [{ text: '💬 Hubungi Admin' }],
      ],
      resize_keyboard: true,
    },
  };
  bot.sendMessage(chatId, text, opts);
}

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const { id: chatId, first_name, username } = msg.from;
  const name = first_name || username || '';
  upsertUser(chatId, username, `${first_name || ''} ${msg.from.last_name || ''}`.trim());
  sendMainMenu(chatId, name);
});

// ─── LIHAT PAKET ─────────────────────────────────────────────────────────────
bot.onText(/📦 Lihat Paket/, (msg) => {
  const chatId = msg.chat.id;
  const packages = getPackages();

  let text = '📦 *Daftar Paket Dramoo API*\n\n';

  for (const pkg of packages) {
    const popular = pkg.is_popular ? '⭐ *POPULER* ' : '';
    const platforms = getPlatformsByPackage(pkg.id);
    text += `${popular}*${pkg.name.toUpperCase()}*\n`;
    text += `💰 ${formatRupiah(pkg.price)} / ${pkg.duration_days} hari\n`;
    text += `🎬 ${pkg.platform_count} Platform\n`;
    text += `📊 Limit: ${(pkg.daily_limit / 1000).toFixed(0)}K req/hari\n`;
    text += `📝 ${pkg.description}\n\n`;
  }

  text += 'Pilih paket untuk membeli:';

  const buttons = packages.map(pkg => [{ text: `Beli ${pkg.name} - ${formatRupiah(pkg.price)}` }]);
  buttons.push([{ text: '🏠 Menu Utama' }]);

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { keyboard: buttons, resize_keyboard: true },
  });
});

// ─── BELI PAKET ──────────────────────────────────────────────────────────────
bot.onText(/^Beli (.+) - Rp(.+)$/, (msg, match) => {
  const chatId = msg.chat.id;
  const packageName = match[1].trim().toLowerCase();
  const packages = getPackages();
  const pkg = packages.find(p => p.name.toLowerCase() === packageName);

  if (!pkg) {
    return bot.sendMessage(chatId, '❌ Paket tidak ditemukan.');
  }

  const platforms = getPlatformsByPackage(pkg.id);
  const platformList = platforms.map(p => `• ${p.name}`).join('\n');

  userState.set(chatId, { step: 'awaiting_payment_confirm', packageId: pkg.id });

  const text = `🛒 *Detail Pembelian*

📦 Paket: *${pkg.name}*
💰 Harga: *${formatRupiah(pkg.price)}*
⏳ Masa aktif: *${pkg.duration_days} hari*
🎬 Platform (${pkg.platform_count}):
${platformList}

*Cara Pembayaran:*
1. Transfer ke Saweria: saweria.co/dramoo
2. Nominal: *${formatRupiah(pkg.price)}*
3. Isi catatan: *TG_${chatId}*
4. Kirim bukti pembayaran di bawah ini

Kirim bukti pembayaran (screenshot):`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [[{ text: '❌ Batal' }]],
      resize_keyboard: true,
    },
  });
});

// ─── TERIMA BUKTI PEMBAYARAN ─────────────────────────────────────────────────
bot.on('photo', (msg) => {
  const chatId = msg.chat.id;
  const state = userState.get(chatId);

  if (!state || state.step !== 'awaiting_payment_confirm') {
    return;
  }

  const { packageId } = state;
  const pkg = getPackageById(packageId);

  // Kirim ke admin untuk konfirmasi
  const adminText = `🔔 *Pembayaran Baru!*

👤 User: @${msg.from.username || 'N/A'} (${msg.from.first_name || ''})
🆔 Telegram ID: \`${chatId}\`
📦 Paket: *${pkg.name}* - ${formatRupiah(pkg.price)}

Ketik /approve_${chatId}_${packageId} untuk setujui
Ketik /reject_${chatId} untuk tolak`;

  // Forward foto ke admin
  if (ADMIN_ID) {
    bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);
    bot.sendMessage(ADMIN_ID, adminText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: `✅ Approve ${pkg.name}`, callback_data: `approve_${chatId}_${packageId}` },
            { text: '❌ Reject', callback_data: `reject_${chatId}` },
          ],
        ],
      },
    });
  }

  userState.set(chatId, { step: 'waiting_approval', packageId });

  bot.sendMessage(chatId, `✅ *Bukti pembayaran diterima!*

Sedang diverifikasi oleh admin. Biasanya *dalam 1-5 menit* API key akan dikirimkan.

Terima kasih sudah menggunakan Dramoo API! 🙏`, { parse_mode: 'Markdown' });
});

// ─── ADMIN: APPROVE VIA INLINE BUTTON ────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const adminChatId = query.message.chat.id;

  if (!isAdmin(adminChatId)) {
    return bot.answerCallbackQuery(query.id, { text: '❌ Bukan admin' });
  }

  const data = query.data;

  if (data.startsWith('approve_')) {
    const parts = data.split('_');
    const targetChatId = parts[1];
    const packageId = parts[2];
    await processApproval(adminChatId, targetChatId, packageId, query);
  } else if (data.startsWith('reject_')) {
    const targetChatId = data.split('_')[1];
    userState.delete(parseInt(targetChatId));
    bot.sendMessage(parseInt(targetChatId), `❌ *Pembayaran ditolak.*

Bukti pembayaran tidak valid. Silakan coba lagi atau hubungi admin.`, { parse_mode: 'Markdown' });
    bot.answerCallbackQuery(query.id, { text: '✅ Ditolak' });
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: adminChatId, message_id: query.message.message_id });
  }
});

async function processApproval(adminChatId, targetChatId, packageId, callbackQuery) {
  try {
    const db = getDb();
    const targetId = parseInt(targetChatId);

    // Upsert user
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(targetId));
    if (!user) {
      const userId = uuidv4();
      db.prepare('INSERT OR IGNORE INTO users (id, telegram_id) VALUES (?, ?)').run(userId, String(targetId));
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    // Buat API key
    const keyData = createApiKey(user.id, packageId, 'Approved via Telegram Bot');

    // Catat transaksi
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(packageId);
    db.prepare(`
      INSERT INTO transactions (id, user_id, package_id, api_key_id, amount, status, payment_method)
      VALUES (?, ?, ?, ?, ?, 'paid', 'saweria')
    `).run(uuidv4(), user.id, packageId, keyData.id, pkg.price);

    // Kirim key ke user
    const expiresFormatted = formatDateID(keyData.expires_at);
    const successText = `🎉 *Pembayaran Dikonfirmasi!*

*API Key Anda:*
\`${keyData.api_key}\`

📦 Paket: *${keyData.package_name}*
⏳ Berlaku hingga: *${expiresFormatted}*
📊 Limit: *${(keyData.daily_limit / 1000).toFixed(0)}K request/hari*

*Cara pakai:*
\`\`\`
curl -H "X-Api-Key: ${keyData.api_key}" \\
  https://api.dramoo.id/api/validate
\`\`\`

📖 Dokumentasi: https://dramoo.id/#api-docs
💬 Support: @dramoobot

Selamat menggunakan Dramoo API! 🚀`;

    await bot.sendMessage(targetId, successText, { parse_mode: 'Markdown' });

    // Update admin
    if (callbackQuery) {
      bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Key terkirim!' });
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: adminChatId,
        message_id: callbackQuery.message.message_id,
      });
      bot.sendMessage(adminChatId, `✅ API Key berhasil dikirim ke user ${targetChatId}\nKey: \`${keyData.api_key}\``, { parse_mode: 'Markdown' });
    }

    userState.delete(targetId);
  } catch (err) {
    console.error('Error approve:', err);
    bot.sendMessage(adminChatId, `❌ Error: ${err.message}`);
  }
}

// ─── ADMIN COMMANDS ──────────────────────────────────────────────────────────

// /admin_approve <telegram_id> <package_id>
bot.onText(/\/admin_approve (\d+) (\w+)/, async (msg, match) => {
  if (!isAdmin(msg.chat.id)) return;
  await processApproval(msg.chat.id, match[1], match[2], null);
  bot.sendMessage(msg.chat.id, '✅ Done');
});

// /admin_revoke <api_key>
bot.onText(/\/admin_revoke (.+)/, (msg, match) => {
  if (!isAdmin(msg.chat.id)) return;
  const db = getDb();
  const result = db.prepare("UPDATE api_keys SET status = 'revoked' WHERE api_key = ?").run(match[1].trim());
  bot.sendMessage(msg.chat.id, result.changes > 0 ? '✅ Key dicabut' : '❌ Key tidak ditemukan');
});

// /admin_stats
bot.onText(/\/admin_stats/, (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM api_keys').get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE status = 'active'").get().c;
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalReq = db.prepare('SELECT SUM(total_used) as s FROM api_keys').get().s || 0;

  bot.sendMessage(msg.chat.id,
    `📊 *Stats Dramoo*\n\n👥 Users: ${users}\n🔑 Keys: ${total} (aktif: ${active})\n📡 Total requests: ${totalReq.toLocaleString('id-ID')}`,
    { parse_mode: 'Markdown' }
  );
});

// ─── CEK API KEY ──────────────────────────────────────────────────────────────
bot.onText(/🔑 API Key Saya/, (msg) => {
  const chatId = msg.chat.id;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(chatId));

  if (!user) {
    return bot.sendMessage(chatId, '❌ Kamu belum memiliki API key. Beli paket dulu!');
  }

  const keys = getUserKeys(user.id);

  if (keys.length === 0) {
    return bot.sendMessage(chatId, '❌ Belum ada API key. Beli paket dulu!');
  }

  const now = new Date();
  let text = '🔑 *API Key Kamu:*\n\n';

  for (const k of keys.slice(0, 5)) {
    const isExpired = new Date(k.expires_at) < now;
    const status = isExpired ? '❌ Expired' : k.status === 'active' ? '✅ Aktif' : `⚠️ ${k.status}`;
    const daysLeft = isExpired ? 0 : Math.ceil((new Date(k.expires_at) - now) / (1000 * 60 * 60 * 24));

    text += `📦 *${k.package_name}* ${status}\n`;
    text += `🔑 \`${k.api_key}\`\n`;
    if (!isExpired) text += `⏳ Sisa: *${daysLeft} hari*\n`;
    else text += `📅 Expired: ${formatDateID(k.expires_at)}\n`;
    text += `📊 Terpakai: ${k.total_used.toLocaleString('id-ID')} req\n\n`;
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── STATUS PLATFORM ──────────────────────────────────────────────────────────
bot.onText(/📊 Cek Status Platform/, (msg) => {
  const chatId = msg.chat.id;
  const db = getDb();
  const platforms = db.prepare("SELECT name, status FROM platforms ORDER BY name").all();

  const active = platforms.filter(p => p.status === 'active');
  const maintenance = platforms.filter(p => p.status === 'maintenance');
  const coming = platforms.filter(p => p.status === 'coming_soon');

  let text = `📊 *Status Platform Dramoo*\n\n`;
  text += `✅ Aktif: ${active.length}\n`;
  text += `🔧 Maintenance: ${maintenance.length}\n`;
  text += `🔜 Coming Soon: ${coming.length}\n\n`;

  text += `*✅ Platform Aktif:*\n${active.map(p => `• ${p.name}`).join('\n')}\n\n`;
  if (maintenance.length > 0) text += `*🔧 Maintenance:*\n${maintenance.map(p => `• ${p.name}`).join('\n')}\n\n`;
  if (coming.length > 0) text += `*🔜 Coming Soon:*\n${coming.map(p => `• ${p.name}`).join('\n')}`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// ─── CARA PAKAI ───────────────────────────────────────────────────────────────
bot.onText(/📖 Cara Pakai/, (msg) => {
  const text = `📖 *Cara Menggunakan Dramoo API*

*1. Autentikasi*
Tambahkan API key ke setiap request:
\`\`\`
# Header (direkomendasikan)
X-Api-Key: drm_xxxxxxxxxxxx

# Query parameter
?key=drm_xxxxxxxxxxxx
\`\`\`

*2. Endpoint Utama*
\`\`\`
GET /api/status       — Status semua platform
GET /api/validate     — Cek validitas key
GET /api/me           — Info akun & akses
GET /api/platforms    — Platform yang bisa diakses
\`\`\`

*3. Contoh Request*
\`\`\`bash
curl -H "X-Api-Key: KODE_KAMU" \\
  https://api.dramoo.id/api/validate
\`\`\`

📚 Dokumentasi lengkap: https://dramoo.id/#api-docs`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

// ─── HUBUNGI ADMIN ────────────────────────────────────────────────────────────
bot.onText(/💬 Hubungi Admin/, (msg) => {
  bot.sendMessage(msg.chat.id, `💬 *Hubungi Admin*\n\nUntuk bantuan, pertanyaan, atau laporan masalah:\n\n👤 Admin: @${process.env.TELEGRAM_ADMIN_USERNAME || 'dramoo_admin'}\n📱 Grup: t.me/dramoo_community\n\nJam respons: Senin–Minggu, 08.00–22.00 WIB`, { parse_mode: 'Markdown' });
});

// ─── BATAL ────────────────────────────────────────────────────────────────────
bot.onText(/❌ Batal|\/cancel|🏠 Menu Utama/, (msg) => {
  userState.delete(msg.chat.id);
  sendMainMenu(msg.chat.id, msg.from.first_name);
});

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

module.exports = bot;
