#!/bin/bash

# ========================================
# Application Deployment Script
# ========================================
# Run this after setup-vps.sh and uploading your project
# Usage: chmod +x deploy-app.sh && ./deploy-app.sh

set -e

echo "========================================"
echo "OptigoBroker Deployment Script"
echo "========================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/home/optigobroker/app"
SERVER_DIR="$APP_DIR/edutradex/server"
CLIENT_DIR="$APP_DIR/edutradex/client"

# Check if we're in the right directory
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}Error: Server directory not found at $SERVER_DIR${NC}"
    echo "Make sure you've uploaded your project files first."
    exit 1
fi

# Get domain
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN

echo ""
echo -e "${GREEN}[1/7] Installing server dependencies...${NC}"
cd $SERVER_DIR
npm install

echo -e "${GREEN}[2/7] Building server...${NC}"
npm run build

echo -e "${GREEN}[3/7] Running database migrations...${NC}"
npx prisma generate
npx prisma migrate deploy

echo -e "${GREEN}[4/7] Installing client dependencies...${NC}"
cd $CLIENT_DIR
npm install

echo -e "${GREEN}[5/7] Building client...${NC}"
npm run build

echo -e "${GREEN}[6/7] Setting up PM2...${NC}"
cd $SERVER_DIR

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'optigobroker-api',
      script: 'dist/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 delete optigobroker-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}[7/7] Configuring Nginx...${NC}"

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/optigobroker.conf > /dev/null << EOF
# API Server (Backend)
upstream api_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# API subdomain
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }
}

# Main domain (Frontend)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $CLIENT_DIR/.next/standalone;

    location /_next/static {
        alias $CLIENT_DIR/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias $CLIENT_DIR/public;
        expires 1y;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Start Next.js with PM2
cd $CLIENT_DIR
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'optigobroker-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
    },
  ],
};
EOF

pm2 delete optigobroker-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "========================================"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo "========================================"
echo ""
echo "Your application is now running:"
echo "  - API: http://api.$DOMAIN"
echo "  - Web: http://$DOMAIN"
echo ""
echo -e "${YELLOW}Next step: Setup SSL certificates${NC}"
echo "Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          - Check status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all apps"
echo "  pm2 monit           - Monitor resources"
echo ""
