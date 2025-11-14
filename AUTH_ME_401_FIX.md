# 🔧 Fixing "/auth/me 401 Error" After Successful Login

## Problem Description

You're seeing this error:
```
[AUTH] Failed to fetch user info: AxiosError {message: 'Request failed with status code 401'...}
```

**What's happening:**
1. ✅ Login succeeds - you get an access token
2. ❌ `/api/v1/auth/me` endpoint returns 401 Unauthorized
3. ❌ Can't access dashboard or any protected pages

**This means:** The token is created but fails validation.

---

## 🎯 Quick Fix

The most common cause is **email verification** blocking access.

### Solution 1: Verify Admin Email (Recommended for Production)

```bash
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
    print(f'   User: {admin.username}')
    print(f'   Email: {admin.email}')
else:
    print('❌ Admin user not found')

db.close()
"
```

### Solution 2: Disable Email Verification (For Testing)

**File:** `backend/app/config.py`

Find and change:
```python
ENABLE_EMAIL_VERIFICATION = False  # ← Set to False
```

Then restart the backend.

---

## 🔍 Diagnostic Test

Run this test script to check your authentication flow:

```bash
python test_auth.py
```

This will test:
- ✅ Admin user exists
- ✅ Password verification works
- ✅ Token creation works
- ✅ Token decoding works
- ✅ User lookup works
- ✅ Email verification status

**Expected output:**
```
🔐 AUTHENTICATION FLOW DIAGNOSTIC
============================================================

📋 STEP 1: Check Admin User
------------------------------------------------------------
✅ Admin user exists
   User ID: 1
   Username: admin
   Email: admin@rostracore.com
   Role: admin
   Active: True
   Email Verified: False  ← Problem if email verification is enabled!

...

✅ ALL TESTS PASSED!
```

---

## 🐛 Detailed Debugging Steps

### Step 1: Check What the Frontend is Sending

**Open Browser DevTools (F12) → Network Tab**

1. Try logging in
2. Find the request to `/api/v1/auth/login-json`
3. Check **Response** tab - you should see:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "bearer"
   }
   ```

4. Find the **NEXT** request to `/api/v1/auth/me`
5. Click on it and check:
   - **Request Headers** → Should have:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - **Response** tab → Should show the error:
     ```json
     {"detail": "Could not validate credentials"}
     ```
     OR
     ```json
     {"detail": "Please verify your email before logging in..."}
     ```

### Step 2: Check Backend Logs

When the `/auth/me` request fails, check your backend terminal for errors:

**Common errors:**

#### Error 1: Email Verification
```
INFO: 192.168.1.100:52431 - "GET /api/v1/auth/me HTTP/1.1" 403 Forbidden
```

**Fix:** Verify admin email (see Quick Fix above)

#### Error 2: JWT Decode Error
```
ERROR: Error decoding JWT token
```

**Causes:**
- SECRET_KEY changed between token creation and validation
- Token corrupted
- Wrong ALGORITHM

**Fix:**
```bash
cd backend

# Check SECRET_KEY
python -c "from app.config import settings; print(f'SECRET_KEY: {settings.SECRET_KEY[:20]}...')"

# Check ALGORITHM
python -c "from app.config import settings; print(f'ALGORITHM: {settings.ALGORITHM}')"
```

Expected:
```
SECRET_KEY: rostracore_secret_ke...
ALGORITHM: HS256
```

#### Error 3: User Not Found
```
INFO: User lookup failed for user_id: 1
```

**Fix:**
```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

# Check if user_id 1 exists
user = db.query(User).filter(User.user_id == 1).first()

if user:
    print(f'✅ User found: {user.username}')
else:
    print('❌ No user with ID 1 - database might be corrupted')

    # List all users
    all_users = db.query(User).all()
    print(f'Total users: {len(all_users)}')
    for u in all_users:
        print(f'  - ID {u.user_id}: {u.username}')

db.close()
"
```

### Step 3: Test Token Manually

```bash
# 1. Login and get token
curl -X POST http://localhost:8000/api/v1/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  > token.json

# 2. Extract token
TOKEN=$(cat token.json | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 3. Try accessing /auth/me with the token
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (SUCCESS):**
```json
{
  "user_id": 1,
  "username": "admin",
  "email": "admin@rostracore.com",
  "full_name": "System Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z",
  "last_login": "2025-01-15T12:30:00Z"
}
```

**If you get this, backend is working!** Issue is on frontend.

**Possible Errors:**

```json
{"detail": "Could not validate credentials"}
```
→ Token invalid - check SECRET_KEY, ALGORITHM

```json
{"detail": "Please verify your email before logging in..."}
```
→ Email verification enabled - disable or verify email

```json
{"detail": "Inactive user"}
```
→ User is not active - check `is_active` field

---

## 🔧 Advanced Fixes

### Fix 1: Reset SECRET_KEY (If Changed)

**WARNING:** This will invalidate all existing tokens!

**File:** `backend/app/config.py`

```python
SECRET_KEY: str = "rostracore_secret_key_change_in_production"  # ← Must be same value always
```

**To generate new SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Then update `config.py` and restart backend.

### Fix 2: Check User.is_active

```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()

if admin:
    if not admin.is_active:
        print('❌ Admin is INACTIVE - activating...')
        admin.is_active = True
        db.commit()
        print('✅ Admin activated')
    else:
        print('✅ Admin is already active')

db.close()
"
```

### Fix 3: Check CORS Headers

The frontend needs to send credentials. Check `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ← Frontend URL
    allow_credentials=True,  # ← MUST be True for auth to work
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If `allow_credentials` is `False`, auth won't work.

### Fix 4: Token Payload Mismatch

Check what's in the token:

```bash
cd backend
python -c "
from app.auth.security import create_access_token, decode_access_token
from datetime import timedelta

# Create test token
token = create_access_token(
    data={'sub': 1, 'username': 'admin', 'role': 'admin'},
    expires_delta=timedelta(minutes=30)
)

print(f'Token: {token[:50]}...')

# Decode it
payload = decode_access_token(token)
print(f'Payload: {payload}')
print(f'User ID (sub): {payload.get(\"sub\")}')
"
```

**Expected:**
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...
Payload: {'sub': 1, 'username': 'admin', 'role': 'admin', 'exp': 1705329600}
User ID (sub): 1
```

If `sub` is not an integer or is `None`, token validation will fail.

---

## 🎯 Common Scenarios

### Scenario 1: Fresh Install

**Problem:** Just installed, getting 401

**Checklist:**
- [ ] Admin user created (`python create_admin.py`)
- [ ] Email verified or verification disabled
- [ ] Backend running on port 8000
- [ ] Frontend `.env.local` has correct API URL

### Scenario 2: Was Working, Now Broken

**Problem:** Login worked before, now getting 401

**Possible causes:**
1. **SECRET_KEY changed** → All old tokens invalid
2. **Database reset** → Admin user might be gone or have different ID
3. **Email verification enabled** → New requirement blocking access

**Fix:**
```bash
# Delete old token from browser
# In browser console:
localStorage.removeItem('token')

# Then try logging in again
```

### Scenario 3: Works in curl, Not in Browser

**Problem:** `/auth/me` works with curl but fails in browser

**Cause:** CORS issue

**Fix:**

Check `backend/app/main.py`:
```python
allow_origins=["*"]  # Allow all origins (for testing)
# OR
allow_origins=["http://localhost:3000"]  # Specific frontend URL
```

Must have:
```python
allow_credentials=True
```

---

## 📊 Troubleshooting Flowchart

```
Login succeeds → Get token → Try /auth/me → 401 Error

↓ Check backend logs

Email verification error (403)?
├─ Yes → Verify email OR disable email verification
└─ No → Continue

Token decode error?
├─ Yes → Check SECRET_KEY and ALGORITHM
└─ No → Continue

User not found?
├─ Yes → Check user_id in token matches database
└─ No → Continue

User inactive?
├─ Yes → Set is_active = True
└─ No → Continue

Still failing?
→ Run test_auth.py diagnostic script
→ Check CORS settings
→ Verify token format in network tab
```

---

## 🆘 Dashboard Timeout Issue

You also saw:
```
[DASHBOARD] Error fetching dashboard data: timeout of 10000ms exceeded
```

**Causes:**
1. Backend slow or hanging
2. Database query too slow
3. Backend not responding

**Fix:**

```bash
# Check backend is running
curl http://localhost:8000/health

# Expected:
# {"status": "ok", ...}
```

If backend hangs, check:
1. Database connection - PostgreSQL running?
2. Backend logs for errors
3. Any infinite loops in dashboard endpoint

**Temporary fix - increase timeout:**

`frontend/src/services/api.ts` (or wherever axios is configured):
```typescript
axios.defaults.timeout = 30000; // 30 seconds instead of 10
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Run `python test_auth.py` - all tests pass
- [ ] Can login at http://localhost:3000/login
- [ ] Browser console shows:
  ```
  [AUTH] 1. Starting login process...
  [AUTH] 2. Login successful, received token
  [AUTH] 3. Fetching user info...
  [AUTH] User info received: {user_id: 1, username: "admin", ...}
  [AUTH] 4. Redirecting to dashboard...
  ```
- [ ] Dashboard loads without errors
- [ ] Network tab shows both requests with 200 OK:
  - POST `/api/v1/auth/login-json` → 200
  - GET `/api/v1/auth/me` → 200

---

## 📝 Summary

**Most likely cause:** Email verification is enabled but admin email is not verified.

**Quick fix:**
```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.username == 'admin').first()
admin.is_email_verified = True
db.commit()
print('✅ Fixed!')
db.close()
"
```

**OR disable email verification in `backend/app/config.py`:**
```python
ENABLE_EMAIL_VERIFICATION = False
```

Then restart backend and try logging in again!

---

**Need more help?** Run `python test_auth.py` and share the output.
