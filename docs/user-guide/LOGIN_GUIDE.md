# RostraCore - Login Guide

## Admin User Credentials

Your admin user has been created successfully! Use these credentials to login:

**Username:** `admin`
**Password:** `admin123`
**Email:** `admin@rostracore.com`

⚠️ **IMPORTANT:** Change the admin password after first login!

---

## How to Login

### Option 1: Using the API Docs (Swagger UI)

1. Open your browser and go to: **http://localhost:8000/docs**
2. Click on **POST /api/v1/auth/login** endpoint
3. Click **"Try it out"**
4. Enter the credentials in the request body:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
5. Click **"Execute"**
6. Copy the `access_token` from the response
7. Click the **"Authorize"** button at the top of the page
8. Paste the token in the format: `Bearer <your_token>`
9. Click **"Authorize"**

Now you can use all protected endpoints!

### Option 2: Using cURL

```bash
# Get access token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Response will include access_token:
# {"access_token": "eyJ...", "token_type": "bearer"}

# Use the token in subsequent requests:
curl -X GET "http://localhost:8000/api/v1/employees" \
  -H "Authorization: Bearer eyJ..."
```

### Option 3: Using Python

```python
import requests

# Login
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"username": "admin", "password": "admin123"}
)

# Get token
token = response.json()["access_token"]

# Use token for authenticated requests
headers = {"Authorization": f"Bearer {token}"}

# Example: Get all employees
employees = requests.get(
    "http://localhost:8000/api/v1/employees",
    headers=headers
)

print(employees.json())
```

### Option 4: Using the Frontend (if available)

1. Open http://localhost:3000 (if frontend is running)
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Login"

---

## Available Endpoints

After logging in, you have access to all endpoints:

### Authentication
- `POST /api/v1/auth/login` - Login (get access token)
- `POST /api/v1/auth/register` - Register new user
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/change-password` - Change password

### Core Entities
- `/api/v1/employees` - Employee management
- `/api/v1/sites` - Site management
- `/api/v1/shifts` - Shift management
- `/api/v1/availability` - Availability management
- `/api/v1/certifications` - Certification management
- `/api/v1/budgets` - Budget management

### Rostering
- `/api/v1/roster/generate` - Auto-generate roster
- `/api/v1/roster/optimize` - Optimize existing roster
- `/api/v1/reports` - Generate reports

---

## User Roles

RostraCore has the following user roles:

- **ADMIN** - Full system access (your current role)
- **MANAGER** - Can manage employees, sites, and rosters
- **SUPERVISOR** - Can view and edit shifts
- **EMPLOYEE** - Basic access, view own shifts and availability

---

## Change Password

To change the admin password after first login:

```bash
curl -X POST "http://localhost:8000/api/v1/auth/change-password" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "admin123",
    "new_password": "your_new_secure_password"
  }'
```

---

## Troubleshooting

### "Invalid credentials" error
- Double-check username and password
- Username is case-sensitive: use lowercase `admin`

### "Could not validate credentials" error
- Your token may have expired (default: 30 minutes)
- Login again to get a new token

### Token expires too quickly
- Update `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env` file
- Default is 30 minutes, you can increase it for development

### Backend not responding
- Check if backend is running: http://localhost:8000/health
- Restart backend:
  ```bash
  cd backend
  python -m uvicorn app.main:app --reload
  ```

---

## Next Steps

1. ✅ Login with admin credentials
2. Create additional users via `/api/v1/auth/register`
3. Add employees, sites, and shifts
4. Generate your first roster!

---

**You're all set!** 🎉

For more information, see:
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup guide
- API Docs: http://localhost:8000/docs
