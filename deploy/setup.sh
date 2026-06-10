#!/bin/bash
# deploy/setup.sh
# Script setup otomatis Dramoo API di VPS Ubuntu 22.04/24.04
# Jalankan sebagai root: bash setup.sh

set -e  # Stop jika ada error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ██████╗ ██████╗  █████╗ ███╗   ███╗ ██████╗  ██████╗ "
echo "  ██╔══██╗██╔══██╗██╔══██╗████╗ ████║██╔═══██╗██╔═══██╗"
echo "  ██║  ██║██████╔╝███████║██╔████╔██║██║   ██║██║   ██║"
echo "  ██║  ██║██╔══██╗██╔══██║██║╚██╔╝██║██║   ██║██║   ██║"
echo "  ██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║╚██████╔╝╚██████╔╝"
echo "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝ "
echo -e "${NC}"
echo -e "${GREEN}🎬 Dramoo API — Setup Otomatis VPS${NC}"
echo "=================================================="

# ─── CEK ROOT ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Script ini harus dijalankan sebagai root${NC}"
   exit 1
fi

DOMAIN=""
BOT_TOKEN=""
ADMIN_ID=""

# ─── INPUT ───────────────────────────────────────────────────────────────────
echo ""
read -p "🌐 Masukkan domain API (contoh: api.wmxservices.store): " DOMAIN
read -p "🤖 Token Bot Telegram (dari @BotFather): " BOT_TOKEN
read -p "👤 Telegram User ID Admin: " ADMIN_ID
read -s -p "🔐 Master Key admin API (buat yang panjang): " MASTER_KEY
echo ""

if [[ -z "$DOMAIN" || -z "$BOT_TOKEN" || -z "$ADMIN_ID" || -z "$MASTER_KEY" ]]; then
  echo -e "${RED}❌ Semua field wajib diisi!${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}📦 Mengupdate sistem...${NC}"
apt-get update -qq && apt-get upgrade -y -qq

# ─── INSTALL NODE.JS 20 ──────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Menginstall Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1
echo -e "${GREEN}✅ Node.js $(node -v) terinstall${NC}"

# ─── INSTALL PM2 ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Menginstall PM2...${NC}"
npm install -g pm2 > /dev/null 2>&1
echo -e "${GREEN}✅ PM2 $(pm2 -v) terinstall${NC}"

# ─── INSTALL NGINX ───────────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Menginstall Nginx...${NC}"
apt-get install -y nginx > /dev/null 2>&1
systemctl enable nginx > /dev/null 2>&1
echo -e "${GREEN}✅ Nginx terinstall${NC}"

# ─── INSTALL CERTBOT ─────────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Menginstall Certbot...${NC}"
apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}✅ Certbot terinstall${NC}"

# ─── SETUP DIREKTORI ─────────────────────────────────────────────────────────
echo -e "${YELLOW}📁 Setup direktori aplikasi...${NC}"
APP_DIR="/var/www/dramoo"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/data $APP_DIR/logs $APP_DIR/public/logos

# ─── COPY FILE APLIKASI ──────────────────────────────────────────────────────
echo -e "${YELLOW}📁 Menyalin file aplikasi...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

cp -r "$PARENT_DIR"/* $APP_DIR/ 2>/dev/null || true
cd $APP_DIR

# ─── BUAT .env ───────────────────────────────────────────────────────────────
echo -e "${YELLOW}⚙️  Membuat file .env...${NC}"
JWT_SECRET=$(openssl rand -hex 32)

cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=3000
APP_NAME=Dramoo
APP_URL=https://$DOMAIN

MASTER_KEY=$MASTER_KEY
JWT_SECRET=$JWT_SECRET

DB_PATH=./data/dramoo.db

TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_ADMIN_ID=$ADMIN_ID
TELEGRAM_GROUP_ID=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000
DAILY_REQUEST_LIMIT=900000

LOG_LEVEL=info
EOF

chmod 600 $APP_DIR/.env
echo -e "${GREEN}✅ .env dibuat${NC}"

# ─── INSTALL DEPENDENCIES ────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Menginstall npm dependencies...${NC}"
cd $APP_DIR
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies terinstall${NC}"

# ─── MIGRASI DATABASE ────────────────────────────────────────────────────────
echo -e "${YELLOW}🗄️  Membuat database...${NC}"
node scripts/migrate.js
node scripts/seed.js
echo -e "${GREEN}✅ Database siap${NC}"

# ─── KONFIGURASI NGINX ───────────────────────────────────────────────────────
echo -e "${YELLOW}🌐 Konfigurasi Nginx...${NC}"
cp $APP_DIR/nginx/dramoo.conf /etc/nginx/sites-available/dramoo

# Ganti placeholder domain
sed -i "s/api.wmxservices.store/$DOMAIN/g" /etc/nginx/sites-available/dramoo

# Buat konfigurasi sementara (HTTP only dulu, sebelum SSL)
cat > /etc/nginx/sites-available/dramoo-temp << EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/dramoo-temp /etc/nginx/sites-enabled/dramoo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo -e "${GREEN}✅ Nginx dikonfigurasi${NC}"

# ─── START APLIKASI ──────────────────────────────────────────────────────────
echo -e "${YELLOW}🚀 Menjalankan aplikasi...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -1 | bash > /dev/null 2>&1
echo -e "${GREEN}✅ Aplikasi berjalan${NC}"

# ─── SSL CERTIFICATE ─────────────────────────────────────────────────────────
echo -e "${YELLOW}🔒 Menginstall SSL certificate...${NC}"
echo -e "${YELLOW}   (Pastikan DNS domain $DOMAIN sudah mengarah ke IP VPS ini)${NC}"
read -p "   Tekan ENTER untuk lanjut..."

certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m "admin@${DOMAIN#*.}" --redirect || {
  echo -e "${YELLOW}⚠️  SSL gagal. Bisa diinstall manual nanti: certbot --nginx -d $DOMAIN${NC}"
}

# Aktifkan nginx config dengan SSL
ln -sf /etc/nginx/sites-available/dramoo /etc/nginx/sites-enabled/dramoo
rm -f /etc/nginx/sites-available/dramoo-temp
nginx -t && systemctl reload nginx

# ─── FIREWALL ────────────────────────────────────────────────────────────────
echo -e "${YELLOW}🛡️  Konfigurasi firewall...${NC}"
ufw allow ssh > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo -e "${GREEN}✅ Firewall aktif (SSH + HTTP + HTTPS)${NC}"

# ─── SELESAI ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=================================================="
echo "  🎉 DRAMOO API BERHASIL DIINSTALL!"
echo "=================================================="
echo ""
echo "  🌐 API URL  : https://$DOMAIN"
echo "  📊 Health   : https://$DOMAIN/health"
echo "  📋 Status   : https://$DOMAIN/api/status"
echo "  🤖 Bot      : aktif di Telegram"
echo ""
echo "  PM2 Commands:"
echo "  pm2 status          — Cek status proses"
echo "  pm2 logs dramoo-api — Lihat log API"
echo "  pm2 logs dramoo-bot — Lihat log bot"
echo "  pm2 restart all     — Restart semua"
echo ""
echo "  Admin API:"
echo "  Header: X-Master-Key: $MASTER_KEY"
echo "  GET https://$DOMAIN/admin/stats"
echo ""
echo -e "==================================================${NC}"
