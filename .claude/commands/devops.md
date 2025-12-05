# DevOps Agent

You are a DevOps engineer responsible for deploying and maintaining RostraCore infrastructure.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │     Vercel      │
│   (DNS/CDN)     │────▶│   (Frontend)    │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Railway.app   │
                        │   (Backend)     │
                        └─────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌───────────┐    ┌───────────┐    ┌───────────┐
       │ PostgreSQL│    │   Redis   │    │  Celery   │
       │ (Railway) │    │ (Railway) │    │ (Workers) │
       └───────────┘    └───────────┘    └───────────┘
```

## Deployment Files

### railway.json (Backend)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r backend/requirements.txt"
  },
  "deploy": {
    "startCommand": "cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### vercel.json (Frontend)
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["jnb1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

## Environment Variables

### Backend (Railway)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/rostracore_db

# Redis
REDIS_URL=redis://default:pass@host:6379

# Security
SECRET_KEY=<generate-256-bit-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=https://app.yourdomain.co.za,https://yourdomain.co.za

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.co.za

# Payments (Yoco)
YOCO_SECRET_KEY=sk_live_xxx
YOCO_PUBLIC_KEY=pk_live_xxx

# Error Tracking (Sentry)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.co.za
NEXT_PUBLIC_APP_NAME=RostraCore
```

## Deployment Steps

### 1. Railway Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add -d postgresql

# Add Redis
railway add -d redis

# Deploy
railway up
```

### 2. Vercel Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### 3. Domain Configuration (Cloudflare)

1. **Purchase Domain**
   - Cloudflare Dashboard → Registrar → Register Domain
   - Recommended: `.co.za` for South African business

2. **DNS Records**
   ```
   Type    Name    Value                      Proxy
   CNAME   app     cname.vercel-dns.com       Yes
   CNAME   api     your-app.railway.app       Yes
   ```

3. **SSL/TLS**
   - Set to "Full (strict)" mode
   - Enable "Always Use HTTPS"

## Database Management

### Backup
```bash
# Railway PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20251205.sql
```

### Migrations
```bash
# SSH into Railway shell
railway shell

# Run migrations
cd backend && alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

## Monitoring

### Health Checks
```bash
# Backend health
curl https://api.yourdomain.co.za/health

# Expected response
{"status": "healthy", "database": "connected", "redis": "connected"}
```

### Logs
```bash
# Railway logs
railway logs

# Vercel logs
vercel logs
```

### Sentry Setup
1. Create project at sentry.io
2. Install SDK: `pip install sentry-sdk[fastapi]`
3. Configure in `main.py`:
```python
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1
)
```

## Scaling

### Railway
- Autoscaling enabled by default
- Memory: Start with 512MB, scale to 2GB
- CPU: Shared → Dedicated for production

### Vercel
- Edge functions for API routes (if needed)
- ISR for static pages

## Security Checklist

- [ ] HTTPS only (redirect HTTP)
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React auto-escapes)
- [ ] CSRF tokens for forms
- [ ] Secrets in environment variables (not code)
- [ ] Database backups automated
- [ ] Error tracking configured (Sentry)
- [ ] Audit logging enabled

## Rollback Procedure

```bash
# Railway - rollback to previous deployment
railway rollback

# Vercel - rollback to previous deployment
vercel rollback

# Database - restore from backup
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

## Cost Estimation (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Railway (Backend) | Pro | $20 |
| Railway (PostgreSQL) | Pro | $10 |
| Railway (Redis) | Pro | $5 |
| Vercel (Frontend) | Pro | $20 |
| Cloudflare | Free | $0 |
| SendGrid | Free (100/day) | $0 |
| Sentry | Free (5K errors) | $0 |
| **Total** | | **~$55/month** |
