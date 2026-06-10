#!/bin/bash
# deploy/update.sh
# Update Dramoo API ke versi terbaru

set -e
APP_DIR="/var/www/dramoo"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Mengupdate Dramoo API...${NC}"
cd $APP_DIR

# Backup database
cp data/dramoo.db data/dramoo.db.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Database di-backup${NC}"

# Install/update dependencies
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies diupdate${NC}"

# Restart dengan PM2 (zero-downtime)
pm2 reload dramoo-api
pm2 restart dramoo-bot
echo -e "${GREEN}✅ Aplikasi di-reload${NC}"

echo -e "${GREEN}🎉 Update selesai!${NC}"
pm2 status
