# BUSINESSFLOW — Production Deployment Guide

This guide describes how to configure, provision, migrate, and deploy the BUSINESSFLOW application to a production environment.

---

## 1. System Requirements

- **Operating System**: Linux (Ubuntu 22.04 LTS recommended) / Docker container
- **Node.js**: v18.x or v20.x LTS
- **Database**: MySQL 8.0 or MariaDB 10.6+
- **Reverse Proxy**: NGINX with SSL termination (Let's Encrypt / Certbot)
- **Process Manager**: PM2 or Docker Compose

---

## 2. Environment Configuration

### Backend `.env` Configuration
In the `server/` root directory, create a production `.env` file based on `.env.example`:

```bash
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=businessflow_prod
DB_USER=businessflow_user
DB_PASS=A_Strong_Random_Password_32_Chars!
DB_POOL_MAX=20
DB_POOL_MIN=5

# JWT Secrets (Generate using `openssl rand -base64 64`)
JWT_SECRET=super_secure_random_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Security & CORS
CORS_ORIGIN=https://app.businessflow.example.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500

# Logging
LOG_LEVEL=info
```

### Frontend `.env` Configuration
In the `client/` root directory, create `.env.production`:

```bash
VITE_API_BASE_URL=https://api.businessflow.example.com/api
```

---

## 3. Database Provisioning & Migrations

### Create Dedicated MySQL User & Database
Log into MySQL as root:
```sql
CREATE DATABASE businessflow_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'businessflow_user'@'localhost' IDENTIFIED BY 'A_Strong_Random_Password_32_Chars!';
GRANT ALL PRIVILEGES ON businessflow_prod.* TO 'businessflow_user'@'localhost';
FLUSH PRIVILEGES;
```

### Execute Database Migrations
Run Sequelize migrations to set up tables, unique indexes, and foreign keys:
```bash
cd server
npm run migrate
```

*Note: In production environments, never run `sequelize.sync({ force: true })` or destructive schema syncs. Only execute forward migrations using `npm run migrate`.*

---

## 4. Building & Running the Application

### A. Frontend Production Build
```bash
cd client
npm install --frozen-lockfile
npm run build
```
The optimized bundle will be created in `client/dist/`. Serve these static files via NGINX.

### B. Backend Production Run with PM2
```bash
cd server
npm install --frozen-lockfile --omit=dev
pm2 start src/server.js --name "businessflow-api" -i max
pm2 save
pm2 startup
```

---

## 5. NGINX Reverse Proxy Configuration

Create `/etc/nginx/sites-available/businessflow.conf`:

```nginx
# API Backend
server {
    listen 80;
    server_name api.businessflow.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.businessflow.example.com;

    ssl_certificate /etc/letsencrypt/live/api.businessflow.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.businessflow.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend SPA
server {
    listen 80;
    server_name app.businessflow.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.businessflow.example.com;

    root /var/www/businessflow/client/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/app.businessflow.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.businessflow.example.com/privkey.pem;

    # SPA Fallback routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 6. Database Backup & Disaster Recovery

### Automated Nightly Backup Script
Save as `/usr/local/bin/backup-businessflow.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/businessflow"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

mysqldump -u businessflow_user -p'A_Strong_Random_Password_32_Chars!' \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    businessflow_prod | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "backup_*.sql.gz" -mtime +30 -delete
```

### Restore Procedure
```bash
gunzip < /var/backups/businessflow/backup_20261026_020000.sql.gz | mysql -u businessflow_user -p businessflow_prod
```

---

## 7. Health & Monitoring

- Health check endpoint: `GET https://api.businessflow.example.com/health` returns `{ status: "ok", timestamp: ... }`.
- PM2 monitoring: `pm2 monit` or `pm2 logs businessflow-api`.
