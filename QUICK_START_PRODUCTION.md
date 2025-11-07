# Quick Start: Production Deployment
## Get RostraCore Running in Production in 30 Minutes

---

## ⚡ **EXPRESS DEPLOYMENT PATH**

This guide gets you from zero to production in ~30 minutes with all features working.

**Prerequisites:**
- Ubuntu 22.04 LTS server (4GB RAM, 2 CPU cores minimum)
- Domain name pointed to your server
- SSH access to server
- Basic command-line knowledge

---

## 🚀 **STEP 1: Initial Server Setup** (5 minutes)

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# Set timezone
sudo timedatectl set-timezone Africa/Johannesburg
```

---

## 🗄️ **STEP 2: Install PostgreSQL** (3 minutes)

```bash
# Install PostgreSQL 14
sudo apt-get install -y postgresql-14 postgresql-contrib-14

# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE rostracore_prod;
CREATE USER rostracore_user WITH PASSWORD 'ChangeThisToStrongPassword123!';
ALTER DATABASE rostracore_prod OWNER TO rostracore_user;
GRANT ALL PRIVILEGES ON DATABASE rostracore_prod TO rostracore_user;
\q
EOF

# Verify connection
psql -U rostracore_user -d rostracore_prod -h localhost -c "SELECT 1"
```

---

## 📦 **STEP 3: Install Redis** (2 minutes)

```bash
# Install Redis
sudo apt-get install -y redis-server

# Configure Redis password
sudo sed -i 's/# requirepass foobared/requirepass YourRedisPassword456!/' /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis

# Verify
redis-cli -a YourRedisPassword456! ping
# Should return: PONG
```

---

## 🐍 **STEP 4: Setup Backend** (8 minutes)

```bash
# Install Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev

# Clone repository
cd /opt
sudo git clone https://github.com/yourusername/RostraCore.git
sudo chown -R $USER:$USER RostraCore
cd RostraCore/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file from template
cp .env.production.template .env

# Edit .env with your values
nano .env
# CRITICAL CHANGES:
# - DATABASE_URL: Use password from Step 2
# - REDIS_PASSWORD: Use password from Step 3
# - SECRET_KEY: Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
# - ALLOWED_ORIGINS: Add your domain
# - SENTRY_DSN: (Optional) Get from sentry.io

# Run database migrations
alembic upgrade head

# Verify migrations
alembic current
# Should show: 009_add_performance_indexes (head)

# Test backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}

# Kill test process
pkill -f uvicorn
```

---

## 🎨 **STEP 5: Setup Frontend** (5 minutes)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version

# Setup frontend
cd /opt/RostraCore/frontend

# Create .env.local from template
cp .env.production.template .env.local

# Edit .env.local
nano .env.local
# CRITICAL CHANGES:
# - NEXT_PUBLIC_API_URL: Set to https://api.yourdomain.com
# - NEXT_PUBLIC_SENTRY_DSN: (Optional) Separate Sentry project for frontend

# Install dependencies
npm install --production

# Build production bundle
npm run build

# Test frontend
npm start &
curl http://localhost:3000
# Should return HTML

# Kill test process
pkill -f "npm start"
```

---

## ⚙️ **STEP 6: Setup Celery Workers** (3 minutes)

```bash
cd /opt/RostraCore/backend

# Create systemd service for Celery worker
sudo tee /etc/systemd/system/celery-worker.service > /dev/null << 'EOF'
[Unit]
Description=Celery Worker for RostraCore
After=network.target redis.service postgresql.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/opt/RostraCore/backend
Environment="PATH=/opt/RostraCore/backend/venv/bin"
ExecStart=/opt/RostraCore/backend/venv/bin/celery -A app.celery_app worker --loglevel=info --concurrency=4 --detach

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for Celery Beat (scheduler)
sudo tee /etc/systemd/system/celery-beat.service > /dev/null << 'EOF'
[Unit]
Description=Celery Beat Scheduler for RostraCore
After=network.target redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/RostraCore/backend
Environment="PATH=/opt/RostraCore/backend/venv/bin"
ExecStart=/opt/RostraCore/backend/venv/bin/celery -A app.celery_app beat --loglevel=info

Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Fix permissions
sudo chown -R www-data:www-data /opt/RostraCore

# Start services
sudo systemctl enable celery-worker celery-beat
sudo systemctl start celery-worker celery-beat

# Verify
sudo systemctl status celery-worker
sudo systemctl status celery-beat
```

---

## 🌐 **STEP 7: Configure Nginx** (4 minutes)

```bash
# Create API configuration
sudo tee /etc/nginx/sites-available/rostracore-api > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

# Create frontend configuration
sudo tee /etc/nginx/sites-available/rostracore-frontend > /dev/null << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# IMPORTANT: Replace yourdomain.com with your actual domain!
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/rostracore-*

# Enable sites
sudo ln -s /etc/nginx/sites-available/rostracore-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/rostracore-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 **STEP 8: Enable HTTPS with Let's Encrypt** (2 minutes)

```bash
# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms
# 3. Choose redirect HTTP to HTTPS (option 2)

# Verify auto-renewal
sudo certbot renew --dry-run

# Check SSL status
curl https://api.yourdomain.com/health
```

---

## 🚦 **STEP 9: Start Production Services** (2 minutes)

```bash
# Create systemd service for backend
sudo tee /etc/systemd/system/rostracore-api.service > /dev/null << 'EOF'
[Unit]
Description=RostraCore FastAPI Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/RostraCore/backend
Environment="PATH=/opt/RostraCore/backend/venv/bin"
ExecStart=/opt/RostraCore/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create PM2 ecosystem for frontend
cd /opt/RostraCore/frontend
npm install -g pm2

pm2 start npm --name "rostracore-frontend" -- start
pm2 save
pm2 startup  # Follow instructions output

# Start backend service
sudo systemctl enable rostracore-api
sudo systemctl start rostracore-api

# Verify all services
sudo systemctl status rostracore-api
sudo systemctl status celery-worker
sudo systemctl status celery-beat
pm2 status
```

---

## ✅ **STEP 10: Verify Deployment** (1 minute)

```bash
# Run automated testing script
cd /opt/RostraCore
./DEPLOYMENT_TESTING.sh https://api.yourdomain.com

# Should see:
# ✅ All tests passed!
# Success rate: 95%+
# System is production-ready!

# Test in browser:
# 1. Visit https://yourdomain.com (frontend)
# 2. Visit https://api.yourdomain.com/docs (API docs)
# 3. Visit https://api.yourdomain.com/health (health check)

# Check each dashboard:
# - https://yourdomain.com/dashboards/executive
# - https://yourdomain.com/dashboards/operations
# - https://yourdomain.com/dashboards/financial
# - https://yourdomain.com/dashboards/people
```

---

## 🎉 **CONGRATULATIONS! YOU'RE LIVE!**

Your RostraCore platform is now running in production with:

✅ **PostgreSQL 14** - Production database with 25+ performance indexes
✅ **Redis 7** - Caching layer (6-7x faster responses)
✅ **Celery Workers** - Background job processing
✅ **4 AI Dashboards** - Executive, Operations, Financial, People Analytics
✅ **ML Predictions** - Shift fill & churn prediction models
✅ **HTTPS/SSL** - Secure connections via Let's Encrypt
✅ **Auto-restart** - All services configured with systemd
✅ **Monitoring Ready** - Sentry integration (if configured)

---

## 📊 **POST-DEPLOYMENT CHECKLIST**

- [ ] Test login functionality
- [ ] Create first organization/user
- [ ] Upload sample data (employees, sites, shifts)
- [ ] Test roster generation
- [ ] Verify all 4 dashboards load with data
- [ ] Test prediction endpoints
- [ ] Check Celery scheduled tasks are running
- [ ] Verify email notifications (if configured)
- [ ] Test mobile responsiveness
- [ ] Setup database backups (see DEPLOYMENT_READINESS.md)

---

## 🔧 **COMMON POST-DEPLOYMENT TASKS**

### Check Service Status:
```bash
# Backend API
sudo systemctl status rostracore-api

# Celery workers
sudo systemctl status celery-worker
sudo systemctl status celery-beat

# Frontend
pm2 status

# All logs
sudo journalctl -u rostracore-api -f
pm2 logs rostracore-frontend
```

### Restart Services:
```bash
# Backend
sudo systemctl restart rostracore-api

# Celery
sudo systemctl restart celery-worker celery-beat

# Frontend
pm2 restart rostracore-frontend

# Nginx
sudo systemctl reload nginx
```

### Database Operations:
```bash
# Connect to database
psql -U rostracore_user -d rostracore_prod -h localhost

# Run migrations
cd /opt/RostraCore/backend
source venv/bin/activate
alembic upgrade head

# Check migration status
alembic current
alembic history
```

### Monitor Cache:
```bash
# Check Redis
redis-cli -a YourRedisPassword456! INFO stats
redis-cli -a YourRedisPassword456! KEYS "dashboard:*"

# Clear cache if needed
redis-cli -a YourRedisPassword456! FLUSHDB
```

---

## 🆘 **TROUBLESHOOTING**

### Backend not responding:
```bash
sudo systemctl status rostracore-api
sudo journalctl -u rostracore-api -n 50
# Check .env file, database connection, Redis connection
```

### Frontend blank page:
```bash
pm2 logs rostracore-frontend
# Check NEXT_PUBLIC_API_URL in .env.local
# Verify API is accessible from frontend
```

### Dashboards showing no data:
```bash
# Check database has data
psql -U rostracore_user -d rostracore_prod -c "SELECT COUNT(*) FROM employees"
# Verify cache is working
redis-cli -a YourRedisPassword456! ping
```

### Celery jobs not running:
```bash
sudo systemctl status celery-worker
sudo systemctl status celery-beat
# Check Redis connection in .env
```

---

## 📚 **NEXT STEPS**

1. **Read full documentation**: See `DEPLOYMENT_READINESS.md`
2. **Setup monitoring**: Configure Sentry at https://sentry.io
3. **Configure backups**: Setup automated database backups
4. **Load test**: Test with realistic user load
5. **User training**: Onboard your team
6. **Collect feedback**: Monitor Sentry, gather user input
7. **Scale**: Add more workers/servers as needed

---

## 🔗 **USEFUL LINKS**

- **Frontend**: https://yourdomain.com
- **API Docs**: https://api.yourdomain.com/docs
- **Health Check**: https://api.yourdomain.com/health
- **Full Deployment Guide**: `DEPLOYMENT_READINESS.md`
- **Testing Script**: `./DEPLOYMENT_TESTING.sh`
- **Complete Documentation**: `MVP_REDESIGN_COMPLETE.md`

---

**Estimated Total Time: 30-35 minutes**

*This quick start guide gets you up and running fast. For production best practices, security hardening, and advanced configuration, see DEPLOYMENT_READINESS.md.*

**Need Help?**
- Check logs: `sudo journalctl -u rostracore-api -f`
- Test endpoints: `./DEPLOYMENT_TESTING.sh`
- Review documentation in `/docs` folder

---

*Last updated: 2025-11-07*
