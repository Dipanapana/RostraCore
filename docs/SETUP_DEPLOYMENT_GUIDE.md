# RostraCore MVP - Complete Setup & Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-11-09
**Target Audience:** Developers, DevOps Engineers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application Locally](#running-the-application-locally)
6. [Testing](#testing)
7. [Building for Production](#building-for-production)
8. [Deployment Options](#deployment-options)
9. [Post-Deployment Configuration](#post-deployment-configuration)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | 18.17+ or 20+ | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **npm** or **pnpm** | Latest | Package manager | Comes with Node.js |
| **Git** | 2.x+ | Version control | [git-scm.com](https://git-scm.com) |
| **PostgreSQL** | 14+ | Database | [postgresql.org](https://postgresql.org) |
| **Python** | 3.9+ | Backend API | [python.org](https://python.org) |
| **VS Code** | Latest | Code editor (optional) | [code.visualstudio.com](https://code.visualstudio.com) |

### Verify Installations

```bash
# Check Node.js version
node --version
# Should output: v18.17.0 or higher

# Check npm version
npm --version
# Should output: 9.0.0 or higher

# Check Git version
git --version
# Should output: git version 2.x.x

# Check PostgreSQL
psql --version
# Should output: psql (PostgreSQL) 14.x or higher

# Check Python
python --version
# Should output: Python 3.9.x or higher
```

### Required Accounts

Before starting, create accounts on:

1. **GitHub** - [github.com](https://github.com) (for repository access)
2. **Vercel** - [vercel.com](https://vercel.com) (for frontend deployment)
3. **Railway/Render** - For backend deployment (optional)
4. **Hotjar** - [hotjar.com](https://hotjar.com) (for analytics - optional)
5. **Mouseflow** - [mouseflow.com](https://mouseflow.com) (for session replay - optional)

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository
git clone https://github.com/Dipanapana/RostraCore.git

# Navigate into the project
cd RostraCore

# Verify you're on the correct branch
git branch
# Should show: claude/rostracore-mvp-redesign-011CUrxozmUEEkAu7NUYuF6z
```

If you're not on the correct branch:

```bash
# Fetch all branches
git fetch origin

# Checkout the feature branch
git checkout claude/rostracore-mvp-redesign-011CUrxozmUEEkAu7NUYuF6z
```

### Step 2: Project Structure Overview

```
RostraCore/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js 14 App Router pages
│   │   │   ├── landing/     # Landing page
│   │   │   ├── pricing/     # Pricing page
│   │   │   ├── admin/       # Admin dashboard
│   │   │   │   ├── onboarding/
│   │   │   │   ├── analytics-debug/
│   │   │   │   ├── data-insights/
│   │   │   │   └── layout.tsx
│   │   │   └── page.tsx
│   │   ├── design-system/   # Reusable UI components
│   │   │   ├── components/
│   │   │   └── tokens.ts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and services
│   │   └── styles/
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Python FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   └── main.py
│   ├── requirements.txt
│   └── alembic/             # Database migrations
├── docs/                     # Documentation
│   ├── SETUP_DEPLOYMENT_GUIDE.md
│   ├── EMOTIONAL_JOURNEY_MAP.md
│   └── DATA_COLLECTION_STRATEGY.md
└── README.md
```

### Step 3: Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (choose one)
npm install
# OR
pnpm install

# This will install all packages from package.json
# Should take 2-5 minutes depending on internet speed
```

**Expected output:**
```
added 1234 packages, and audited 1235 packages in 2m
```

### Step 4: Install Backend Dependencies

```bash
# Navigate back to root
cd ..

# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# This will install FastAPI, SQLAlchemy, etc.
```

**Expected output:**
```
Successfully installed fastapi-0.104.1 uvicorn-0.24.0 ...
```

---

## Environment Configuration

### Step 1: Create Frontend Environment File

```bash
# Navigate to frontend directory
cd ../frontend

# Create .env.local file
touch .env.local

# Open in your editor
code .env.local
# OR
nano .env.local
```

### Step 2: Configure Frontend Environment Variables

Copy and paste this into `frontend/.env.local`:

```bash
# ===========================================
# RostraCore Frontend Environment Variables
# ===========================================

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database Connection (if using Prisma directly from frontend)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/rostracore_db

# Analytics & Tracking (Optional - Get from respective services)
# Hotjar
NEXT_PUBLIC_HOTJAR_SITE_ID=your_hotjar_site_id

# Mouseflow
NEXT_PUBLIC_MOUSEFLOW_SITE_ID=your_mouseflow_site_id

# Mixpanel (Optional)
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token

# Segment (Optional)
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_segment_write_key

# Google Analytics 4 (Optional)
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Authentication (if using NextAuth)
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# PayFast (South African Payment Gateway - Optional)
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_FEEDBACK_WIDGET=true
NEXT_PUBLIC_ENABLE_NPS_SURVEY=true
```

**Generate Secrets:**

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and paste as NEXTAUTH_SECRET value
```

### Step 3: Create Backend Environment File

```bash
# Navigate to backend directory
cd ../backend

# Create .env file
touch .env

# Open in your editor
code .env
# OR
nano .env
```

### Step 4: Configure Backend Environment Variables

Copy and paste this into `backend/.env`:

```bash
# ===========================================
# RostraCore Backend Environment Variables
# ===========================================

# Application Settings
APP_NAME=RostraCore
APP_ENV=development
DEBUG=True
SECRET_KEY=generate_another_random_secret_here

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/rostracore_db

# CORS (Frontend URLs that can access API)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# JWT Authentication
JWT_SECRET_KEY=generate_jwt_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (for notifications - Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Redis (for caching - Optional)
REDIS_URL=redis://localhost:6379/0

# Celery (for background tasks - Optional)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AWS S3 (for file storage - Optional)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=rostracore-files
AWS_REGION=af-south-1

# PSIRA API (if integrating with PSIRA verification)
PSIRA_API_KEY=your_psira_api_key
PSIRA_API_URL=https://psira-api.example.com

# Logging
LOG_LEVEL=INFO
```

**Generate Backend Secrets:**

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Database Setup

### Step 1: Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
1. Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer and follow wizard
3. Remember the password you set for `postgres` user

### Step 2: Create Database

```bash
# Open PostgreSQL prompt
psql -U postgres

# Inside psql prompt, run:
CREATE DATABASE rostracore_db;

# Create a user (optional - for production)
CREATE USER rostracore_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rostracore_db TO rostracore_user;

# Exit psql
\q
```

### Step 3: Verify Database Connection

```bash
# Test connection
psql -U postgres -d rostracore_db -c "SELECT version();"

# Should output PostgreSQL version info
```

### Step 4: Run Database Migrations

```bash
# Navigate to backend directory
cd backend

# Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Run Alembic migrations
alembic upgrade head

# Should output:
# INFO  [alembic.runtime.migration] Running upgrade -> xxxx, Initial migration
```

**If migrations don't exist yet, create them:**

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Create first migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### Step 5: Seed Database (Optional)

```bash
# Run seed script if it exists
python scripts/seed_database.py

# This populates test data for development
```

---

## Running the Application Locally

### Step 1: Start the Backend Server

```bash
# In backend directory with venv activated
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process [xxxxx] using StatReload
# INFO:     Started server process [xxxxx]
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
```

**Verify Backend is Running:**

Open browser and navigate to:
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Step 2: Start the Frontend Development Server

**Open a NEW terminal window/tab:**

```bash
# Navigate to frontend directory
cd frontend

# Start Next.js development server
npm run dev
# OR
pnpm dev

# Expected output:
# ▲ Next.js 14.0.3
# - Local:        http://localhost:3000
# - Network:      http://192.168.1.x:3000
#
# ✓ Ready in 2.5s
```

### Step 3: Verify Frontend is Running

Open browser and navigate to:
- Home: http://localhost:3000
- Landing: http://localhost:3000/landing
- Pricing: http://localhost:3000/pricing
- Onboarding: http://localhost:3000/admin/onboarding
- Data Insights: http://localhost:3000/admin/data-insights
- Analytics Debug: http://localhost:3000/admin/analytics-debug

### Step 4: Test Full Stack Integration

1. **Open http://localhost:3000/landing**
2. Click "Start Free Trial" button
3. Check browser console for analytics events
4. Check Network tab for API calls to http://localhost:8000

**You should see:**
- ✅ Page loads without errors
- ✅ Analytics events in console (if debug mode enabled)
- ✅ API calls successful (200 status codes)

---

## Testing

### Step 1: Run Frontend Tests

```bash
cd frontend

# Run unit tests
npm run test
# OR
npm run test:watch  # Watch mode for development

# Run E2E tests (if configured)
npm run test:e2e

# Run type checking
npm run type-check
# OR
npx tsc --noEmit

# Run linting
npm run lint
```

### Step 2: Run Backend Tests

```bash
cd backend
source venv/bin/activate

# Run pytest
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py

# Run with verbose output
pytest -v
```

### Step 3: Manual Testing Checklist

Create a file `TESTING_CHECKLIST.md`:

```markdown
# Manual Testing Checklist

## Landing Page
- [ ] Page loads correctly
- [ ] EN/AF language toggle works
- [ ] Mobile menu opens/closes
- [ ] CTA buttons track analytics
- [ ] Video play button works
- [ ] All sections render properly
- [ ] Mobile responsive (test at 375px, 768px, 1024px)

## Pricing Page
- [ ] Monthly/Annual toggle works
- [ ] ROI calculator slider functions
- [ ] All 3 plans display correctly
- [ ] CTA buttons navigate properly
- [ ] Feature comparison table renders
- [ ] FAQ section expands/collapses

## Onboarding Flow
- [ ] Progress indicator updates
- [ ] Step 1: Can add 3 employees
- [ ] Step 2: Can create site
- [ ] Step 3: Generate roster explanation shown
- [ ] Step 4: Can invite team (skip works)
- [ ] Step 5: Accounting integration (skip works)
- [ ] Celebration screen shows on completion
- [ ] Back button works between steps

## Data Collection
- [ ] FeedbackWidget appears
- [ ] Can submit feedback (all 4 types)
- [ ] NPS survey triggers (test manually)
- [ ] Quick emoji feedback works
- [ ] Analytics events tracked
- [ ] Opt-out mechanism functions

## Mobile Navigation
- [ ] Bottom nav appears on mobile
- [ ] Active states work
- [ ] Auto-hide on scroll down
- [ ] Show on scroll up
- [ ] Badges display correctly
- [ ] iOS safe area respected

## Analytics Debug Dashboard
- [ ] Events display in real-time
- [ ] Auto-refresh toggle works
- [ ] Export JSON functions
- [ ] Clear all works
- [ ] Event types summarized correctly

## Data Insights Dashboard
- [ ] Feature usage displays
- [ ] Conversion funnels render
- [ ] Time range filter works
- [ ] Tabs switch properly
- [ ] Export data functions
- [ ] Charts/visualizations load
```

Run through this checklist manually.

---

## Building for Production

### Step 1: Build Frontend

```bash
cd frontend

# Run production build
npm run build

# Expected output:
# ▲ Next.js 14.0.3
#
# Creating an optimized production build ...
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (15/15)
# ✓ Finalizing page optimization
#
# Route (app)                              Size     First Load JS
# ┌ ○ /                                   137 B          87.2 kB
# ├ ○ /landing                            5.3 kB         95.1 kB
# ├ ○ /pricing                            4.8 kB         93.2 kB
# └ ○ /admin/onboarding                   3.2 kB         91.5 kB
#
# ○  (Static)  automatically rendered as static HTML
```

### Step 2: Test Production Build Locally

```bash
# Start production server
npm run start

# Navigate to http://localhost:3000
# Test all critical paths
```

### Step 3: Analyze Bundle Size

```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // your existing config
})

# Run analyzer
ANALYZE=true npm run build

# Opens browser with bundle visualization
```

**Optimization Targets:**
- First Load JS: < 200 kB per page
- Total Bundle Size: < 500 kB
- Lighthouse Score: 90+ for all metrics

---

## Deployment Options

### Option 1: Deploy to Vercel (Recommended for Frontend)

**Prerequisites:**
- Vercel account created
- Vercel CLI installed

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login

# Follow prompts to authenticate
```

#### Step 3: Deploy Frontend

```bash
cd frontend

# First deployment (creates project)
vercel

# Follow prompts:
# ? Set up and deploy "~/RostraCore/frontend"? [Y/n] y
# ? Which scope? Your Name
# ? Link to existing project? [y/N] n
# ? What's your project's name? rostracore-frontend
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# Production deployment
vercel --prod

# Note the deployment URL: https://rostracore-frontend.vercel.app
```

#### Step 4: Configure Environment Variables on Vercel

```bash
# Via CLI
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://your-backend-api.com

# Or via Vercel Dashboard:
# 1. Go to vercel.com/dashboard
# 2. Select your project
# 3. Go to Settings > Environment Variables
# 4. Add all variables from .env.local
```

#### Step 5: Configure Custom Domain (Optional)

```bash
# Add domain via CLI
vercel domains add rostracore.co.za

# Or via dashboard:
# Settings > Domains > Add Domain
```

---

### Option 2: Deploy Backend to Railway

**Prerequisites:**
- Railway account created
- Railway CLI installed

#### Step 1: Install Railway CLI

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Windows
iwr https://railway.app/install.ps1 | iex
```

#### Step 2: Login to Railway

```bash
railway login

# Opens browser for authentication
```

#### Step 3: Initialize Project

```bash
cd backend

# Initialize Railway project
railway init

# Select: Create new project
# Name: rostracore-backend
```

#### Step 4: Add PostgreSQL Database

```bash
# Add PostgreSQL service
railway add --plugin postgresql

# This creates a PostgreSQL database and sets DATABASE_URL
```

#### Step 5: Deploy Backend

```bash
# Deploy to Railway
railway up

# Follow deployment logs
railway logs

# Get deployment URL
railway domain

# Note the URL: https://rostracore-backend.railway.app
```

#### Step 6: Set Environment Variables

```bash
# Set variables via CLI
railway variables set SECRET_KEY=your_secret_here
railway variables set JWT_SECRET_KEY=your_jwt_secret_here
railway variables set APP_ENV=production
railway variables set DEBUG=False

# Or via dashboard:
# railway.app/dashboard > Project > Variables
```

#### Step 7: Run Database Migrations

```bash
# SSH into Railway container
railway run bash

# Inside container:
alembic upgrade head

# Exit
exit
```

---

### Option 3: Deploy to AWS (Full Stack)

This is more complex. High-level overview:

#### Frontend (S3 + CloudFront)

```bash
# Build frontend
cd frontend
npm run build

# Install AWS CLI
# https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://rostracore-frontend

# Enable static website hosting
aws s3 website s3://rostracore-frontend --index-document index.html

# Upload build
aws s3 sync out/ s3://rostracore-frontend --delete

# Create CloudFront distribution (for CDN)
# Use AWS Console for this - complex CLI setup
```

#### Backend (EC2 or ECS)

```bash
# Launch EC2 instance
# Install Docker
# Deploy FastAPI in Docker container

# OR use Elastic Beanstalk:
eb init -p python-3.9 rostracore-backend
eb create production
eb deploy
```

**This is simplified - AWS deployment is complex and requires detailed knowledge.**

---

### Option 4: Deploy with Docker

#### Step 1: Create Dockerfile for Frontend

Create `frontend/Dockerfile`:

```dockerfile
# Multi-stage build
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Step 2: Create Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Step 3: Create docker-compose.yml

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/rostracore_db
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=rostracore_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### Step 4: Build and Run with Docker

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## Post-Deployment Configuration

### Step 1: Configure Analytics Services

#### Hotjar Setup

1. Go to [hotjar.com](https://hotjar.com)
2. Click "Add New Site"
3. Enter your domain: `rostracore.co.za`
4. Get Site ID from Settings
5. Add to Vercel environment variables:
   ```
   NEXT_PUBLIC_HOTJAR_SITE_ID=1234567
   ```
6. Redeploy: `vercel --prod`

#### Mouseflow Setup

1. Go to [mouseflow.com](https://mouseflow.com)
2. Click "Add Website"
3. Enter your domain
4. Get Site ID
5. Add to Vercel environment variables:
   ```
   NEXT_PUBLIC_MOUSEFLOW_SITE_ID=abc123def456
   ```
6. Redeploy

### Step 2: Set Up Custom Domain

#### Vercel (Frontend)

```bash
# Add domain
vercel domains add rostracore.co.za

# Configure DNS (at your registrar):
# Type: CNAME
# Name: www
# Value: cname.vercel-dns.com

# Type: A
# Name: @
# Value: 76.76.21.21
```

#### Railway (Backend)

```bash
# Add custom domain
railway domain add api.rostracore.co.za

# Configure DNS:
# Type: CNAME
# Name: api
# Value: [provided by Railway]
```

### Step 3: Enable HTTPS/SSL

**Vercel:**
- SSL automatically provisioned via Let's Encrypt
- Redirects HTTP to HTTPS automatically

**Railway:**
- SSL automatically provisioned
- Force HTTPS in your FastAPI app:

```python
# backend/app/main.py
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if os.getenv("APP_ENV") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

### Step 4: Configure Email Service

**Using SendGrid:**

```bash
# Install SendGrid
pip install sendgrid

# Add to backend/.env:
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@rostracore.co.za
```

**Backend code:**

```python
# backend/app/services/email.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_email(to_email, subject, html_content):
    message = Mail(
        from_email='noreply@rostracore.co.za',
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )

    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    response = sg.send(message)
    return response
```

### Step 5: Set Up Database Backups

**Railway (Automatic):**
- Railway automatically backs up PostgreSQL daily
- Restore via dashboard if needed

**Manual Backups:**

```bash
# Create backup script
#!/bin/bash
# backup_db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$DATE.sql"

# Backup database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://rostracore-backups/

# Delete local file
rm $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"
```

```bash
# Make executable
chmod +x backup_db.sh

# Add to crontab (daily at 2am)
crontab -e
# Add line:
0 2 * * * /path/to/backup_db.sh
```

---

## Monitoring & Maintenance

### Step 1: Set Up Error Monitoring

**Install Sentry:**

```bash
cd frontend
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

**Configure:**

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  tracesSampleRate: 0.1,
});
```

**Backend (FastAPI):**

```bash
cd backend
pip install sentry-sdk
```

```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("APP_ENV"),
    integrations=[FastApiIntegration()],
)
```

### Step 2: Set Up Uptime Monitoring

**Use UptimeRobot (Free):**

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor for: `https://rostracore.co.za`
3. Add monitor for: `https://api.rostracore.co.za/health`
4. Set alert email
5. Monitor every 5 minutes

### Step 3: Set Up Application Logs

**Vercel Logs:**

```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

**Railway Logs:**

```bash
# View logs
railway logs --follow
```

**Custom Log Aggregation (Optional):**

Use services like:
- Logtail
- DataDog
- New Relic

### Step 4: Performance Monitoring

**Frontend (Vercel Analytics):**

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to _app.tsx
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

**Backend (Custom Middleware):**

```python
# backend/app/middleware/performance.py
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Log slow requests
    if process_time > 1.0:
        logger.warning(f"Slow request: {request.url} took {process_time}s")

    return response
```

### Step 5: Regular Maintenance Tasks

**Weekly:**
- [ ] Review error logs in Sentry
- [ ] Check uptime reports
- [ ] Review analytics data
- [ ] Check disk space (if self-hosted)

**Monthly:**
- [ ] Update dependencies
- [ ] Review and rotate secrets
- [ ] Analyze performance metrics
- [ ] Review feedback submissions

**Quarterly:**
- [ ] Full security audit
- [ ] Load testing
- [ ] Backup restoration test
- [ ] Dependency security scan

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or use different port
PORT=3001 npm run dev
```

#### Issue 2: Database Connection Failed

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql     # Linux

# Verify connection string in .env
echo $DATABASE_URL
```

#### Issue 3: Module Not Found

**Error:**
```
Error: Cannot find module '@/design-system/components'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check tsconfig.json paths are correct
cat tsconfig.json | grep paths
```

#### Issue 4: Build Fails on Vercel

**Error:**
```
Error: Build failed with exit code 1
```

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript errors: `npm run type-check`
5. Ensure all dependencies are in `package.json`, not just `devDependencies`

#### Issue 5: API CORS Errors

**Error:**
```
Access to fetch at 'http://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://rostracore.co.za",
        "https://www.rostracore.co.za",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Quick Reference Commands

### Development

```bash
# Start frontend dev server
cd frontend && npm run dev

# Start backend dev server
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Run both in one command (using tmux or screen)
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
```

### Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && source venv/bin/activate && pytest

# Type check
cd frontend && npm run type-check

# Lint
cd frontend && npm run lint
```

### Database

```bash
# Create migration
cd backend && alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### Deployment

```bash
# Deploy frontend to Vercel
cd frontend && vercel --prod

# Deploy backend to Railway
cd backend && railway up

# View logs
vercel logs --follow           # Frontend
railway logs --follow           # Backend
```

---

## Security Checklist

Before going to production:

- [ ] All secrets rotated from defaults
- [ ] HTTPS enforced on all domains
- [ ] Database backups configured
- [ ] Error monitoring set up (Sentry)
- [ ] Uptime monitoring configured
- [ ] Rate limiting enabled on API
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Sensitive data encrypted at rest
- [ ] Environment variables never committed to git
- [ ] `.env` files in `.gitignore`
- [ ] Security headers configured
- [ ] POPIA compliance verified
- [ ] User data deletion mechanism tested
- [ ] Audit logs enabled

---

## Support & Resources

**Documentation:**
- `/docs/EMOTIONAL_JOURNEY_MAP.md`
- `/docs/DATA_COLLECTION_STRATEGY.md`
- This guide: `/docs/SETUP_DEPLOYMENT_GUIDE.md`

**External Resources:**
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- PostgreSQL: https://www.postgresql.org/docs

**Getting Help:**
- Create issue on GitHub
- Check documentation
- Review error logs in Sentry
- Check Vercel/Railway status pages

---

## Congratulations! 🎉

You've successfully set up and deployed RostraCore MVP!

**Next Steps:**
1. Test all critical user flows
2. Set up monitoring alerts
3. Configure backups
4. Plan first user testing session
5. Iterate based on feedback

**Remember:**
- Monitor error rates daily
- Review analytics weekly
- Update dependencies monthly
- Always test in staging before production

Good luck with your launch! 🚀
