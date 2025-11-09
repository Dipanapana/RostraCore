# 🚀 RostraCore Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Migration](#database-migration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Security
- [ ] Change all default passwords (superadmin, database)
- [ ] Generate new SECRET_KEY for production
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable database encryption at rest
- [ ] Configure backup strategy
- [ ] Set up VPN for admin access

### Configuration
- [ ] Environment variables configured for production
- [ ] CORS origins set to production domains only
- [ ] Debug mode disabled
- [ ] Error tracking (Sentry) configured
- [ ] Email service (SendGrid) configured
- [ ] Payment gateway (PayFast) production credentials
- [ ] Redis connection for production
- [ ] Database connection pooling configured

### Testing
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] UAT sign-off received

---

## Infrastructure Setup

### Option 1: Cloud Deployment (AWS/Hetzner - Recommended)

#### AWS Architecture

```
┌─────────────────┐
│  CloudFlare CDN │ (Static assets, DDoS protection)
└────────┬────────┘
         │
┌────────▼────────┐
│  Route 53 DNS   │
└────────┬────────┘
         │
┌────────▼────────┐
│ Application LB  │ (Load balancer)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ EC2-1 │ │ EC2-2 │ (Backend - Uvicorn)
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│   RDS PostgreSQL│ (Multi-AZ)
└─────────────────┘
         │
┌────────▼────────┐
│ ElastiCache Redis
└─────────────────┘

┌─────────────────┐
│ S3 Bucket (Files)
└─────────────────┘

┌─────────────────┐
│ Vercel (Frontend)
└─────────────────┘
```

#### 1. Create EC2 Instances (Backend)

```bash
# Launch 2× t3.medium instances (Ubuntu 22.04 LTS)
# 2 vCPUs, 4GB RAM each
# Security Group: Allow 8000 (from LB only), 22 (SSH from your IP only)

# Install dependencies
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql-client nginx
```

#### 2. Setup RDS PostgreSQL

```bash
# Create RDS instance
# Engine: PostgreSQL 14
# Instance class: db.t3.micro (dev) / db.t3.small (prod)
# Multi-AZ deployment: Yes
# Automated backups: 7 days retention
# Encryption: Enabled

# Connect to RDS
psql -h rostracore-db.xxxxx.af-south-1.rds.amazonaws.com -U admin -d rostracore_db

# Run migrations
DATABASE_URL="postgresql://admin:password@rostracore-db.xxx.rds.amazonaws.com:5432/rostracore_db"
alembic upgrade head
```

#### 3. Setup ElastiCache Redis

```bash
# Create ElastiCache Redis cluster
# Node type: cache.t3.micro
# Number of replicas: 1
# Engine version: 6.x

# Update .env
REDIS_URL=redis://rostracore-cache.xxxxx.cache.amazonaws.com:6379/0
```

#### 4. Setup S3 Bucket (File Storage)

```bash
# Create S3 bucket: rostracore-prod-files
# Region: af-south-1 (Cape Town)
# Versioning: Enabled
# Encryption: AES-256
# Public access: Blocked

# IAM Policy for app
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::rostracore-prod-files/*"
    }
  ]
}
```

---

### Option 2: VPS Deployment (Hetzner - Cost-Effective)

#### Server Specifications
- **Type:** CX41 (4 vCPUs, 16GB RAM, 160GB SSD)
- **Location:** Helsinki, Finland (closest to SA with good connectivity)
- **Cost:** €15.30/month (~R300/month)

#### Initial Setup

```bash
# SSH into server
ssh root@your-server-ip

# Create deploy user
adduser deploy
usermod -aG sudo deploy
su - deploy

# Install dependencies
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql-14 redis-server nginx certbot
```

---

## Database Migration

### Production Database Setup

```bash
# Connect to production database
export DATABASE_URL="postgresql://user:pass@prod-db-host:5432/rostracore_db"

# Backup existing data (if upgrading)
pg_dump -h prod-db-host -U user rostracore_db > backup_$(date +%Y%m%d).sql

# Run migrations
cd backend
source venv/bin/activate
alembic upgrade head

# Verify migration
alembic current
# Expected: 018 (add subscription plans and RBAC)
```

### Rollback Plan

```bash
# If migration fails, rollback to previous version
alembic downgrade -1

# Restore from backup
psql -h prod-db-host -U user rostracore_db < backup_20251109.sql
```

---

## Backend Deployment

### 1. Deploy Code to Server

```bash
# Clone repository on server
cd /home/deploy
git clone https://github.com/yourusername/RostraCore.git
cd RostraCore/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server
```

### 2. Configure Environment Variables

```bash
# Create production .env
nano /home/deploy/RostraCore/backend/.env.production
```

**Production .env:**
```env
# Database
DATABASE_URL=postgresql://user:password@prod-db-host:5432/rostracore_db

# Security
SECRET_KEY=your-production-secret-key-min-64-characters-super-secure
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ENVIRONMENT=production

# CORS (Production domains only)
ALLOWED_ORIGINS=https://app.rostracore.com,https://www.rostracore.com

# PayFast (PRODUCTION)
PAYFAST_MERCHANT_ID=your_prod_merchant_id
PAYFAST_MERCHANT_KEY=your_prod_merchant_key
PAYFAST_PASSPHRASE=your_prod_passphrase
PAYFAST_SANDBOX=false
PAYFAST_RETURN_URL=https://app.rostracore.com/payment/success
PAYFAST_CANCEL_URL=https://app.rostracore.com/payment/cancel
PAYFAST_NOTIFY_URL=https://api.rostracore.com/api/v1/payments/payfast/webhook

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@rostracore.com
FROM_NAME=RostraCore

# Redis
REDIS_URL=redis://prod-redis-host:6379/0

# S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=rostracore-prod-files
AWS_REGION=af-south-1

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Logging
LOG_LEVEL=INFO
```

### 3. Setup Systemd Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/rostracore.service
```

**rostracore.service:**
```ini
[Unit]
Description=RostraCore Backend API
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/RostraCore/backend
Environment="PATH=/home/deploy/RostraCore/backend/venv/bin"
EnvironmentFile=/home/deploy/RostraCore/backend/.env.production
ExecStart=/home/deploy/RostraCore/backend/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/rostracore/access.log \
    --error-logfile /var/log/rostracore/error.log \
    app.main:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Create log directory
sudo mkdir -p /var/log/rostracore
sudo chown deploy:deploy /var/log/rostracore

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rostracore
sudo systemctl start rostracore

# Check status
sudo systemctl status rostracore

# View logs
sudo journalctl -u rostracore -f
```

### 4. Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/rostracore
```

**Nginx configuration:**
```nginx
# API - api.rostracore.com
server {
    listen 80;
    server_name api.rostracore.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.rostracore.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.rostracore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.rostracore.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support (for real-time features)
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
    limit_req zone=api_limit burst=20 nodelay;

    # File upload limit
    client_max_body_size 10M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rostracore /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 5. Setup SSL Certificates

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.rostracore.com

# Auto-renewal (certbot creates cron job automatically)
sudo certbot renew --dry-run
```

---

## Frontend Deployment (Vercel - Recommended)

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd frontend
vercel --prod

# Configure environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://api.rostracore.com/api/v1
# NEXT_PUBLIC_WS_URL=wss://api.rostracore.com/ws
# NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_prod_merchant_id
# NEXT_PUBLIC_PAYFAST_SANDBOX=false
```

### 2. Custom Domain Setup

```bash
# In Vercel dashboard:
# 1. Go to Domains
# 2. Add: app.rostracore.com
# 3. Update DNS records (A/CNAME)
# 4. Wait for SSL provisioning (automatic)
```

---

### Alternative: Self-Hosted Frontend (Nginx)

```bash
# Build frontend
cd frontend
npm run build

# Copy build to server
rsync -avz out/ deploy@server:/var/www/rostracore/

# Nginx config
sudo nano /etc/nginx/sites-available/rostracore-frontend
```

**Frontend Nginx:**
```nginx
server {
    listen 80;
    server_name app.rostracore.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.rostracore.com;

    ssl_certificate /etc/letsencrypt/live/app.rostracore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.rostracore.com/privkey.pem;

    root /var/www/rostracore;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;
}
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl https://api.rostracore.com/health
# Expected: {"status": "healthy", "database": "connected"}

# Frontend
curl https://app.rostracore.com
# Expected: 200 OK (HTML content)

# API docs
curl https://api.rostracore.com/docs
# Expected: 200 OK (Swagger UI)
```

### Functional Tests

**1. Superadmin Login**
```bash
curl -X POST https://api.rostracore.com/api/v1/superadmin/auth/login \
  -d "username=superadmin&password=NEW_PRODUCTION_PASSWORD"
# Expected: JWT token
```

**2. Create Organization**
```bash
curl -X POST https://api.rostracore.com/api/v1/organizations \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Org", "email": "test@test.com"}'
# Expected: 201 Created
```

**3. PayFast Payment**
- Navigate to marketplace
- Purchase CV
- Complete PayFast payment flow
- Verify webhook received

---

## Monitoring & Maintenance

### Setup Monitoring

#### 1. Server Monitoring (UptimeRobot)

```bash
# Add monitors:
# - https://api.rostracore.com/health (1-minute intervals)
# - https://app.rostracore.com (1-minute intervals)
# - PostgreSQL port check
# - Redis port check

# Alert channels: Email, SMS, Slack
```

#### 2. Application Performance (Sentry)

```python
# Already configured in backend/app/main.py
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1,
    environment="production"
)
```

#### 3. Log Management

```bash
# Centralize logs with Papertrail / Logtail
# Ship logs from:
# - /var/log/nginx/access.log
# - /var/log/nginx/error.log
# - /var/log/rostracore/access.log
# - /var/log/rostracore/error.log

# Setup log rotation
sudo nano /etc/logrotate.d/rostracore
```

**Log rotation config:**
```
/var/log/rostracore/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        systemctl reload rostracore
    endscript
}
```

---

### Backup Strategy

#### Database Backups

```bash
# Automated daily backups (cron)
crontab -e

# Add:
0 2 * * * pg_dump -h prod-db-host -U user rostracore_db | gzip > /backups/rostracore_$(date +\%Y\%m\%d).sql.gz

# Backup to S3
0 3 * * * aws s3 cp /backups/ s3://rostracore-backups/ --recursive
```

#### Application Backups

```bash
# Weekly full server snapshot (AWS AMI / Hetzner Snapshot)
# Retention: 4 weeks
```

---

### Scaling Strategy

#### Horizontal Scaling (When needed)

**Metrics to Monitor:**
- CPU usage > 70% sustained
- Response time > 500ms average
- Concurrent users > 500

**Scaling Actions:**
1. Add more EC2 instances behind load balancer
2. Scale RDS read replicas
3. Scale Redis cluster (sharding)
4. Enable CDN for static assets

---

### Security Hardening

```bash
# Disable root SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Enable UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Enable unattended security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Rollback Procedure

### If deployment fails:

**1. Rollback code**
```bash
cd /home/deploy/RostraCore
git reset --hard <previous-commit-hash>
sudo systemctl restart rostracore
```

**2. Rollback database**
```bash
alembic downgrade -1
# OR restore from backup
psql -h prod-db-host -U user rostracore_db < backup.sql
```

**3. Rollback frontend**
```bash
# Vercel: Deploy previous production deployment from dashboard
# Self-hosted: Copy previous build from backups
```

---

## Production Checklist

**Before Launch:**
- [ ] All tests passing
- [ ] Database backed up
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Monitoring configured
- [ ] Error tracking (Sentry) working
- [ ] Payment gateway tested
- [ ] Email delivery tested
- [ ] Performance tested (load test)
- [ ] Security audit completed

**After Launch:**
- [ ] Health checks passing
- [ ] Logs reviewed (no critical errors)
- [ ] Monitoring alerts configured
- [ ] Backup verified
- [ ] Team notified
- [ ] Documentation updated

---

**Deployment Complete! 🎉**

Monitor closely for first 48 hours. Have rollback plan ready. Celebrate success! 🍾
