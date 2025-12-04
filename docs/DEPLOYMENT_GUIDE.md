# RostraCore Deployment Guide

## Quick Deployment (Railway.app - Recommended)

Railway offers free $5 credit, supports PostgreSQL, Python, and Node.js with built-in HTTPS.

### Step 1: Prerequisites

- GitHub account with repository access
- Railway account (https://railway.app - sign up with GitHub)

### Step 2: Deploy Backend

1. Go to https://railway.app and click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your RostraCore repository
4. Railway will auto-detect Python - set the following:
   - **Root Directory:** `backend`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Add PostgreSQL:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-creates `DATABASE_URL`

6. Add environment variables (Settings → Variables):

```env
# Required
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=generate-32-char-random-string
FRONTEND_URL=https://your-frontend.railway.app
ALLOWED_ORIGINS=https://your-frontend.railway.app

# Production Settings
ENVIRONMENT=production
DEBUG=False
TESTING_MODE=False
SKIP_CERTIFICATION_CHECK=False
SKIP_AVAILABILITY_CHECK=False

# BCEA Compliance
MAX_HOURS_WEEK=48
MIN_REST_HOURS=8
```

7. Run migrations:
   - Railway shell: `alembic upgrade head`

### Step 3: Deploy Frontend

1. In the same project, click "New" → "GitHub Repo"
2. Select the same repo, configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

3. Add environment variable:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Step 4: Get Your URLs

Railway auto-generates URLs like:
- Backend: `https://rostracore-backend-production.up.railway.app`
- Frontend: `https://rostracore-frontend-production.up.railway.app`

Update `FRONTEND_URL` and `ALLOWED_ORIGINS` in backend with actual frontend URL.

---

## Alternative: Render.com

### Backend

1. Create Web Service from GitHub
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. Add PostgreSQL ($7/month for smallest tier)
4. Add same environment variables as above

### Frontend

1. Create Static Site from GitHub
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `frontend/.next`

---

## Local Development Setup

### System Requirements

- Python 3.11+
- PostgreSQL 14+
- Node.js 18+
- Redis (optional, for background tasks)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local

# Start development server
npm run dev
```

---

## Initial Data Setup

### 1. Create Admin User

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User
from app.auth.security import get_password_hash
import secrets

db = SessionLocal()

# Create admin
admin = User(
    username='admin',
    email='admin@company.co.za',
    hashed_password=get_password_hash('SecurePassword123!'),
    role='admin',
    is_active=True,
    is_superadmin=False
)
db.add(admin)
db.commit()
print(f'Admin created: admin / SecurePassword123!')
db.close()
"
```

### 2. Create Organization

After logging in, create organization via the UI or:

```bash
python -c "
from app.database import SessionLocal
from app.models.organization import Organization

db = SessionLocal()
org = Organization(
    company_name='Your Security Company',
    org_code='SEC001',
    subscription_status='active'
)
db.add(org)
db.commit()
print(f'Organization created: {org.org_id}')
db.close()
"
```

### 3. Import Employees

Option A: Use the UI to add employees manually

Option B: Use Excel import endpoint:
```
POST /api/v1/employees/import
Content-Type: multipart/form-data
file: employees.xlsx
```

Excel should have columns:
- first_name, last_name
- email, phone
- id_number (SA ID)
- psira_number, psira_grade (A/B/C/D/E)
- hourly_rate
- status (ACTIVE)

---

## Production Checklist

Before going live:

- [ ] `DEBUG=False`
- [ ] `TESTING_MODE=False`
- [ ] `SKIP_CERTIFICATION_CHECK=False`
- [ ] `SKIP_AVAILABILITY_CHECK=False`
- [ ] Strong `SECRET_KEY` (32+ characters)
- [ ] `ALLOWED_ORIGINS` only has production URLs
- [ ] Database backups configured
- [ ] SSL/HTTPS enabled (automatic on Railway/Render)

---

## Troubleshooting

### 401 Unauthorized on API calls

1. Check `ALLOWED_ORIGINS` includes frontend URL
2. Ensure token is being sent in Authorization header
3. Check token hasn't expired (default 30 min)

### Roster generation returns empty

1. Verify shifts exist for the date range
2. Check employees are ACTIVE status
3. Verify availability records exist
4. Check `max_hours_week` is not NULL

### Database connection errors

1. Check `DATABASE_URL` format
2. Ensure PostgreSQL is running
3. Run migrations: `alembic upgrade head`

---

## Backup & Recovery

### Export Database (Railway)

```bash
# Get connection string from Railway dashboard
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Import Database

```bash
psql $DATABASE_URL < backup.sql
```

---

## Support

- GitHub Issues: https://github.com/your-repo/issues
- Email: support@yourcompany.co.za
