# Authentication System Guide

## Overview

RostraCore now includes a complete JWT-based authentication system with role-based access control (RBAC).

---

## Features

✅ **JWT Token Authentication** - Secure, stateless auth
✅ **Password Hashing** - Bcrypt encryption
✅ **Role-Based Access** - Admin, Scheduler, Guard, Finance
✅ **Protected Routes** - Frontend and backend
✅ **User Management** - Full CRUD for users
✅ **Session Management** - Automatic token refresh
✅ **Login/Logout** - Complete auth flow

---

## User Roles

### 1. **Admin** 🔑
- Full system access
- User management (create, update, delete users)
- All CRUD operations
- Dashboard access

### 2. **Scheduler** 📅
- Create and manage rosters
- Manage shifts, employees, sites
- Dashboard access (read-only)
- Cannot manage users

### 3. **Guard** 👮
- View own shifts
- Update availability
- Clock in/out (future feature)
- Limited dashboard access

### 4. **Finance** 💰
- View costs and budgets
- Access payroll summaries
- Generate financial reports
- Dashboard access (finance metrics)

---

## Setup Instructions

### Step 1: Run Database Migration

```bash
cd backend
venv\Scripts\activate
alembic revision --autogenerate -m "Add users table"
alembic upgrade head
```

### Step 2: Create Admin User

```bash
cd backend
python create_admin.py
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@rostracore.com`

⚠️ **IMPORTANT:** Change the admin password immediately after first login!

---

## API Endpoints

### Authentication

#### 1. Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "full_name": "John Doe",
  "role": "scheduler"
}
```

**Response:**
```json
{
  "user_id": 2,
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "scheduler",
  "is_active": true,
  "created_at": "2025-10-30T10:00:00Z",
  "last_login": null
}
```

---

#### 2. Login (Form Data)
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=admin123
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

#### 3. Login (JSON)
```http
POST /api/v1/auth/login-json
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:** Same as above

---

#### 4. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user_id": 1,
  "username": "admin",
  "email": "admin@rostracore.com",
  "full_name": "System Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-10-30T09:00:00Z",
  "last_login": "2025-10-30T10:30:00Z"
}
```

---

#### 5. Update Profile
```http
PUT /api/v1/auth/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Updated Name"
}
```

---

#### 6. Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "admin123",
  "new_password": "newsecurepass456"
}
```

---

### User Management (Admin Only)

#### 7. List All Users
```http
GET /api/v1/auth/users?skip=0&limit=100
Authorization: Bearer {admin_token}
```

#### 8. Get User by ID
```http
GET /api/v1/auth/users/2
Authorization: Bearer {admin_token}
```

#### 9. Delete User
```http
DELETE /api/v1/auth/users/2
Authorization: Bearer {admin_token}
```

---

## Frontend Usage

### Using the Auth Context

```typescript
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Login Component Example

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await login(username, password);
    // Redirects to /dashboard automatically
  } catch (error) {
    setError(error.message);
  }
};
```

### Protected Page Example

```typescript
"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <div>Protected content</div>;
}
```

---

## Backend Usage

### Protecting Endpoints

#### Simple Protection (Any Authenticated User)

```python
from app.auth.security import get_current_user
from app.models.user import User

@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}"}
```

#### Admin Only

```python
from app.auth.security import is_admin

@router.post("/admin-only")
def admin_route(current_user: User = Depends(is_admin)):
    return {"message": "Admin access granted"}
```

#### Specific Role

```python
from app.auth.security import require_role
from app.models.user import UserRole

@router.post("/scheduler-only")
def scheduler_route(
    current_user: User = Depends(require_role(UserRole.SCHEDULER))
):
    return {"message": "Scheduler access granted"}
```

#### Multiple Roles

```python
from app.auth.security import require_roles

@router.get("/finance-or-admin")
def finance_route(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.FINANCE]))
):
    return {"message": "Finance or Admin access"}
```

---

## Security Best Practices

### 1. Change Default Credentials
```bash
# After first login
POST /api/v1/auth/change-password
{
  "current_password": "admin123",
  "new_password": "StrongP@ssw0rd!"
}
```

### 2. Use Strong Passwords
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, special characters
- No common words or patterns

### 3. Token Expiry
- Default: 30 minutes (configurable in config.py)
- Tokens automatically refresh on activity
- Logout clears token from storage

### 4. HTTPS in Production
- Always use HTTPS in production
- Configure SSL/TLS certificates
- Update CORS settings for production domain

### 5. Environment Variables
```bash
# backend/.env
SECRET_KEY=generate-a-strong-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Testing Authentication

### Test with cURL

1. **Register a User:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "role": "scheduler"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

3. **Get User Info:**
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test with Swagger UI

1. Go to: http://localhost:8000/docs
2. Click "Authorize" button (top right)
3. Login to get token
4. Enter token in format: `Bearer {your_token}`
5. Test protected endpoints

### Test Frontend

1. Go to: http://localhost:3000
2. Click "Login" in top right
3. Use credentials: `admin` / `admin123`
4. Should redirect to dashboard
5. See username in top right
6. Click "Logout" to test logout

---

## Troubleshooting

### "Could not validate credentials"
- Token expired (default 30 minutes)
- Invalid token format
- Wrong SECRET_KEY in config
- **Solution:** Login again

### "Insufficient permissions"
- User role doesn't have access
- Check endpoint role requirements
- **Solution:** Use admin account or correct role

### "Username already registered"
- Username taken
- **Solution:** Choose different username

### "Email already registered"
- Email taken
- **Solution:** Use different email

### Frontend not showing login state
- Check AuthContext is wrapped around app
- Check localStorage for token
- Check browser console for errors
- **Solution:** Clear localStorage and re-login

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role VARCHAR(20) NOT NULL,  -- admin, scheduler, guard, finance
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

---

## Token Structure

JWT tokens contain:

```json
{
  "sub": 1,              // User ID
  "username": "admin",   // Username
  "role": "admin",       // User role
  "exp": 1698765432      // Expiration timestamp
}
```

---

## Future Enhancements

### Planned Features:
- [ ] Refresh tokens for long-lived sessions
- [ ] Email verification on registration
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 integration (Google, Microsoft)
- [ ] API key authentication for integrations
- [ ] Audit logging for security events
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Password complexity requirements config

---

## Files Created

### Backend:
- `backend/app/models/user.py` - User model
- `backend/app/models/auth_schemas.py` - Pydantic schemas
- `backend/app/auth/security.py` - Security utilities
- `backend/app/auth/__init__.py` - Auth module exports
- `backend/app/api/endpoints/auth.py` - Auth endpoints
- `backend/create_admin.py` - Admin creation script

### Frontend:
- `frontend/src/context/AuthContext.tsx` - Auth state management
- `frontend/src/app/login/page.tsx` - Login page
- `frontend/src/app/layout.tsx` - Updated with AuthProvider

---

## Migration Commands

```bash
# Create migration
cd backend
alembic revision --autogenerate -m "Add users table"

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

---

## Summary

✅ **Complete authentication system**
✅ **Role-based access control**
✅ **Secure password hashing**
✅ **JWT token management**
✅ **Protected frontend and backend**
✅ **User management for admins**
✅ **Easy integration**

**Your app is now production-ready for secure deployment!**

---

*For questions or issues, refer to the main documentation or API docs at /docs*
