# Déploiement VGP API sur IONOS VPS

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        IONOS VPS                            │
│                     (AlmaLinux 9)                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │   Nginx     │───▶│  VGP API    │───▶│  MySQL IONOS    │ │
│  │ (HTTPS/LB)  │    │  (Bun/Hono) │    │  (External DB)  │ │
│  │  :443/:80   │    │    :3000    │    │                 │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Prérequis

- VPS IONOS avec AlmaLinux 9
- Accès SSH root
- Domaine configuré (ex: `api.votredomaine.com`)
- Base MySQL IONOS existante

## 1. Préparation du serveur

```bash
# Connexion SSH
ssh root@votre-ip-ionos

# Télécharger et exécuter le script de setup
curl -fsSL https://raw.githubusercontent.com/votre-repo/vgp-api/main/deploy/setup-server.sh | bash
```

Ou manuellement :

```bash
# Mise à jour système
dnf update -y

# Installer les dépendances
dnf install -y curl git nginx certbot python3-certbot-nginx

# Installer Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Créer l'utilisateur applicatif
useradd -r -s /bin/false vgp

# Créer les répertoires
mkdir -p /opt/vgp-api
mkdir -p /var/log/vgp-api
chown -R vgp:vgp /opt/vgp-api /var/log/vgp-api
```

## 2. Déploiement de l'application

### Option A : Docker (Recommandé)

```bash
# Cloner le repo
cd /opt/vgp-api
git clone https://github.com/votre-repo/vgp-api.git .

# Copier et configurer .env
cp .env.example .env
nano .env  # Configurer les variables

# Lancer avec Docker Compose
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

### Option B : PM2 (Sans Docker)

```bash
# Cloner le repo
cd /opt/vgp-api
git clone https://github.com/votre-repo/vgp-api.git .

# Installer les dépendances
bun install --production

# Copier et configurer .env
cp .env.example .env
nano .env  # Configurer les variables

# Installer PM2
npm install -g pm2

# Lancer l'application
pm2 start deploy/ecosystem.config.js --env production

# Sauvegarder la config PM2
pm2 save
pm2 startup
```

## 3. Configuration Nginx

```bash
# Copier la config Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/vgp-api

# Éditer le domaine
nano /etc/nginx/sites-available/vgp-api
# Remplacer api.votredomaine.com par votre domaine

# Créer le lien symbolique
mkdir -p /etc/nginx/sites-enabled
ln -sf /etc/nginx/sites-available/vgp-api /etc/nginx/sites-enabled/

# Inclure sites-enabled dans nginx.conf si nécessaire
echo "include /etc/nginx/sites-enabled/*;" >> /etc/nginx/nginx.conf

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

## 4. Certificat SSL (Let's Encrypt)

```bash
# Obtenir le certificat
certbot --nginx -d api.votredomaine.com

# Vérifier le renouvellement automatique
certbot renew --dry-run
```

## 5. Configuration .env

```env
# Production
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database MySQL IONOS
DB_HOST=db5019429787.hosting-data.io
DB_PORT=3306
DB_NAME=vgpdb
DB_USER=votre_user
DB_PASSWORD=votre_password
DB_SSL=false
DB_CONNECTION_LIMIT=10

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Security
CORS_ORIGINS=https://app.votredomaine.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## 6. Commandes utiles

### Docker

```bash
# Voir les logs
docker-compose logs -f api

# Redémarrer
docker-compose restart api

# Mise à jour
git pull
docker-compose build --no-cache
docker-compose up -d

# Arrêter
docker-compose down
```

### PM2

```bash
# Status
pm2 status

# Logs
pm2 logs vgp-api

# Redémarrer
pm2 restart vgp-api

# Mise à jour
git pull
bun install --production
pm2 restart vgp-api

# Moniteur
pm2 monit
```

### Nginx

```bash
# Tester config
nginx -t

# Recharger
systemctl reload nginx

# Logs
tail -f /var/log/nginx/vgp-api-access.log
tail -f /var/log/nginx/vgp-api-error.log
```

## 7. Monitoring

### Health Check

```bash
# Vérifier l'API
curl https://api.votredomaine.com/health

# Réponse attendue
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "v1",
  "checks": {
    "database": "connected"
  }
}
```

### Logs structurés

Les logs sont au format JSON pour faciliter l'analyse :

```bash
# PM2
tail -f /var/log/vgp-api/out.log | jq

# Docker
docker-compose logs -f api | jq
```

## 8. Sécurité

### Firewall

```bash
# Ouvrir uniquement HTTP/HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Vérifier
firewall-cmd --list-all
```

### Fail2ban (optionnel)

```bash
dnf install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

## 9. Backup

### Base de données

```bash
# Script de backup
cat > /opt/vgp-api/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > /opt/backups/vgp_$DATE.sql
gzip /opt/backups/vgp_$DATE.sql
find /opt/backups -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/vgp-api/backup.sh

# Cron quotidien
echo "0 2 * * * /opt/vgp-api/backup.sh" | crontab -
```

## 10. Mise à jour de l'application mobile

Après déploiement, mettez à jour l'URL API dans l'app mobile :

```typescript
// lib/trpc.ts ou config
const API_URL = 'https://api.votredomaine.com/api/trpc';
```

## Troubleshooting

### L'API ne répond pas

```bash
# Vérifier le process
pm2 status  # ou docker-compose ps

# Vérifier les logs
pm2 logs vgp-api --lines 100

# Vérifier le port
netstat -tlnp | grep 3000
```

### Erreur de connexion DB

```bash
# Tester la connexion MySQL
mysql -h db5019429787.hosting-data.io -u user -p -e "SELECT 1"

# Vérifier les variables d'env
cat .env | grep DB_
```

### Erreur SSL

```bash
# Renouveler le certificat
certbot renew --force-renewal

# Vérifier Nginx
nginx -t
```
