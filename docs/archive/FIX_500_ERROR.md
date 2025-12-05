# 🔥 Fixing 500 Internal Server Error

## Quick Diagnosis

**Error:** `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`

**What this means:** The backend server crashed while processing your request.

---

## 🎯 Step 1: Find Which Endpoint Failed

### Method 1: Browser DevTools

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for red items with status **500**
5. Click on the failed request
6. Note the **Request URL**

**Example:**
```
Request URL: http://localhost:8000/api/v1/dashboard/metrics
Status: 500 Internal Server Error
```

### Method 2: Check Browser Console

Look for error messages like:
```
GET http://localhost:8000/api/v1/dashboard/metrics 500 (Internal Server Error)
```

---

## 🔍 Step 2: Check Backend Logs

**The backend terminal shows the ACTUAL error!**

### Look at your backend terminal window

You should see something like:

```python
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "...", line 123, in get_metrics
    result = db.query(Employee).filter(Employee.org_id == None).first()
                                                           ^^^^
AttributeError: 'NoneType' object has no attribute 'org_id'
```

**This is the REAL error you need to fix!**

### If backend isn't showing errors:

**Restart backend with more logging:**

```bash
cd backend

# Stop current backend (Ctrl+C)

# Start with debug logging
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

Then reproduce the error and check the output.

---

## 🐛 Common Causes of 500 Errors

### 1. Database Connection Issues

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Fix:**
```bash
# Check if PostgreSQL is running

# Windows:
# Check Services → PostgreSQL should be running

# Linux:
sudo systemctl status postgresql

# If not running:
sudo systemctl start postgresql
```

**Verify connection:**
```bash
cd backend
python -c "
from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('✅ Database connection OK')
except Exception as e:
    print(f'❌ Database error: {e}')
"
```

---

### 2. Missing Database Tables

**Error:**
```
sqlalchemy.exc.ProgrammingError: relation "employees" does not exist
```

**Fix:**
```bash
cd backend

# Run migrations
alembic upgrade head

# Or create tables directly
python -c "
from app.database import engine, Base
from app.models import employee, site, shift, user  # Import all models

Base.metadata.create_all(bind=engine)
print('✅ Tables created')
"
```

---

### 3. Missing Environment Variables

**Error:**
```
KeyError: 'SECRET_KEY'
```

**Fix:**

Check `backend/.env` exists and has all required variables:

```bash
cd backend
cat .env
```

**Should contain:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/rostracore_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**If missing, create it:**
```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rostracore_db
SECRET_KEY=rostracore_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENABLE_EMAIL_VERIFICATION=False
TESTING_MODE=True
EOF
```

---

### 4. Import Errors

**Error:**
```
ModuleNotFoundError: No module named 'app.api.deps'
```

**Fix:**
We already created `app.api.deps` - make sure it exists:

```bash
ls -la backend/app/api/deps.py
```

If missing, it was created in commit `aca874b`.

---

### 5. Null/None Reference Errors

**Error:**
```
AttributeError: 'NoneType' object has no attribute 'site_name'
```

**Common in:**
- Dashboard metrics (counting null values)
- Relationships (accessing related objects that don't exist)

**Fix:** Add null checks in the code.

---

### 6. Missing User/Organization

**Error:**
```
AttributeError: 'NoneType' object has no attribute 'org_id'
```

**Cause:** Endpoints expecting `current_user.org_id` but user doesn't have org_id.

**Fix:**
```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    print(f'Admin org_id: {admin.org_id}')

    if admin.org_id is None:
        # Create or assign org
        from app.models.organization import Organization

        org = db.query(Organization).first()
        if not org:
            org = Organization(
                org_name='Default Organization',
                contact_email='admin@rostracore.com'
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        admin.org_id = org.org_id
        db.commit()
        print(f'✅ Assigned org_id: {org.org_id}')
else:
    print('❌ Admin not found')

db.close()
"
```

---

## 🔧 Diagnostic Script

Run this to check common issues:

```bash
cd backend
python << 'PYTHON'
print("="*60)
print("🔍 500 ERROR DIAGNOSTIC")
print("="*60)

# 1. Check database connection
print("\n1️⃣ Database Connection...")
try:
    from app.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print("   ✅ Database connection OK")
except Exception as e:
    print(f"   ❌ Database error: {e}")

# 2. Check tables exist
print("\n2️⃣ Database Tables...")
try:
    from app.database import engine
    from sqlalchemy import inspect

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = ['users', 'employees', 'sites', 'shifts']

    for table in required_tables:
        if table in tables:
            print(f"   ✅ {table} exists")
        else:
            print(f"   ❌ {table} MISSING - run migrations!")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 3. Check admin user
print("\n3️⃣ Admin User...")
try:
    from app.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    admin = db.query(User).filter(User.username == 'admin').first()

    if admin:
        print(f"   ✅ Admin exists (ID: {admin.user_id})")
        print(f"      org_id: {admin.org_id}")

        if admin.org_id is None:
            print("      ⚠️  WARNING: Admin has no organization!")
    else:
        print("   ❌ Admin not found")

    db.close()
except Exception as e:
    print(f"   ❌ Error: {e}")

# 4. Check environment variables
print("\n4️⃣ Environment Variables...")
try:
    from app.config import settings

    checks = [
        ('SECRET_KEY', settings.SECRET_KEY[:20] if settings.SECRET_KEY else None),
        ('DATABASE_URL', 'postgresql://' in settings.DATABASE_URL if settings.DATABASE_URL else False),
        ('ALGORITHM', settings.ALGORITHM),
    ]

    for key, value in checks:
        if value:
            print(f"   ✅ {key}: {value if key != 'SECRET_KEY' else value + '...'}")
        else:
            print(f"   ❌ {key}: NOT SET!")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "="*60)
print("Done! Check above for any ❌ errors")
print("="*60)
PYTHON
```

---

## 🎯 Specific Endpoint Fixes

### Dashboard Metrics (500 Error)

**Endpoint:** `/api/v1/dashboard/metrics`

**Common cause:** Null reference when counting

**Fix:**

```bash
cd backend
# Check if file exists
ls -la app/api/endpoints/dashboard.py

# If metrics calculation fails, it might need null checks
```

**Add to `dashboard.py`:**
```python
# Safe counting with null checks
total_employees = db.query(Employee).filter(
    Employee.status == EmployeeStatus.ACTIVE
).count() or 0

# Safe aggregation
from sqlalchemy import func

total_cost = db.query(
    func.coalesce(func.sum(ShiftAssignment.cost), 0)
).scalar() or 0.0
```

---

### Clients Page (500 Error)

**Endpoint:** `/api/v1/clients`

**Common cause:** Organization filtering

**Fix:**

Check `backend/app/api/endpoints/clients.py` line 62-68:

```python
@router.get("/", response_model=List[ClientWithSites])
async def list_clients(
    org_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all clients with optional filtering."""
    query = db.query(Client)

    if org_id:
        query = query.filter(Client.org_id == org_id)
    # ... rest of function
```

If `org_id` is required but None, this could fail.

---

## 🚀 Quick Fixes

### Fix 1: Recreate Database

```bash
cd backend

# Backup first (if you have data)
# Then drop and recreate

# In psql:
psql -U postgres
DROP DATABASE rostracore_db;
CREATE DATABASE rostracore_db;
\q

# Run migrations
alembic upgrade head

# Create admin
python create_admin.py
```

### Fix 2: Reset to Testing Mode

**File:** `backend/app/config.py`

```python
TESTING_MODE = True
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True
ENABLE_EMAIL_VERIFICATION = False
```

Restart backend.

### Fix 3: Check Import Paths

```bash
cd backend

# Test all imports work
python -c "
from app.api.endpoints import dashboard
from app.api.endpoints import clients
from app.api.endpoints import employees
print('✅ All imports successful')
"
```

---

## 📊 Debugging Workflow

```
1. Note which URL returned 500 (Network tab)
   ↓
2. Check backend terminal for stack trace
   ↓
3. Identify the error type:
   - Database connection? → Start PostgreSQL
   - Missing table? → Run migrations
   - Import error? → Check deps.py exists
   - Null reference? → Add null checks
   - Missing env var? → Create .env file
   ↓
4. Apply specific fix
   ↓
5. Restart backend
   ↓
6. Test again
```

---

## 🆘 Need More Help?

**Provide these details:**

1. **Which page/endpoint failed?**
   - Example: Dashboard, Clients page, Login

2. **Backend terminal output**
   - Copy the full error traceback

3. **Request details from Network tab:**
   - URL
   - Method (GET/POST)
   - Request payload (if any)

4. **Recent changes:**
   - Did it work before?
   - What did you change?

---

## ✅ Verification

After fixing:

```bash
# 1. Backend should start without errors
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# (No error messages)

# 2. Health check should work
curl http://localhost:8000/health

# Should return:
# {"status":"ok",...}

# 3. Test specific endpoint
curl http://localhost:8000/api/v1/dashboard/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return JSON (not 500)
```

---

**Most common fix:** PostgreSQL not running or migrations not run.

**Quick fix:**
```bash
# Start PostgreSQL
# Windows: Check Services
# Linux: sudo systemctl start postgresql

# Run migrations
cd backend
alembic upgrade head

# Restart backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
