# Deployment Readiness Guide
## RostraCore AI-Powered Platform

---

## 🎯 **PRE-DEPLOYMENT CHECKLIST**

### **1. Infrastructure Requirements**

#### **Backend Services:**
- [ ] **PostgreSQL 14+** - Database server
  - Minimum: 4GB RAM, 50GB SSD
  - Recommended: 8GB RAM, 100GB SSD
- [ ] **Redis 7** - Caching layer
  - Minimum: 2GB RAM
  - Recommended: 4GB RAM
- [ ] **Celery Workers** - Background job processing
  - Minimum: 2 workers, 2GB RAM each
  - Recommended: 4 workers, 4GB RAM each
- [ ] **Python 3.11+** - Runtime environment

#### **Frontend Services:**
- [ ] **Node.js 18+** - Runtime environment
- [ ] **Next.js 14** - Already configured

#### **Monitoring:**
- [ ] **Sentry Account** - Error tracking (free tier available)
- [ ] **Flower** - Celery monitoring (optional but recommended)

---

### **2. Environment Variables**

#### **Backend (.env):**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rostracore_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_V1_PREFIX=/api/v1
ALLOWED_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Security
SECRET_KEY=your-super-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Monitoring (Sentry)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Application
DEBUG=False
ENVIRONMENT=production
```

#### **Frontend (.env.local):**

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Application
NODE_ENV=production
```

---

### **3. Database Setup**

#### **Step 1: Run Migrations**

```bash
cd backend

# Verify connection
python -c "from app.database import engine; print('Database connected!' if engine else 'Failed')"

# Run migrations
alembic upgrade head

# Verify migrations
alembic current
# Should show: 009_add_performance_indexes (head)
```

#### **Step 2: Create Initial Data (Optional)**

```bash
# Create organizations, sites, employees
python scripts/seed_database.py
```

#### **Step 3: Verify Indexes**

```bash
# Connect to database
psql -U user -d rostracore_prod

# List all indexes
\di

# Should see 25+ indexes including:
# - idx_shifts_date_range_site
# - idx_shifts_assigned_employee
# - idx_availability_employee_date
# - idx_certifications_employee_expiry
# etc.
```

---

### **4. Redis Setup**

#### **Install Redis:**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server --daemonize yes

# Verify
redis-cli ping
# Should return: PONG
```

#### **Configure Redis:**

```bash
# Edit redis.conf
sudo nano /etc/redis/redis.conf

# Set password
requirepass your_redis_password_here

# Set max memory (4GB example)
maxmemory 4gb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis
```

---

### **5. Celery Setup**

#### **Start Celery Workers:**

```bash
cd backend

# Worker for general tasks
celery -A app.celery_app worker --loglevel=info --concurrency=4 --pool=solo &

# Worker for predictions (optional separate queue)
celery -A app.celery_app worker --loglevel=info --concurrency=2 --pool=solo -Q predictions &

# Start Celery Beat (scheduler)
celery -A app.celery_app beat --loglevel=info &
```

#### **Start Flower (Monitoring):**

```bash
celery -A app.celery_app flower --port=5555 &

# Access at: http://localhost:5555
```

#### **Verify Celery:**

```bash
# Check workers
celery -A app.celery_app inspect active

# Check scheduled tasks
celery -A app.celery_app inspect scheduled

# Should see 4 beat tasks:
# - calculate-customer-health-scores (daily)
# - calculate-churn-predictions (daily)
# - generate-daily-alerts (every 6 hours)
# - analyze-shift-patterns (weekly)
```

---

### **6. Backend Deployment**

#### **Option A: Docker (Recommended)**

```bash
cd backend

# Build image
docker build -t rostracore-backend:latest .

# Run container
docker run -d \
  --name rostracore-api \
  -p 8000:8000 \
  --env-file .env \
  rostracore-backend:latest

# Check logs
docker logs -f rostracore-api
```

#### **Option B: Systemd Service**

Create `/etc/systemd/system/rostracore-api.service`:

```ini
[Unit]
Description=RostraCore FastAPI Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/rostracore/backend
Environment="PATH=/opt/rostracore/backend/venv/bin"
ExecStart=/opt/rostracore/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl enable rostracore-api
sudo systemctl start rostracore-api

# Check status
sudo systemctl status rostracore-api
```

---

### **7. Frontend Deployment**

#### **Build Production Bundle:**

```bash
cd frontend

# Install dependencies
npm install --production

# Build
npm run build

# Test build locally
npm start
# Access at: http://localhost:3000
```

#### **Option A: Vercel (Recommended for Next.js)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_API_URL
# - NEXT_PUBLIC_SENTRY_DSN
```

#### **Option B: Docker**

```bash
cd frontend

# Build image
docker build -t rostracore-frontend:latest .

# Run container
docker run -d \
  --name rostracore-frontend \
  -p 3000:3000 \
  --env-file .env.local \
  rostracore-frontend:latest
```

#### **Option C: PM2**

```bash
cd frontend

# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "rostracore-frontend" -- start

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
```

---

### **8. Nginx Configuration (Recommended)**

#### **Backend Proxy:**

Create `/etc/nginx/sites-available/rostracore-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
```

#### **Frontend Proxy:**

Create `/etc/nginx/sites-available/rostracore-frontend`:

```nginx
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
```

#### **Enable Sites:**

```bash
sudo ln -s /etc/nginx/sites-available/rostracore-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/rostracore-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### **SSL with Certbot:**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

### **9. Monitoring Setup**

#### **Sentry Configuration:**

1. Create account at https://sentry.io
2. Create two projects:
   - `rostracore-backend` (Python/FastAPI)
   - `rostracore-frontend` (JavaScript/Next.js)
3. Copy DSNs to environment variables
4. Verify integration:

```bash
# Backend test
python -c "import sentry_sdk; sentry_sdk.init('YOUR_DSN'); sentry_sdk.capture_message('Test from backend')"

# Check Sentry dashboard for message
```

#### **Flower (Celery Monitoring):**

```bash
# Create systemd service for Flower
sudo nano /etc/systemd/system/celery-flower.service
```

```ini
[Unit]
Description=Celery Flower Monitoring
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/rostracore/backend
Environment="PATH=/opt/rostracore/backend/venv/bin"
ExecStart=/opt/rostracore/backend/venv/bin/celery -A app.celery_app flower --port=5555

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable celery-flower
sudo systemctl start celery-flower

# Access at: http://your-server:5555
```

---

### **10. Security Checklist**

- [ ] **HTTPS Enabled** - SSL certificates installed
- [ ] **Environment Variables** - No secrets in code
- [ ] **Database Password** - Strong, unique password
- [ ] **Redis Password** - Authentication enabled
- [ ] **CORS** - Only allowed origins
- [ ] **Secret Key** - Random, min 32 characters
- [ ] **Firewall** - Only necessary ports open (80, 443)
- [ ] **Database Backups** - Daily automated backups
- [ ] **Rate Limiting** - Consider adding (e.g., slowapi)
- [ ] **SQL Injection** - Using parameterized queries (SQLAlchemy ✅)
- [ ] **XSS Protection** - Next.js built-in protection ✅

---

### **11. Performance Verification**

#### **Backend Performance:**

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s http://api.yourdomain.com/health

# Create curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n

# Expected:
# - Health check: < 200ms
# - Dashboard endpoints: < 500ms (first call), < 100ms (cached)
# - Prediction endpoints: < 1s
```

#### **Database Performance:**

```bash
# Check slow queries
psql -U user -d rostracore_prod

# Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 500;  -- Log queries > 500ms
SELECT pg_reload_conf();

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### **Redis Performance:**

```bash
# Check memory usage
redis-cli INFO memory

# Check hit rate
redis-cli INFO stats | grep keyspace

# Expected cache hit rate: > 80%
```

---

### **12. Testing Endpoints**

See `DEPLOYMENT_TESTING.sh` script for automated endpoint testing.

Quick manual tests:

```bash
# Health check
curl http://api.yourdomain.com/health

# Executive dashboard
curl http://api.yourdomain.com/api/v1/dashboards/executive

# Shift prediction
curl -X POST http://api.yourdomain.com/api/v1/predictions/shift-fill \
  -H "Content-Type: application/json" \
  -d '{
    "shift_start": "2025-11-10T08:00:00",
    "shift_end": "2025-11-10T16:00:00",
    "site_id": 1
  }'

# Churn predictions
curl http://api.yourdomain.com/api/v1/predictions/churn/at-risk?min_risk_level=medium
```

---

### **13. Backup Strategy**

#### **Database Backups:**

Create `/opt/scripts/backup-database.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/rostracore"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="rostracore_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U user rostracore_prod | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days
find $BACKUP_DIR -name "rostracore_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

```bash
# Make executable
chmod +x /opt/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/scripts/backup-database.sh
```

#### **Redis Backups:**

```bash
# Redis automatically saves to /var/lib/redis/dump.rdb
# Copy to backup location daily
0 3 * * * cp /var/lib/redis/dump.rdb /var/backups/rostracore/redis_$(date +\%Y\%m\%d).rdb
```

---

### **14. Rollback Plan**

#### **Database Rollback:**

```bash
# Downgrade one migration
alembic downgrade -1

# Downgrade to specific version
alembic downgrade <revision_id>

# Restore from backup
gunzip < /var/backups/rostracore/rostracore_YYYYMMDD.sql.gz | psql -U user rostracore_prod
```

#### **Application Rollback:**

```bash
# Docker
docker pull rostracore-backend:previous-tag
docker stop rostracore-api
docker run -d --name rostracore-api rostracore-backend:previous-tag

# Git
git checkout <previous-commit>
sudo systemctl restart rostracore-api
```

---

### **15. Post-Deployment Verification**

- [ ] **All endpoints responding** (use testing script)
- [ ] **Dashboards loading** with real data
- [ ] **Predictions working** with realistic results
- [ ] **Cache working** (verify Redis keys)
- [ ] **Celery tasks running** (check Flower dashboard)
- [ ] **No errors in Sentry** within 1 hour
- [ ] **SSL certificates valid**
- [ ] **Mobile responsive** (test on phone)
- [ ] **Performance acceptable** (< 2s page loads)
- [ ] **Database backups created**

---

### **16. Monitoring Dashboard URLs**

After deployment, verify access to:

- **Main App:** https://yourdomain.com
- **API Docs:** https://api.yourdomain.com/docs
- **Health Check:** https://api.yourdomain.com/health
- **Celery Flower:** http://your-server:5555 (restrict access)
- **Sentry:** https://sentry.io/organizations/your-org/

---

### **17. Common Issues & Solutions**

#### **Issue: Database connection failed**
```bash
# Solution: Check DATABASE_URL, verify PostgreSQL running
sudo systemctl status postgresql
psql -U user -d rostracore_prod -c "SELECT 1"
```

#### **Issue: Redis connection failed**
```bash
# Solution: Check Redis running, verify password
redis-cli -a your_password ping
```

#### **Issue: Celery workers not processing**
```bash
# Solution: Check Celery logs, restart workers
celery -A app.celery_app inspect active
sudo systemctl restart celery-worker
```

#### **Issue: CORS errors in frontend**
```bash
# Solution: Update ALLOWED_ORIGINS in backend .env
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

#### **Issue: Slow dashboard loading**
```bash
# Solution: Verify Redis cache, check database indexes
redis-cli KEYS "dashboard:*"
psql -c "\di" rostracore_prod
```

---

### **18. Scaling Recommendations**

#### **When to scale:**

- **> 100 concurrent users:** Add more Uvicorn workers
- **> 1000 employees:** Consider read replicas for database
- **> 10,000 shifts/month:** Increase Redis memory
- **> 100 roster generations/day:** Add more Celery workers

#### **Horizontal Scaling:**

```bash
# Multiple API servers behind load balancer
# Multiple Celery workers across servers
# PostgreSQL read replicas for heavy queries
# Redis Sentinel for high availability
```

---

## 🎉 **DEPLOYMENT COMPLETE**

Your RostraCore platform is now production-ready with:

✅ **4 Specialized Dashboards** - Real-time intelligence
✅ **AI Predictions** - Shift fill & churn forecasting
✅ **Background Jobs** - Automated roster generation
✅ **Full Monitoring** - Sentry + Flower
✅ **High Performance** - Redis caching + database indexes
✅ **Production Security** - HTTPS, authentication, backups

**Next Steps:**
1. User acceptance testing
2. Load testing (optional)
3. Marketing and onboarding
4. Monitor Sentry for errors
5. Collect user feedback

**Support:**
- Documentation: `/docs` in this repo
- API Docs: `https://api.yourdomain.com/docs`
- Sentry: Monitor errors and performance

---

*Last updated: 2025-11-07*
