# RostraCore Test Data Initialization - Summary

## What Was Requested

You asked me to create:
1. **2 Test Users**: Superadmin and Organization Admin with login credentials
2. **Sample Data**: 40 security guards, multiple sites, 2 clients, with guard-client assignments

## What Was Created

### ✅ Scripts and Documentation

I successfully created the following files:

#### 1. **Main Initialization Script**
- **File**: `backend/init_test_data.py`
- **Purpose**: One-command setup for all test data
- **Creates**:
  - Superadmin user (superadmin / SuperAdmin123!)
  - Test organization (TEST_SECURITY)
  - Organization admin (testadmin / TestAdmin123!)
  - 2 clients: Sandton City & Menlyn Park Shopping Centres
  - 6 sites: 3 per client
  - 40 security guards with realistic South African names
  - Proper guard-client assignments (20 per client)

#### 2. **Individual Setup Scripts**
- **`backend/scripts/create_test_users.py`** - Creates users and organization
- **`backend/scripts/create_sample_data.py`** - Creates clients, sites, guards
- **`backend/scripts/sample_data.sql`** - SQL version for manual execution

#### 3. **Documentation**
- **`backend/TEST_CREDENTIALS.md`** - Complete credentials and testing guide
- **`backend/DATABASE_SETUP_ISSUE.md`** - Troubleshooting guide (see below)
- **`backend/INITIALIZATION_SUMMARY.md`** - This file

### ⚠️ Current Blocker: Database Authentication

**Issue**: The scripts cannot connect to PostgreSQL due to password authentication failure.

**Error**: `password authentication failed for user "postgres"`

**Why This Happened**: The password in the `.env` file doesn't match the actual PostgreSQL password on your system.

**Impact**: The test data hasn't been created in the database yet.

## Test User Credentials (For When Setup Completes)

### Superadmin Account
```
URL:      http://localhost:8000/docs
Endpoint: POST /api/v1/auth/login-json

Username: superadmin
Password: SuperAdmin123!

Role:     SUPERADMIN
Purpose:
  - Approve/reject new organizations
  - System-wide management
  - Access superadmin dashboard
```

### Organization Admin Account
```
URL:      http://localhost:8000/docs
Endpoint: POST /api/v1/auth/login-json

Username: testadmin
Password: TestAdmin123!

Role:     COMPANY_ADMIN
Purpose:
  - Manage employees (security guards)
  - Create and manage rosters
  - Invite other users
  - Manage sites and shifts
  - View organization dashboard
```

## Sample Data Structure

Once the scripts run successfully, you'll have:

### Clients (2)
1. **Sandton City Shopping Centre**
   - Contact: John Smith
   - Billing Rate: R85/hour
   - Contract: 2024-01-01 to 2025-12-31
   - Guards Assigned: 20

2. **Menlyn Park Shopping Centre**
   - Contact: Sarah Johnson
   - Billing Rate: R80/hour
   - Contract: 2024-02-01 to 2025-12-31
   - Guards Assigned: 20

### Sites (6)

**Sandton City Sites (3)**:
- SITE001: Main Entrance (requires 4 guards)
- SITE002: Parking Level P1 (requires 3 guards)
- SITE003: Control Room (requires 2 guards)

**Menlyn Park Sites (3)**:
- SITE004: Main Entrance (requires 3 guards)
- SITE005: Parking Area (requires 3 guards)
- SITE006: VIP Section (requires 2 guards)

### Security Guards (40)

**Guard Details**:
- Employee Numbers: GRD0001 to GRD0040
- Realistic South African names
- Valid PSIRA registration numbers
- PSIRA grades (A through E)
- Hourly rates: R45 - R65
- Complete contact information
- Hire dates throughout 2024

**Assignments**:
- GRD0001 - GRD0020 → Sandton City Shopping Centre
- GRD0021 - GRD0040 → Menlyn Park Shopping Centre

## How to Complete Setup

### Quick Fix (If you know the PostgreSQL password)

1. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/rostracore_db
   ```

2. Run initialization:
   ```cmd
   cd backend
   python init_test_data.py
   ```

### Alternative: Manual SQL Execution

If you can access pgAdmin or psql directly:

1. Run the user creation SQL (see DATABASE_SETUP_ISSUE.md)
2. Run `backend/scripts/sample_data.sql`

### For Detailed Instructions

See: **`backend/DATABASE_SETUP_ISSUE.md`**

## Testing After Setup

Once the data is created, you can test:

### 1. Login Test
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{"username": "testadmin", "password": "TestAdmin123!"}'
```

### 2. View Data
```bash
# Get access token from login, then:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/clients"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/sites"

curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/employees"
```

### 3. Generate Roster
```bash
curl -X POST "http://localhost:8000/api/v1/roster/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "start_date": "2025-11-18",
    "end_date": "2025-11-24"
  }'
```

## Password Hashes (For Manual SQL Insertion)

If you need to create the users manually via SQL:

- **SuperAdmin123!** → `$2b$12$As2zXj.FfkcAwmELdGHZeOQA4q2qeySuyqrTTmwUBlAhaSMz.p4Oa`
- **TestAdmin123!** → `$2b$12$d27M9xa1Wpm9LmraU.jbL.z9Ej3vJJiJL3g5XVVm7sZ3YNN4bEXN6`

## Files Ready for Execution

All files are in place and ready to run once the database connection issue is resolved:

```
backend/
├── init_test_data.py                 ← Run this! (Complete setup)
├── TEST_CREDENTIALS.md                ← Reference guide
├── DATABASE_SETUP_ISSUE.md            ← Troubleshooting
├── INITIALIZATION_SUMMARY.md          ← This file
└── scripts/
    ├── create_test_users.py           ← Users only
    ├── create_sample_data.py          ← Sample data only
    ├── sample_data.sql                ← SQL alternative
    └── direct_db_test.py              ← Direct psycopg2 test
```

## Next Steps

1. **Resolve the database authentication issue** (see DATABASE_SETUP_ISSUE.md)
2. **Run**: `python init_test_data.py`
3. **Login** with either test account
4. **Test** roster generation with the sample data
5. **Start building** your MVP features!

---

**Status**: ⏳ Ready to execute pending database connection fix

**Last Updated**: 2025-11-11
