# 🔐 Login Troubleshooting Guide
## Fixing "401 Unauthorized" and Login Errors

**Error:** `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**Error:** `Login failed: AxiosError`

This guide will help you fix authentication issues step by step.

---

## 📋 Quick Checklist

Before diving deep, check these common issues:

- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] Admin user has been created (`create_admin.py`)
- [ ] Using correct credentials (username: `admin`, password: `admin123`)
- [ ] Correct API URL in frontend `.env.local`
- [ ] Database is running and accessible

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Check if Backend is Running

**Command:**
```bash
# Check if backend is running on port 8000
curl http://localhost:8000/api/v1/auth/login-json

# OR check API docs
curl http://localhost:8000/docs
```

**Expected:**
- ✅ You should get a response (even if it's an error about missing credentials)
- ❌ If you get "Connection refused" → Backend is NOT running

**Fix if Backend Not Running:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Step 2: Create Admin User

**The Problem:**

The login page shows demo credentials:
- Username: `admin`
- Password: `admin123`

But this user doesn't exist in the database by default. You need to create it!

**Solution:**

```bash
cd backend
python create_admin.py
```

**Expected Output:**
```
Creating admin user...

✅ Admin user created successfully!
   Username: admin
   Email: admin@rostracore.com
   Password: admin123
   Role: admin

⚠️  IMPORTANT: Change the admin password after first login!
```

**If you see:**
```
❌ Admin user already exists!
```
That's fine! The user is already created.

---

### Step 3: Check Frontend API URL

**File:** `frontend/.env.local`

The frontend needs to know where the backend is running.

**Check:**
```bash
cat frontend/.env.local
```

**Expected:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**If file doesn't exist, create it:**
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

**Then restart frontend:**
```bash
npm run dev
```

---

### Step 4: Test Login Endpoint Directly

Test if the backend authentication works:

**Command:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Expected Response (SUCCESS):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**If you get this, authentication is working!** ✅

**Possible Error Responses:**

#### Error 1: 401 Unauthorized
```json
{"detail": "Incorrect username or password"}
```

**Causes:**
1. Admin user not created → Run `python create_admin.py`
2. Wrong password
3. Database issue

**Fix:**
```bash
# Check if admin user exists in database
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    print(f'✅ Admin exists: {admin.username} ({admin.email})')
    print(f'   Active: {admin.is_active}')
    print(f'   Role: {admin.role.value}')
else:
    print('❌ Admin user does NOT exist - run create_admin.py')

db.close()
"
```

#### Error 2: 403 Forbidden
```json
{"detail": "Please verify your email before logging in..."}
```

**Cause:** Email verification is enabled but admin hasn't verified email.

**Fix:**
```bash
# Disable email verification for testing
# In backend/app/config.py, set:
ENABLE_EMAIL_VERIFICATION = False

# OR verify the admin user in database:
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    admin.is_email_verified = True
    db.commit()
    print('✅ Admin email verified')

db.close()
"
```

#### Error 3: 500 Internal Server Error
```json
{"detail": "Internal server error"}
```

**Cause:** Database connection issue or backend error.

**Fix:**
1. Check backend logs for the actual error
2. Make sure PostgreSQL is running
3. Check database connection in `backend/app/config.py`

---

### Step 5: Check CORS Configuration

If the backend is running but frontend can't connect, it might be CORS.

**File:** `backend/app/main.py`

**Look for:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← Should allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**If CORS is too restrictive, temporarily allow all:**
```python
allow_origins=["*"]
```

Then restart backend.

---

### Step 6: Check Browser Console

Open browser DevTools (F12) → Console tab

**Look for:**

#### Network Tab:
1. Go to Network tab
2. Try logging in
3. Look for the request to `/api/v1/auth/login-json`
4. Click on it and check:
   - **Status Code:** Should be 200, if 401 → Wrong credentials
   - **Request URL:** Should be `http://localhost:8000/api/v1/auth/login-json`
   - **Request Payload:** Should show `{"username": "admin", "password": "admin123"}`
   - **Response:** Should show `{"access_token": "...", "token_type": "bearer"}`

#### Console Tab:
Look for errors like:
- `Failed to fetch` → Backend not running
- `CORS policy` → CORS issue
- `401 Unauthorized` → Wrong credentials or user doesn't exist
- `Network Error` → Check API URL in `.env.local`

---

## 🛠️ Complete Fresh Start

If nothing works, start from scratch:

### 1. Stop Everything
```bash
# Stop frontend (Ctrl+C)
# Stop backend (Ctrl+C)
```

### 2. Check Database
```bash
# Make sure PostgreSQL is running
# Windows:
# Check services or start PostgreSQL from Start menu

# Linux/Mac:
sudo systemctl status postgresql
# or
brew services list | grep postgres
```

### 3. Reset Admin User
```bash
cd backend

# Delete existing admin
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    db.delete(admin)
    db.commit()
    print('✅ Deleted old admin')
else:
    print('ℹ️  No admin to delete')

db.close()
"

# Create fresh admin
python create_admin.py
```

### 4. Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using WatchFiles
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 5. Test Backend
In a **new terminal**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Should return:
```json
{"access_token": "eyJ...", "token_type": "bearer"}
```

### 6. Start Frontend
In a **new terminal**:
```bash
cd frontend

# Make sure .env.local exists
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

### 7. Test Login
1. Open browser: http://localhost:3000/login
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Sign In"
4. Should redirect to dashboard

---

## 🔍 Advanced Debugging

### Check Database Connection

```bash
cd backend
python -c "
from app.database import engine, SessionLocal
from sqlalchemy import text

try:
    # Test connection
    db = SessionLocal()
    db.execute(text('SELECT 1'))
    print('✅ Database connection OK')

    # Check users table
    from app.models.user import User
    count = db.query(User).count()
    print(f'✅ Found {count} users in database')

    db.close()
except Exception as e:
    print(f'❌ Database error: {e}')
"
```

### Check User Password Hash

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User
from app.auth.security import verify_password

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    print(f'Username: {admin.username}')
    print(f'Hashed Password: {admin.hashed_password[:50]}...')

    # Test password verification
    is_valid = verify_password('admin123', admin.hashed_password)
    print(f'Password \"admin123\" valid: {is_valid}')
else:
    print('❌ Admin not found')

db.close()
"
```

### Enable Debug Logging

**Backend:** `backend/app/main.py`
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:** `frontend/src/context/AuthContext.tsx`
The auth context already has console.log statements. Check browser console for:
```
[AUTH] 1. Starting login process...
[AUTH] 2. Login successful, received token
[AUTH] 3. Fetching user info...
[AUTH] 4. Redirecting to dashboard...
```

If you see error before step 2, it's a backend issue.
If you see error after step 2, it's likely the `/auth/me` endpoint failing.

---

## 📋 Common Error Messages

### "Failed to fetch"
**Cause:** Backend not running or wrong URL
**Fix:** Start backend, check `.env.local`

### "Network Error"
**Cause:** CORS or backend not accessible
**Fix:** Check CORS settings, make sure backend is on `0.0.0.0:8000`

### "401 Unauthorized"
**Cause:** Wrong credentials or user doesn't exist
**Fix:** Create admin user, verify credentials

### "403 Forbidden"
**Cause:** Email verification required
**Fix:** Disable email verification or verify admin email

### "500 Internal Server Error"
**Cause:** Backend error (database, code bug)
**Fix:** Check backend logs, fix the error

---

## ✅ Success Checklist

When login works, you should see:

1. **Browser Console:**
   ```
   [AUTH] 1. Starting login process...
   [AUTH] 2. Login successful, received token
   [AUTH] 3. Fetching user info...
   [AUTH] 4. Redirecting to dashboard...
   [AUTH] 5. Push completed
   ```

2. **Network Tab:**
   - POST `/api/v1/auth/login-json` → 200 OK
   - GET `/api/v1/auth/me` → 200 OK

3. **Page Behavior:**
   - Login page disappears
   - Dashboard page loads
   - Sidebar shows navigation
   - No error messages

---

## 🆘 Still Not Working?

If you've tried everything and it still doesn't work:

1. **Check backend logs** - Look for errors in terminal where backend is running
2. **Check frontend logs** - Look in browser console for errors
3. **Verify all services running:**
   ```bash
   # PostgreSQL running?
   # Backend running on port 8000?
   # Frontend running on port 3000?
   ```

4. **Create test user manually:**
   ```bash
   cd backend
   python -c "
   from app.database import SessionLocal
   from app.models.user import User, UserRole
   from app.auth.security import get_password_hash

   db = SessionLocal()

   # Delete old test user
   old_user = db.query(User).filter(User.username == 'testuser').first()
   if old_user:
       db.delete(old_user)
       db.commit()

   # Create test user
   user = User(
       username='testuser',
       email='test@test.com',
       hashed_password=get_password_hash('test123'),
       full_name='Test User',
       role=UserRole.USER,
       is_active=True,
       is_email_verified=True  # Skip email verification
   )

   db.add(user)
   db.commit()
   print('✅ Test user created: testuser / test123')

   db.close()
   "
   ```

   Then try logging in with:
   - Username: `testuser`
   - Password: `test123`

5. **Check environment variables:**
   ```bash
   # Backend
   cat backend/app/config.py | grep -E "SECRET_KEY|ALGORITHM|ACCESS_TOKEN"

   # Frontend
   cat frontend/.env.local
   ```

---

## 📝 Summary

**Most Common Issue:** Admin user not created.

**Quick Fix:**
```bash
cd backend
python create_admin.py
```

Then refresh login page and try again with:
- Username: `admin`
- Password: `admin123`

---

**If this guide helped, great! If not, check the backend terminal output for specific errors and search for those error messages.**
