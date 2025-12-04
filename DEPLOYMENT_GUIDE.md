# GuardianOS Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Production Deployment](#production-deployment)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Python**: 3.10 or higher
- **PostgreSQL**: 14 or higher
- **Redis**: 6 or higher
- **Node.js**: 18 or higher (for frontend)
- **OS**: Ubuntu 20.04+ (recommended) or Windows Server 2019+

### Python Packages
```bash
pip install -r backend/requirements.txt
```

### System Packages (Ubuntu)
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server
sudo apt install -y python3-pip python3-venv
sudo apt install -y nginx  # For production
```

---

## Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/rostracore.git
cd rostracore
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 3. Database Setup
```bash
# Create database
createdb rostracore_db

# Run migrations
alembic upgrade head

# Create sample data (optional for testing)
python create_sample_data.py
```

### 4. Start Services
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Celery Worker
celery -A app.celery_app worker --loglevel=info

# Terminal 3: Backend API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend Setup (if applicable)
```bash
cd frontend
npm install
npm run dev
```

---

## Production Deployment

### Architecture Overview
```
[Internet]
    ↓
[Nginx] (Reverse Proxy + SSL/TLS)
    ↓
[Gunicorn] (WSGI Server - Multiple Workers)
    ↓
[FastAPI Application]
    ↓
[PostgreSQL Database]
[Redis Cache]
[Celery Workers]
```

### 1. Server Setup (Ubuntu 20.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.10 python3.10-venv python3-pip
sudo apt install -y postgresql-14 redis-server nginx
sudo apt install -y supervisor  # For process management
sudo apt install -y certbot python3-certbot-nginx  # For SSL

# Create application user
sudo useradd -m -s /bin/bash guardianos
sudo su - guardianos
```

### 2. Application Deployment

```bash
# Clone repository
cd /home/guardianos
git clone https://github.com/your-org/rostracore.git
cd rostracore/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server

# Setup environment
cp .env.example .env
nano .env  # Configure production settings
```

###3. Database Setup (Production)

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE rostracore_production;
CREATE USER rostracore_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rostracore_production TO rostracore_user;
\q

# Run migrations
cd /home/guardianos/rostracore/backend
source venv/bin/activate
alembic upgrade head
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/guardianos`:

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }

    # API Docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
    }

    # Frontend (if serving from same server)
    location / {
        root /home/guardianos/rostracore/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # File upload size
    client_max_body_size 10M;
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/guardianos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (should be automatic, verify with:)
sudo certbot renew --dry-run
```

### 6. Supervisor Configuration

Create `/etc/supervisor/conf.d/guardianos.conf`:

```ini
[program:guardianos-api]
command=/home/guardianos/rostracore/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
directory=/home/guardianos/rostracore/backend
user=guardianos
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/guardianos/api.err.log
stdout_logfile=/var/log/guardianos/api.out.log
environment=PATH="/home/guardianos/rostracore/backend/venv/bin"

[program:guardianos-celery]
command=/home/guardianos/rostracore/backend/venv/bin/celery -A app.celery_app worker --loglevel=info
directory=/home/guardianos/rostracore/backend
user=guardianos
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/guardianos/celery.err.log
stdout_logfile=/var/log/guardianos/celery.out.log
environment=PATH="/home/guardianos/rostracore/backend/venv/bin"

[program:guardianos-celery-beat]
command=/home/guardianos/rostracore/backend/venv/bin/celery -A app.celery_app beat --loglevel=info
directory=/home/guardianos/rostracore/backend
user=guardianos
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/guardianos/celery-beat.err.log
stdout_logfile=/var/log/guardianos/celery-beat.out.log
environment=PATH="/home/guardianos/rostracore/backend/venv/bin"
```

Create log directory and start services:
```bash
sudo mkdir -p /var/log/guardianos
sudo chown guardianos:guardianos /var/log/guardianos

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

---

## Environment Configuration

### Production .env Settings

**CRITICAL CHANGES for Production**:

```bash
# Application
ENVIRONMENT=production
DEBUG=False  # MUST be False

# Security
SECRET_KEY=<generate-with-secrets-module>  # Must be strong random value
SUPERADMIN_SECRET_TOKEN=<generate-strong-token>

# Database
DATABASE_URL=postgresql://rostracore_user:secure_password@localhost:5432/rostracore_production

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# BCEA Compliance
TESTING_MODE=False  # Enforce labor law compliance
SKIP_CERTIFICATION_CHECK=False
SKIP_AVAILABILITY_CHECK=False
MAX_HOURS_WEEK=48
MIN_REST_HOURS=8

# PayFast
PAYFAST_SANDBOX=False  # Use real payment gateway
PAYFAST_MERCHANT_ID=<your-merchant-id>
PAYFAST_MERCHANT_KEY=<your-merchant-key>
PAYFAST_PASSPHRASE=<your-passphrase>
BACKEND_URL=https://yourdomain.com

# Redis
REDIS_PASSWORD=<secure-redis-password>

# Sentry (Error Tracking)
SENTRY_DSN=https://YOUR_PROJECT@sentry.io/YOUR_ID
SENTRY_ENVIRONMENT=production

# Email
SENDGRID_API_KEY=<your-sendgrid-key>
FROM_EMAIL=noreply@yourdomain.com
```

### Generate Secure Keys

```python
# Generate SECRET_KEY and SUPERADMIN_SECRET_TOKEN
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Running the Application

### Development
```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Celery Worker
celery -A app.celery_app worker --loglevel=info

# Celery Beat (Scheduled Tasks)
celery -A app.celery_app beat --loglevel=info
```

### Production
```bash
# All services managed by Supervisor
sudo supervisorctl status
sudo supervisorctl start all
sudo supervisorctl restart guardianos-api
sudo supervisorctl tail -f guardianos-api stdout
```

---

## Post-Deployment

### 1. Create SuperAdmin Account

```bash
curl -X POST https://yourdomain.com/api/v1/superadmin/register \
  -H "Content-Type: application/json" \
  -H "X-SuperAdmin-Token: YOUR_SECRET_TOKEN" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "full_name": "System Administrator"
  }'
```

### 2. Verify Health

```bash
curl https://yourdomain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery": "running"
}
```

### 3. Test API

```bash
# Test authentication
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=SecurePassword123!"
```

### 4. Setup Automated Backups

Create `/etc/cron.daily/guardianos-backup`:

```bash
#!/bin/bash
# GuardianOS Daily Backup Script

BACKUP_DIR="/backups/guardianos"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="rostracore_production"
DB_USER="rostracore_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U $DB_USER -F c -b -v -f "$BACKUP_DIR/db_$DATE.backup" $DB_NAME

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.backup" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/db_$DATE.backup" s3://your-bucket/backups/
```

Make executable:
```bash
sudo chmod +x /etc/cron.daily/guardianos-backup
```

---

## Monitoring

### Application Monitoring (Sentry)

1. Sign up at https://sentry.io
2. Create new project
3. Add DSN to `.env`:
   ```
   SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT
   ```

### Server Monitoring

```bash
# CPU and Memory
htop

# Disk Usage
df -h

# API Logs
sudo supervisorctl tail -f guardianos-api stdout

# Nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database Connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='rostracore_production';"
```

### Uptime Monitoring

Use services like:
- **UptimeRobot** (https://uptimerobot.com)
- **Pingdom** (https://www.pingdom.com)
- **StatusCake** (https://www.statuscake.com)

Monitor:
- `https://yourdomain.com/health` (every 5 minutes)
- Alert on 3+ consecutive failures

---

## Troubleshooting

### Issue: API Returns 502 Bad Gateway

**Cause**: Gunicorn not running or crashed

**Solution**:
```bash
sudo supervisorctl status guardianos-api
sudo supervisorctl restart guardianos-api
sudo supervisorctl tail guardianos-api stderr
```

### Issue: Database Connection Errors

**Cause**: PostgreSQL not accepting connections

**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart if needed
sudo systemctl restart postgresql
```

### Issue: Celery Tasks Not Running

**Cause**: Celery worker not running or Redis down

**Solution**:
```bash
# Check Redis
redis-cli ping  # Should return "PONG"

# Check Celery worker
sudo supervisorctl status guardianos-celery
sudo supervisorctl restart guardianos-celery

# Check Celery logs
sudo supervisorctl tail -f guardianos-celery stdout
```

### Issue: High Memory Usage

**Cause**: Too many Gunicorn workers

**Solution**:
```ini
# Reduce workers in /etc/supervisor/conf.d/guardianos.conf
# Formula: (2 x CPU cores) + 1
command=.../gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
```

Then restart:
```bash
sudo supervisorctl restart guardianos-api
```

### Issue: Slow API Responses

**Possible Causes**:
1. Database queries not optimized
2. Missing database indexes
3. Redis not caching effectively

**Diagnostics**:
```bash
# Check slow queries
sudo -u postgres psql rostracore_production -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check API response times in logs
grep "GET /api" /var/log/nginx/access.log | awk '{print $NF}' | sort -n | tail -20
```

---

## Security Checklist

### Pre-Production
- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` (32+ characters)
- [ ] `TESTING_MODE=False` (BCEA compliance)
- [ ] Database uses strong password
- [ ] Redis password protected
- [ ] HTTPS/SSL configured with valid certificate
- [ ] CORS only allows production domains
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication only
- [ ] Fail2ban installed and configured
- [ ] Automated security updates enabled
- [ ] Database backups automated
- [ ] Sentry error tracking configured
- [ ] SuperAdmin token kept secret
- [ ] PayFast sandbox mode disabled

### Post-Deployment
- [ ] Change default SSH port
- [ ] Setup fail2ban for API endpoints
- [ ] Configure rate limiting
- [ ] Setup log rotation
- [ ] Test backup restoration
- [ ] Setup monitoring alerts
- [ ] Conduct security audit
- [ ] Test disaster recovery plan

---

## Performance Optimization

### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_shifts_org_start ON shifts(org_id, start_time);
CREATE INDEX idx_assignments_employee ON shift_assignments(employee_id, status);
CREATE INDEX idx_invoices_client_date ON client_invoices(client_id, invoice_date);
```

### Caching
- Enable Redis caching for frequent queries
- Cache roster generation results
- Cache dashboard statistics

### Gunicorn Workers
```bash
# Optimal worker count: (2 x CPU_CORES) + 1
# For 2 CPU cores: 5 workers
-w 5
```

---

## Support

For issues or questions:
- **Documentation**: https://docs.guardianos.co.za
- **GitHub Issues**: https://github.com/your-org/rostracore/issues
- **Email**: support@guardianos.co.za

---

**Last Updated**: 2025-01-17
**Version**: 1.0.0
