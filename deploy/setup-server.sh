#!/bin/bash

# =================================
# VGP API - Server Setup Script
# For AlmaLinux 9 (IONOS VPS)
# =================================

set -e

echo "🚀 VGP API Server Setup"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Variables
DOMAIN="api.votredomaine.com"
APP_DIR="/opt/vgp-api"
APP_USER="vgp"

echo -e "${YELLOW}1. Installing dependencies...${NC}"
dnf update -y
dnf install -y curl git nginx certbot python3-certbot-nginx

# Install Bun
echo -e "${YELLOW}2. Installing Bun...${NC}"
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Create app user
echo -e "${YELLOW}3. Creating app user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -s /bin/false $APP_USER
fi

# Create directories
echo -e "${YELLOW}4. Creating directories...${NC}"
mkdir -p $APP_DIR
mkdir -p /var/log/vgp-api
chown -R $APP_USER:$APP_USER $APP_DIR
chown -R $APP_USER:$APP_USER /var/log/vgp-api

# Setup Nginx
echo -e "${YELLOW}5. Setting up Nginx...${NC}"
systemctl enable nginx
systemctl start nginx

# Firewall
echo -e "${YELLOW}6. Configuring firewall...${NC}"
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# SSL Certificate
echo -e "${YELLOW}7. Getting SSL certificate...${NC}"
echo -e "${YELLOW}Run this command after DNS is configured:${NC}"
echo "certbot --nginx -d $DOMAIN"

# Install PM2 globally (optional, alternative to Docker)
echo -e "${YELLOW}8. Installing PM2...${NC}"
npm install -g pm2
pm2 startup

echo ""
echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy your application to $APP_DIR"
echo "2. Create .env file from .env.example"
echo "3. Configure Nginx: cp deploy/nginx.conf /etc/nginx/sites-available/vgp-api"
echo "4. Enable site: ln -s /etc/nginx/sites-available/vgp-api /etc/nginx/sites-enabled/"
echo "5. Get SSL: certbot --nginx -d $DOMAIN"
echo "6. Start with PM2: pm2 start deploy/ecosystem.config.js --env production"
echo "   OR with Docker: docker-compose up -d"
