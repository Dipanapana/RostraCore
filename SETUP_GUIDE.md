# 🚀 RostraCore Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Initial Configuration](#initial-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Operating System**: Ubuntu 20.04+ / macOS / Windows 10+ with WSL2
- **Python**: 3.11+
- **Node.js**: 18+ and npm/yarn
- **PostgreSQL**: 14+
- **Git**: Latest version
- **Redis**: 6+ (for background jobs)
- **Docker**: Latest (optional, for containerized deployment)

### Required Accounts
- GitHub account (for code repository)
- PayFast Merchant Account (for payments)
- SendGrid/SMTP provider (for emails)
- AWS S3 / CloudFlare R2 (for file storage - optional)

### System Requirements
**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Stable internet connection

**Recommended (Production):**
- 4+ CPU cores
- 8GB+ RAM
- 100GB SSD storage
- 10 Mbps+ internet connection

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/RostraCore.git
cd RostraCore
```

### 2. Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql postgresql-contrib redis-server
sudo apt install -y build-essential libpq-dev libcairo2 libpango-1.0-0 libpangocairo-1.0-0
```

**macOS:**
```bash
brew install python@3.11 postgresql@14 redis node
brew services start postgresql
brew services start redis
```

**Windows (WSL2):**
```bash
# Install WSL2 Ubuntu first
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql redis-server
```

---

## Database Setup

### 1. Start PostgreSQL

```bash
# Ubuntu/WSL
sudo service postgresql start

# macOS
brew services start postgresql

# Check status
sudo service postgresql status
```

### 2. Create Database and User

```bash
# Access PostgreSQL
sudo -u postgres psql

# In psql prompt:
CREATE DATABASE rostracore_db;
CREATE USER rostracore_user WITH PASSWORD 'your_secure_password_here';
ALTER ROLE rostracore_user SET client_encoding TO 'utf8';
ALTER ROLE rostracore_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE rostracore_user SET timezone TO 'Africa/Johannesburg';
GRANT ALL PRIVILEGES ON DATABASE rostracore_db TO rostracore_user;

# Grant schema privileges
\c rostracore_db
GRANT ALL ON SCHEMA public TO rostracore_user;

# Exit
\q
```

### 3. Verify Database Connection

```bash
psql -h localhost -U rostracore_user -d rostracore_db
# Enter password when prompted
# If successful, you'll see: rostracore_db=>
\q
```

---

## Backend Setup

### 1. Create Python Virtual Environment

```bash
cd backend
python3.11 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate

# Windows (WSL):
source venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Create .env file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Environment Variables:**

```env
# Database Configuration
DATABASE_URL=postgresql://rostracore_user:your_secure_password_here@localhost:5432/rostracore_db

# Application Settings
SECRET_KEY=your-super-secret-key-min-32-characters-long-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ENVIRONMENT=development

# CORS Origins (Frontend URL)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# PayFast Configuration
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_SANDBOX=true
PAYFAST_RETURN_URL=http://localhost:3000/payment/success
PAYFAST_CANCEL_URL=http://localhost:3000/payment/cancel
PAYFAST_NOTIFY_URL=http://localhost:8000/api/v1/payments/payfast/webhook

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@rostracore.com
FROM_NAME=RostraCore

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# File Storage (Optional - S3)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=rostracore-files
AWS_REGION=af-south-1

# Sentry (Error Tracking - Optional)
SENTRY_DSN=your_sentry_dsn
```

### 4. Generate Secret Key

```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Copy the output to SECRET_KEY in .env
```

### 5. Run Database Migrations

```bash
# Ensure virtual environment is activated
alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial schema
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, Add marketplace
...
INFO  [alembic.runtime.migration] Running upgrade 017 -> 018, Add subscription plans and RBAC
```

### 6. Verify Migration Success

```bash
# Check database tables
psql -h localhost -U rostracore_user -d rostracore_db -c "\dt"

# You should see all tables including:
# - organizations
# - employees
# - clients
# - sites
# - shifts
# - payroll
# - guard_applicants
# - marketplace_commissions
# - subscription_plans
# - superadmin_users
# etc.
```

### 7. Start Backend Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# OR using the startup script
python run.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using statreload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 8. Test Backend API

```bash
# In a new terminal, test health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "database": "connected"}

# Test API docs
# Open browser: http://localhost:8000/docs
```

---

## Frontend Setup

### 1. Install Node.js Dependencies

```bash
cd ../frontend
npm install

# OR using yarn
yarn install
```

### 2. Configure Environment Variables

```bash
# Create .env.local file
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Required Frontend Environment Variables:**

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# PayFast Configuration (matches backend)
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_PAYFAST_SANDBOX=true

# Application Settings
NEXT_PUBLIC_APP_NAME=RostraCore
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=development
```

### 3. Start Frontend Development Server

```bash
npm run dev

# OR using yarn
yarn dev
```

**Expected Output:**
```
> rostracore-frontend@1.0.0 dev
> next dev

- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully in 2.3s
- wait compiling...
- event compiled successfully in 124 ms
```

### 4. Access Application

Open browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/health

---

## Initial Configuration

### 1. Create First Organization

```bash
# Use API or psql to create first organization
psql -h localhost -U rostracore_user -d rostracore_db

INSERT INTO organizations (name, email, contact_number, address, subscription_status, created_at, updated_at)
VALUES (
    'Demo Security Company',
    'admin@demosecurity.co.za',
    '+27123456789',
    '123 Main Street, Johannesburg, 2000',
    'trial',
    NOW(),
    NOW()
);

# Get the organization ID
SELECT id FROM organizations WHERE name = 'Demo Security Company';
# Note the ID (e.g., 1)
```

### 2. Login as Superadmin

**Default Superadmin Credentials:**
- **Username**: `superadmin`
- **Password**: `admin123`
- **URL**: http://localhost:3000/superadmin/login

**⚠️ IMPORTANT: Change this password immediately after first login!**

```bash
# Change password via API
curl -X PUT http://localhost:8000/api/v1/superadmin/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "admin123",
    "new_password": "your_new_secure_password"
  }'
```

### 3. Configure Initial Settings

**Via Superadmin Dashboard:**

1. **Subscription Plans**: http://localhost:3000/superadmin/subscription-plans
   - Review default plans (Starter, Professional, Enterprise)
   - Adjust pricing if needed
   - Set feature flags

2. **Marketplace Pricing**: http://localhost:3000/admin/marketplace-pricing
   - CV Generation: R60
   - Marketplace Commission: R500 (deducted from guard)
   - Premium Job Tiers: Bronze (R200), Silver (R350), Gold (R500)
   - Bulk Packages: 10-pack (R4000), 25-pack (R9000), 50-pack (R15000)

3. **Assign Subscription to Demo Organization**:
   - Navigate to: http://localhost:3000/superadmin/organizations
   - Find "Demo Security Company"
   - Assign "Starter" plan with 14-day trial

### 4. Create Test Data

```bash
# Run seed script (if available)
python backend/scripts/seed_test_data.py

# OR manually create via API using /docs
```

**Recommended Test Data:**
- 5-10 employees
- 3-5 clients
- 5-10 sites
- 10-20 shifts (current month)
- 5-10 guard applicants in marketplace

---

## Redis Setup (Background Jobs)

### 1. Start Redis Server

```bash
# Ubuntu/WSL
sudo service redis-server start

# macOS
brew services start redis

# Verify Redis is running
redis-cli ping
# Expected: PONG
```

### 2. Start Celery Worker (Background Jobs)

```bash
# In backend directory with venv activated
celery -A app.celery_app worker --loglevel=info

# Start Celery Beat (Scheduled Tasks)
celery -A app.celery_app beat --loglevel=info
```

### 3. Start Flower (Celery Monitoring)

```bash
celery -A app.celery_app flower --port=5555

# Access Flower dashboard: http://localhost:5555
```

---

## Troubleshooting

### Database Connection Issues

**Error: "connection refused" or "could not connect to server"**

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL if not running
sudo service postgresql start

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Verify pg_hba.conf allows local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Ensure this line exists:
# local   all             all                                     md5
```

**Error: "FATAL: password authentication failed"**

```bash
# Reset password
sudo -u postgres psql
ALTER USER rostracore_user WITH PASSWORD 'your_new_password';
\q

# Update .env with new password
```

### Backend Won't Start

**Error: "ModuleNotFoundError"**

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Error: "Port 8000 already in use"**

```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# OR use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Build Issues

**Error: "Cannot find module"**

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Error: "API connection failed"**

```bash
# Verify backend is running
curl http://localhost:8000/health

# Check NEXT_PUBLIC_API_URL in .env.local
# Ensure no trailing slash: http://localhost:8000/api/v1 ✓
#                          http://localhost:8000/api/v1/ ✗
```

### Migration Issues

**Error: "Target database is not up to date"**

```bash
# Check current migration version
alembic current

# Check pending migrations
alembic history

# Force upgrade to latest
alembic upgrade head

# If still failing, manually check database
psql -h localhost -U rostracore_user -d rostracore_db
SELECT * FROM alembic_version;
```

**Error: "Duplicate table/column"**

```bash
# This means migration was partially applied
# Option 1: Manually complete the migration
psql -h localhost -U rostracore_user -d rostracore_db
# Fix the specific table/column issue

# Option 2: Downgrade and re-run
alembic downgrade -1
alembic upgrade head
```

### Performance Issues

**Backend is slow**

```bash
# Enable SQL query logging to identify slow queries
# In .env:
SQLALCHEMY_ECHO=true

# Check PostgreSQL slow query log
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: log_min_duration_statement = 1000  # Log queries > 1 second

# Restart PostgreSQL
sudo service postgresql restart
```

**Frontend is slow**

```bash
# Build production version to test performance
npm run build
npm run start

# Check bundle size
npm run analyze  # If analyzer is configured
```

---

## Verification Checklist

After completing setup, verify:

- [ ] PostgreSQL is running and accessible
- [ ] Redis is running and accessible
- [ ] Backend API responds at http://localhost:8000/health
- [ ] API documentation loads at http://localhost:8000/docs
- [ ] Frontend loads at http://localhost:3000
- [ ] Can login as superadmin (superadmin / admin123)
- [ ] Database has all tables (run `\dt` in psql)
- [ ] All environment variables are set correctly
- [ ] No errors in backend logs
- [ ] No errors in frontend console
- [ ] Can create test organization
- [ ] Can access marketplace features

---

## Next Steps

1. **Change default passwords** (superadmin, database)
2. **Configure email settings** (SendGrid/SMTP)
3. **Set up PayFast** merchant account and credentials
4. **Create test data** for development
5. **Review security settings** (CORS, allowed origins)
6. **Set up backup strategy** for database
7. **Configure monitoring** (Sentry for error tracking)
8. **Read TESTING_GUIDE.md** for testing procedures
9. **Read DEPLOYMENT_GUIDE.md** before going to production

---

## Support & Resources

- **Documentation**: `/docs` folder
- **API Reference**: http://localhost:8000/docs
- **GitHub Issues**: https://github.com/yourusername/RostraCore/issues
- **Contact**: support@rostracore.com

---

**Setup Complete! 🎉**

Your RostraCore development environment is now ready. Proceed to `TESTING_GUIDE.md` to verify all functionality works correctly.
