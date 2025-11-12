# Database Setup Issue - Action Required

## Current Situation

I've created all the necessary scripts to initialize your test data, but there's a **database authentication issue** preventing the scripts from connecting to PostgreSQL.

### Error Message
```
psycopg2.OperationalError: connection to server at "localhost" (::1), port 5432 failed:
FATAL:  password authentication failed for user "postgres"
```

### What This Means

The password in your `.env` file (`postgres`) is not the correct password for the PostgreSQL `postgres` user on your system. However, your FastAPI backend server CAN connect successfully when it runs, which means:

1. **Either**: There's a different password set somewhere else that the backend is using
2. **Or**: The backend is using different credentials entirely

## What Needs to Be Done

### Option 1: Fix the Database Password (Recommended)

You need to find the correct PostgreSQL password. Here's how:

1. **Check Windows Environment Variables**:
   - Open Windows Settings → System → About → Advanced system settings
   - Click "Environment Variables"
   - Look for any PostgreSQL-related variables (DATABASE_URL, POSTGRES_PASSWORD, etc.)

2. **Check PostgreSQL Configuration**:
   - Open: `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
   - Look for authentication settings for localhost

3. **Reset PostgreSQL Password** (if needed):
   ```cmd
   # Open Command Prompt as Administrator
   "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres
   # Then in psql:
   ALTER USER postgres WITH PASSWORD 'postgres';
   \q
   ```

4. **Update `.env` File**:
   - Once you know the correct password, update `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:CORRECT_PASSWORD@localhost:5432/rostracore_db
   ```

### Option 2: Use the Manual SQL Approach

If you can access PostgreSQL directly (using pgAdmin or psql), you can run the SQL scripts manually:

#### Step 1: Create Test Users

Run this SQL in psql or pgAdmin:

```sql
-- Create Superadmin
INSERT INTO users (
    username, email, hashed_password, full_name, role,
    org_id, is_active, is_email_verified, is_phone_verified,
    failed_login_attempts, created_at
)
VALUES (
    'superadmin',
    'superadmin@rostracore.co.za',
    '$2b$12$As2zXj.FfkcAwmELdGHZeOQA4q2qeySuyqrTTmwUBlAhaSMz.p4Oa',  -- SuperAdmin123!
    'Super Administrator',
    'superadmin',
    NULL,
    TRUE,
    TRUE,
    FALSE,
    0,
    NOW()
)
ON CONFLICT (username) DO UPDATE
SET hashed_password = EXCLUDED.hashed_password,
    is_email_verified = TRUE,
    is_active = TRUE;

-- Create Test Organization
WITH superadmin_user AS (
    SELECT user_id FROM users WHERE username = 'superadmin'
)
INSERT INTO organizations (
    org_code, company_name, psira_company_registration,
    subscription_tier, subscription_status, approval_status,
    approved_by, approved_at, billing_email,
    max_employees, max_sites, max_shifts_per_month,
    active_guard_count, monthly_rate_per_guard, current_month_cost,
    is_active
)
SELECT
    'TEST_SECURITY',
    'Test Security Company (Pty) Ltd',
    'PSR-TEST-12345',
    'starter',
    'trial',
    'approved',
    user_id,
    NOW(),
    'billing@testsecurity.co.za',
    30,
    5,
    500,
    0,
    45.00,
    0.00,
    TRUE
FROM superadmin_user
ON CONFLICT (org_code) DO UPDATE
SET approval_status = 'approved',
    subscription_status = 'trial',
    is_active = TRUE;

-- Create Organization Admin
WITH test_org AS (
    SELECT org_id FROM organizations WHERE org_code = 'TEST_SECURITY'
)
INSERT INTO users (
    username, email, hashed_password, full_name, role,
    org_id, is_active, is_email_verified, is_phone_verified,
    failed_login_attempts, created_at
)
SELECT
    'testadmin',
    'admin@testsecurity.co.za',
    '$2b$12$d27M9xa1Wpm9LmraU.jbL.z9Ej3vJJiJL3g5XVVm7sZ3YNN4bEXN6',  -- TestAdmin123!
    'Test Admin',
    'company_admin',
    org_id,
    TRUE,
    TRUE,
    FALSE,
    0,
    NOW()
FROM test_org
ON CONFLICT (username) DO UPDATE
SET hashed_password = EXCLUDED.hashed_password,
    org_id = (SELECT org_id FROM organizations WHERE org_code = 'TEST_SECURITY'),
    is_email_verified = TRUE,
    is_active = TRUE;
```

#### Step 2: Create Sample Data

Run the SQL script: `backend/scripts/sample_data.sql`

```cmd
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d rostracore_db -f "backend/scripts/sample_data.sql"
```

## Login Credentials (Once Setup is Complete)

### Superadmin Account
```
Username: superadmin
Password: SuperAdmin123!
Role:     SUPERADMIN
Purpose:  Approve organizations, system management
```

### Organization Admin Account
```
Username: testadmin
Password: TestAdmin123!
Role:     COMPANY_ADMIN
Purpose:  Manage organization, employees, rosters
```

## Files Created for You

I've created the following scripts that will work once the database connection issue is resolved:

1. **`backend/init_test_data.py`** - Complete initialization script that creates:
   - Superadmin user
   - Test organization
   - Organization admin user
   - 2 clients (Sandton City, Menlyn Park)
   - 6 sites (3 per client)
   - 40 security guards (20 per client)

2. **`backend/scripts/create_test_users.py`** - Creates just the test users

3. **`backend/scripts/create_sample_data.py`** - Creates sample data (clients, sites, guards)

4. **`backend/scripts/sample_data.sql`** - SQL script for sample data creation

5. **`backend/TEST_CREDENTIALS.md`** - Complete reference guide

## How to Run Once Fixed

Option A - Run the complete initialization script:
```cmd
cd backend
python init_test_data.py
```

Option B - Run individual scripts:
```cmd
cd backend
python -m scripts.create_test_users
python -m scripts.create_sample_data
```

Option C - Use SQL directly:
```cmd
cd backend
psql -U postgres -d rostracore_db -f scripts/sample_data.sql
```

## Next Steps

1. **Fix the database password issue** using Option 1 above
2. **Run `init_test_data.py`** to create all test data
3. **Test the login** at http://localhost:8000/docs
4. **Try the roster generation** with the sample data

## Need Help?

If you continue to have issues:
1. Check if PostgreSQL service is running: `sc query postgresql-x64-14`
2. Try connecting with pgAdmin to verify credentials
3. Check PostgreSQL logs: `C:\Program Files\PostgreSQL\14\data\log\`

---

**Note**: The backend server CAN connect to the database (otherwise it wouldn't start), so the issue is specifically with the credentials in the `.env` file not matching what's configured in PostgreSQL.
