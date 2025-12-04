#!/bin/bash

# ========================================
# VPS Setup Script for OptigoBroker
# AlmaLinux / RHEL / CentOS Version
# ========================================
# Run this script on a fresh AlmaLinux VPS
# Usage: chmod +x setup-vps.sh && ./setup-vps.sh

set -e

echo "========================================"
echo "OptigoBroker VPS Setup Script (AlmaLinux)"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_USER="optigobroker"
APP_DIR="/home/$APP_USER/app"

# Get domain from user
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
read -p "Enter your email for SSL certificates: " EMAIL

echo ""
echo -e "${YELLOW}Starting setup...${NC}"
echo ""

# Update system
echo -e "${GREEN}[1/10] Updating system...${NC}"
sudo dnf update -y

# Install required packages
echo -e "${GREEN}[2/10] Installing required packages...${NC}"
sudo dnf install -y curl wget git gcc-c++ make

# Install Node.js 20
echo -e "${GREEN}[3/10] Installing Node.js 20...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PostgreSQL
echo -e "${GREEN}[4/10] Installing PostgreSQL...${NC}"
sudo dnf install -y postgresql-server postgresql-contrib

# Initialize PostgreSQL
sudo postgresql-setup --initdb

# Configure PostgreSQL for password authentication
sudo sed -i "s/ident/md5/g" /var/lib/pgsql/data/pg_hba.conf
sudo sed -i "s/peer/md5/g" /var/lib/pgsql/data/pg_hba.conf

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
echo -e "${GREEN}[5/10] Installing Redis...${NC}"
sudo dnf install -y redis
sudo systemctl start redis
sudo systemctl enable redis

# Install Nginx
echo -e "${GREEN}[6/10] Installing Nginx...${NC}"
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
echo -e "${GREEN}[7/10] Configuring firewall...${NC}"
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

# Install PM2
echo -e "${GREEN}[8/10] Installing PM2...${NC}"
sudo npm install -g pm2

# Install Certbot for SSL
echo -e "${GREEN}[9/10] Installing Certbot...${NC}"
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx

# Create application user
echo -e "${GREEN}[10/10] Creating application user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $APP_USER
    echo -e "${YELLOW}Created user: $APP_USER${NC}"
fi

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown -R $APP_USER:$APP_USER /home/$APP_USER

# Setup PostgreSQL database
echo -e "${GREEN}Setting up PostgreSQL database...${NC}"
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

sudo -u postgres psql << EOF
CREATE USER edutradex WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE edutradex OWNER edutradex;
GRANT ALL PRIVILEGES ON DATABASE edutradex TO edutradex;
\c edutradex
GRANT ALL ON SCHEMA public TO edutradex;
EOF

# Restart PostgreSQL to apply config changes
sudo systemctl restart postgresql

echo ""
echo "========================================"
echo -e "${GREEN}VPS SETUP COMPLETE!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}SAVE THIS INFORMATION:${NC}"
echo "========================================"
echo "Database User: edutradex"
echo "Database Name: edutradex"
echo "Database Password: $DB_PASSWORD"
echo ""
echo "DATABASE_URL:"
echo "postgresql://edutradex:$DB_PASSWORD@localhost:5432/edutradex?schema=public"
echo ""
echo "========================================"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Upload your project files to: $APP_DIR"
echo "2. Copy .env.production.example to .env and fill in values"
echo "3. Run the deploy script: ./deploy-app.sh"
echo ""
