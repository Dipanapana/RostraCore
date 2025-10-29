# Quick Start Guide

Get RostraCore up and running in 3 simple steps!

---

## Prerequisites

Ensure you have installed:
- ✅ Python 3.9+
- ✅ Node.js 18+
- ✅ Docker Desktop (or PostgreSQL locally)

---

## Quick Start (3 Steps)

### Step 1: Start Database

**Option A - Using Docker (Recommended)**

Double-click: `start-database.bat`

Or in terminal:
```bash
cd backend
docker-compose up -d
```

**Option B - Using Local PostgreSQL**

Start your local PostgreSQL service and ensure the database `rostracore` exists.

---

### Step 2: Start Backend

**First time only** - Run migrations:
```bash
cd backend
venv\Scripts\activate
alembic upgrade head
```

**Then start the backend:**

Double-click: `start-backend.bat`

Or in terminal:
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

✅ **Backend running at:** http://localhost:8000
📚 **API Docs at:** http://localhost:8000/docs

---

### Step 3: Start Frontend

Double-click: `start-frontend.bat`

Or in terminal:
```bash
cd frontend
npm run dev
```

✅ **Frontend running at:** http://localhost:3000

---

## You're Ready! 🎉

Open your browser to: **http://localhost:3000**

### What You Can Do Now:

1. **Manage Employees** - Add security guards with skills and rates
2. **Manage Sites** - Add client locations with requirements
3. **Create Shifts** - Plan work schedules
4. **Set Availability** - Track when employees are available
5. **Generate Rosters** - Let the algorithm assign employees to shifts automatically!

---

## Stopping the Application

**Stop Backend:** Press `CTRL+C` in backend terminal

**Stop Frontend:** Press `CTRL+C` in frontend terminal

**Stop Database:**
```bash
cd backend
docker-compose down
```

---

## Need More Details?

See **TESTING_GUIDE.md** for comprehensive testing instructions and troubleshooting.

---

## Quick Health Check

Test if everything is running:

1. **Database:** `docker-compose ps` (should show rostracore_db running)
2. **Backend:** Visit http://localhost:8000/health (should return `{"status":"healthy"}`)
3. **Frontend:** Visit http://localhost:3000 (should show RostraCore homepage)

All green? Start testing! 🚀
