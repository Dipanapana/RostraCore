# 🛠️ Complete Debugging & Testing Guide for RostraCore
## For Absolute Beginners - Step-by-Step Instructions

**Last Updated:** 2025-11-13
**Purpose:** Manual debugging and testing without AI assistance
**Skill Level:** Beginner-friendly (no prior knowledge assumed)

---

## 📋 Table of Contents

1. [Understanding Your Project Structure](#1-understanding-your-project-structure)
2. [Essential Tools You Need](#2-essential-tools-you-need)
3. [Accessing Your Database](#3-accessing-your-database)
4. [Running Database Migrations](#4-running-database-migrations)
5. [Running SQL Queries](#5-running-sql-queries)
6. [Testing Roster Generation](#6-testing-roster-generation)
7. [Running Python Tests](#7-running-python-tests)
8. [Checking Logs](#8-checking-logs)
9. [Common Errors and Solutions](#9-common-errors-and-solutions)
10. [Debugging Checklist](#10-debugging-checklist)

---

## 1. Understanding Your Project Structure

### Your Project Layout:
```
RostraCore/
├── backend/              # Python/FastAPI backend
│   ├── app/
│   │   ├── algorithms/   # Roster generation algorithms
│   │   ├── api/          # API endpoints
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   └── main.py       # Application entry point
│   ├── migrations/       # Database migration files
│   ├── tests/            # Python tests
│   └── requirements.txt  # Python dependencies
│
├── frontend/             # Next.js/React frontend
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # React components
│   │   └── services/     # API calls
│   └── package.json      # Node dependencies
│
└── DEBUGGING_GUIDE.md    # This file!
```

---

## 2. Essential Tools You Need

### A. Terminal/Command Line

**Windows Users:**
- Open **Windows Terminal** or **Command Prompt**
- Or use **WSL (Windows Subsystem for Linux)** - recommended

**To open terminal in your project:**
1. Navigate to `C:\Users\USER\Documents\Master Plan\RostraCore`
2. Right-click in the folder → "Open in Terminal"

**Mac/Linux Users:**
- Open **Terminal** application
- Navigate to your project: `cd /path/to/RostraCore`

### B. Check if Tools are Installed

```bash
# Check Python version (should be 3.10+)
python --version
# or try:
python3 --version

# Check Node.js (should be 18+)
node --version

# Check PostgreSQL (should be 12+)
psql --version

# Check if PostgreSQL is running (Windows)
sc query postgresql-x64-14

# Check if PostgreSQL is running (Mac/Linux)
sudo systemctl status postgresql
```

**If any tool is missing, see the installation section at the end.**

---

## 3. Accessing Your Database

### Your Database Credentials

Based on your project, your database details are:
- **Database Name:** `rostracore_db` or `rostracore`
- **Username:** `rostracore_user` or `postgres`
- **Password:** `password` or your PostgreSQL password
- **Host:** `localhost`
- **Port:** `5432` (default)

### Method 1: Using Command Line (psql)

**Step 1: Open Command Line**
```bash
# Windows (use the full path)
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d rostracore_db

# Mac/Linux
psql -U postgres -d rostracore_db
```

**Step 2: Enter your password when prompted**

**Step 3: You should see:**
```
psql (14.x)
Type "help" for help.

rostracore_db=#
```

**Step 4: Basic commands to try:**
```sql
-- List all tables
\dt

-- Describe a specific table
\d employees

-- Quit psql
\q
```

### Method 2: Using pgAdmin (GUI - Easier for Beginners)

**Step 1: Open pgAdmin 4** (should be installed with PostgreSQL)

**Step 2: Connect to your server**
- Click "Servers" in the left panel
- Right-click "PostgreSQL 14" → "Connect"
- Enter your password

**Step 3: Navigate to your database**
- Servers → PostgreSQL 14 → Databases → rostracore_db

**Step 4: Open Query Tool**
- Right-click on `rostracore_db` → "Query Tool"
- Now you can type SQL queries and click "Execute" (⚡ icon)

### Method 3: Using DBeaver (Alternative GUI)

**Download:** https://dbeaver.io/download/

**Setup:**
1. Open DBeaver
2. Click "New Database Connection"
3. Select "PostgreSQL"
4. Enter connection details:
   - Host: `localhost`
   - Port: `5432`
   - Database: `rostracore_db`
   - Username: `postgres`
   - Password: your password
5. Click "Test Connection" → Should say "Connected"
6. Click "Finish"

---

## 4. Running Database Migrations

### What are Migrations?

Migrations are scripts that update your database structure (add tables, columns, etc.) without losing data.

### Check Current Migration Status

**Step 1: Open terminal in the backend directory**
```bash
cd backend
```

**Step 2: Check which migrations have been applied**
```bash
# On Windows
python -m alembic current

# On Mac/Linux
alembic current
```

**What you'll see:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
abc123def456 (head)  # This is your current migration
```

### View Migration History

```bash
# See all available migrations
alembic history

# See migrations in detail
alembic history --verbose
```

### Apply Pending Migrations

**Step 1: Make sure PostgreSQL is running**

**Step 2: Apply all pending migrations**
```bash
alembic upgrade head
```

**What you'll see:**
```
INFO  [alembic.runtime.migration] Running upgrade -> abc123, add site_name field
INFO  [alembic.runtime.migration] Running upgrade abc123 -> def456, add roster tables
```

**If successful:** Your database is now up to date! ✅

### Create a New Migration (If you changed a model)

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of change"

# Example:
alembic revision --autogenerate -m "add new field to employee table"
```

### Downgrade (Undo) a Migration

```bash
# Go back one migration
alembic downgrade -1

# Go back to a specific migration
alembic downgrade abc123

# Go back to the beginning (DANGEROUS - will delete all tables)
alembic downgrade base
```

### Common Migration Errors

**Error: "Can't locate revision identified by 'xyz'"**
- Solution: Check your migration files in `backend/migrations/versions/`
- Make sure all migration files are present

**Error: "Target database is not up to date"**
- Solution: Run `alembic stamp head` to mark current state
- Then run `alembic upgrade head`

**Error: "Cannot connect to database"**
- Solution: Make sure PostgreSQL is running
- Check your DATABASE_URL in `.env` file

---

## 5. Running SQL Queries

### Essential Queries for Debugging

Copy and paste these queries into pgAdmin, DBeaver, or psql.

#### A. Check Employees

```sql
-- See all employees
SELECT employee_id, first_name, last_name, role, status, email
FROM employees
ORDER BY employee_id;

-- See only active employees
SELECT employee_id, first_name, last_name, role
FROM employees
WHERE status = 'active';

-- Count active vs inactive employees
SELECT
    status,
    COUNT(*) as count
FROM employees
GROUP BY status;
```

#### B. Check Certifications

```sql
-- See all certifications
SELECT
    c.cert_id,
    c.employee_id,
    e.first_name,
    e.last_name,
    c.cert_type,
    c.expiry_date,
    c.verified,
    CASE
        WHEN c.expiry_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN c.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING SOON'
        ELSE 'VALID'
    END as status
FROM certifications c
JOIN employees e ON c.employee_id = e.employee_id
ORDER BY c.expiry_date;

-- Find employees without certifications
SELECT
    e.employee_id,
    e.first_name,
    e.last_name,
    e.status
FROM employees e
LEFT JOIN certifications c ON e.employee_id = c.employee_id
WHERE c.cert_id IS NULL
    AND e.status = 'active';
```

#### C. Check Skills

```sql
-- See all employee skills
SELECT
    e.employee_id,
    e.first_name,
    e.last_name,
    e.role,
    s.skill_name,
    s.proficiency_level,
    s.certified
FROM employees e
LEFT JOIN skills_matrix s ON e.employee_id = s.employee_id
WHERE e.status = 'active'
ORDER BY e.employee_id;

-- Find employees without skills
SELECT
    e.employee_id,
    e.first_name,
    e.last_name,
    e.role
FROM employees e
LEFT JOIN skills_matrix s ON e.employee_id = s.employee_id
WHERE s.skill_id IS NULL
    AND e.status = 'active';
```

#### D. Check Shifts

```sql
-- See all shifts
SELECT
    s.shift_id,
    s.site_id,
    st.site_name,
    st.client_name,
    s.start_time,
    s.end_time,
    s.required_skill,
    s.assigned_employee_id,
    CASE
        WHEN s.assigned_employee_id IS NOT NULL
        THEN e.first_name || ' ' || e.last_name
        ELSE 'UNASSIGNED'
    END as employee_name,
    s.status
FROM shifts s
JOIN sites st ON s.site_id = st.site_id
LEFT JOIN employees e ON s.assigned_employee_id = e.employee_id
ORDER BY s.start_time DESC
LIMIT 20;

-- Count assigned vs unassigned shifts
SELECT
    CASE
        WHEN assigned_employee_id IS NULL THEN 'Unassigned'
        ELSE 'Assigned'
    END as assignment_status,
    COUNT(*) as count
FROM shifts
GROUP BY assignment_status;

-- Find shifts without assignments (for roster generation)
SELECT
    shift_id,
    site_id,
    start_time,
    end_time,
    required_skill
FROM shifts
WHERE assigned_employee_id IS NULL
    AND start_time >= CURRENT_DATE
ORDER BY start_time
LIMIT 10;
```

#### E. Check Shift Assignments (New System)

```sql
-- See all shift assignments
SELECT
    sa.assignment_id,
    sa.shift_id,
    sa.employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    sa.roster_id,
    sa.total_hours,
    sa.total_cost,
    sa.is_confirmed,
    sa.attendance_status
FROM shift_assignments sa
JOIN employees e ON sa.employee_id = e.employee_id
ORDER BY sa.assignment_id DESC
LIMIT 20;

-- Check dual tracking sync (IMPORTANT!)
-- This should return 0 rows if everything is synced
SELECT
    s.shift_id,
    s.assigned_employee_id as shift_employee_id,
    sa.employee_id as assignment_employee_id
FROM shifts s
LEFT JOIN shift_assignments sa ON s.shift_id = sa.shift_id
WHERE s.assigned_employee_id IS NOT NULL
    AND (sa.employee_id IS NULL
         OR s.assigned_employee_id != sa.employee_id);
```

#### F. Check Sites

```sql
-- See all sites
SELECT
    site_id,
    site_name,
    client_name,
    address,
    required_skill,
    min_staff,
    gps_lat,
    gps_lng
FROM sites
ORDER BY site_id;

-- Find sites without GPS coordinates
SELECT
    site_id,
    site_name,
    client_name,
    address
FROM sites
WHERE gps_lat IS NULL OR gps_lng IS NULL;
```

#### G. Check Availability

```sql
-- See employee availability
SELECT
    a.avail_id,
    a.employee_id,
    e.first_name,
    e.last_name,
    a.date,
    a.start_time,
    a.end_time,
    a.available
FROM availability a
JOIN employees e ON a.employee_id = e.employee_id
WHERE a.date >= CURRENT_DATE
ORDER BY a.date, a.employee_id;

-- Find employees without availability records
SELECT
    e.employee_id,
    e.first_name,
    e.last_name
FROM employees e
LEFT JOIN availability a ON e.employee_id = a.employee_id
WHERE a.avail_id IS NULL
    AND e.status = 'active';
```

### How to Run These Queries

**In pgAdmin:**
1. Open Query Tool (Tools → Query Tool)
2. Copy and paste the query
3. Click the "Execute" button (⚡ icon) or press F5
4. Results appear in the bottom panel

**In psql (command line):**
1. Connect to database
2. Copy and paste the query
3. Press Enter
4. Results appear immediately

**In DBeaver:**
1. Right-click database → SQL Editor → New SQL Script
2. Copy and paste the query
3. Click "Execute" or press Ctrl+Enter
4. Results appear in the bottom panel

---

## 6. Testing Roster Generation

### Test the Backend API Directly

#### Step 1: Start the Backend Server

**Open Terminal 1 (Backend):**
```bash
cd backend

# Activate virtual environment (if you have one)
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**What you should see:**
```
INFO:     Will watch for changes in these directories: ['C:\\...\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

✅ **Backend is running!**

Leave this terminal open and running.

#### Step 2: Test the API

**Option A: Using a Web Browser**

Open your browser and go to:
```
http://localhost:8000/docs
```

You'll see **Swagger UI** - an interactive API documentation.

**To test roster generation:**
1. Find the endpoint: `POST /api/v1/jobs/roster/generate`
2. Click "Try it out"
3. Fill in the request body:
```json
{
  "start_date": "2025-11-15",
  "end_date": "2025-11-22",
  "site_ids": null,
  "algorithm": "production",
  "budget_limit": null,
  "user_id": 1,
  "org_id": 1
}
```
4. Click "Execute"
5. Check the response below

**Option B: Using curl (Command Line)**

Open a NEW terminal (Terminal 2) and run:
```bash
curl -X POST "http://localhost:8000/api/v1/jobs/roster/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-15",
    "end_date": "2025-11-22",
    "site_ids": null,
    "algorithm": "production",
    "budget_limit": null,
    "user_id": 1,
    "org_id": 1
  }'
```

**Option C: Using Postman**

1. Download Postman: https://www.postman.com/downloads/
2. Create new request
3. Set method to `POST`
4. URL: `http://localhost:8000/api/v1/jobs/roster/generate`
5. Go to "Body" tab → Select "raw" → Select "JSON"
6. Paste the JSON from Option A
7. Click "Send"

#### Step 3: Understanding the Response

**Success Response (assignments generated):**
```json
{
  "job_id": "abc-123-def",
  "status": "SUCCESS",
  "assignments": [
    {
      "shift_id": 1,
      "employee_id": 5,
      "employee_name": "John Doe",
      "site_id": 2,
      "start_time": "2025-11-15T08:00:00",
      "end_time": "2025-11-15T16:00:00",
      "cost": 640.50
    },
    // ... more assignments
  ],
  "summary": {
    "total_cost": 15000.00,
    "total_shifts_filled": 20,
    "fill_rate": 95.5,
    "employees_utilized": 8
  },
  "unfilled_shifts": []
}
```

✅ **Roster generation is working!**

**Failure Response (no assignments):**
```json
{
  "job_id": "abc-123-def",
  "status": "FAILURE",
  "assignments": [],
  "summary": {
    "total_cost": 0,
    "total_shifts_filled": 0,
    "fill_rate": 0,
    "employees_utilized": 0
  },
  "unfilled_shifts": [
    {
      "shift_id": 1,
      "site_id": 2,
      "start_time": "2025-11-15T08:00:00"
    }
  ],
  "error": "No feasible assignments could be generated"
}
```

❌ **Roster generation failed - see debugging section below**

### Check Backend Logs

While the backend is running (Terminal 1), watch for log messages:

**Good logs:**
```
INFO: Roster generation requested: 2025-11-15 to 2025-11-22, algorithm=production
INFO: Using Production CP-SAT Optimizer
INFO: Found 50 shifts to assign
INFO: Found 15 active employees
INFO: Generating feasible pairs...
INFO: Found 250 feasible pairs
INFO: Running optimization...
INFO: Roster generation complete: SUCCESS, 45 assignments
```

**Bad logs (indicates problem):**
```
INFO: Found 50 shifts to assign
INFO: Found 15 active employees
INFO: Generating feasible pairs...
INFO: Found 0 feasible pairs  ← PROBLEM!
ERROR: No feasible assignments could be generated
```

### Debug: Why No Feasible Pairs?

If you see "Found 0 feasible pairs", check:

1. **Do you have active employees?**
```sql
SELECT COUNT(*) FROM employees WHERE status = 'active';
```
Expected: At least 1

2. **Do employees have valid certifications?**
```sql
SELECT COUNT(*)
FROM certifications
WHERE expiry_date > CURRENT_DATE
    AND verified = true;
```
Expected: At least 1 per active employee (unless SKIP_CERTIFICATION_CHECK=True)

3. **Do employees have skills?**
```sql
SELECT e.employee_id, e.role, s.skill_name
FROM employees e
LEFT JOIN skills_matrix s ON e.employee_id = s.employee_id
WHERE e.status = 'active';
```
Expected: Each employee should have their role listed at minimum

4. **Do you have unassigned shifts?**
```sql
SELECT COUNT(*)
FROM shifts
WHERE assigned_employee_id IS NULL
    AND start_time >= CURRENT_DATE;
```
Expected: At least 1

5. **Check configuration settings:**

Open: `backend/app/config.py`

Look for:
```python
TESTING_MODE = True  # Should be True for testing
SKIP_CERTIFICATION_CHECK = True  # Should be True for testing
SKIP_AVAILABILITY_CHECK = True  # Should be True for testing
```

If these are `False`, roster generation will be very strict.

---

## 7. Running Python Tests

### Run All Tests

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

### Run Specific Test Files

```bash
# Test roster generation only
pytest tests/test_roster_generation.py

# Test constraints only
pytest tests/test_constraints.py

# Test a specific test function
pytest tests/test_roster_generation.py::test_generate_roster_success
```

### Run Tests with Output

```bash
# Show print statements
pytest -s

# Show detailed output
pytest -vv

# Stop on first failure
pytest -x
```

### Check Test Coverage

```bash
# Generate coverage report
pytest --cov=app --cov-report=term-missing

# Generate HTML coverage report
pytest --cov=app --cov-report=html

# Open the report
# Windows:
start htmlcov/index.html
# Mac:
open htmlcov/index.html
# Linux:
xdg-open htmlcov/index.html
```

### Create a Simple Test

Create `backend/test_roster_debug.py`:

```python
"""Simple test to debug roster generation."""

def test_database_connection():
    """Test database connection."""
    from app.database import SessionLocal
    from app.models.employee import Employee

    db = SessionLocal()
    try:
        employees = db.query(Employee).all()
        print(f"\nFound {len(employees)} employees")
        assert len(employees) > 0, "No employees found!"
        print("✅ Database connection works!")
    finally:
        db.close()

def test_active_employees():
    """Test that we have active employees."""
    from app.database import SessionLocal
    from app.models.employee import Employee, EmployeeStatus

    db = SessionLocal()
    try:
        active = db.query(Employee).filter(
            Employee.status == EmployeeStatus.ACTIVE
        ).all()
        print(f"\nFound {len(active)} active employees")
        for emp in active:
            print(f"  - {emp.first_name} {emp.last_name} ({emp.role})")
        assert len(active) > 0, "No active employees!"
        print("✅ Active employees exist!")
    finally:
        db.close()

def test_certifications():
    """Test employee certifications."""
    from app.database import SessionLocal
    from app.models.certification import Certification
    from datetime import date

    db = SessionLocal()
    try:
        valid_certs = db.query(Certification).filter(
            Certification.expiry_date > date.today()
        ).all()
        print(f"\nFound {len(valid_certs)} valid certifications")
        for cert in valid_certs[:5]:  # Show first 5
            print(f"  - Employee {cert.employee_id}: {cert.cert_type}")
        if len(valid_certs) == 0:
            print("⚠️ WARNING: No valid certifications!")
            print("   Set SKIP_CERTIFICATION_CHECK=True in config.py")
        else:
            print("✅ Valid certifications exist!")
    finally:
        db.close()

if __name__ == "__main__":
    # Run tests manually
    test_database_connection()
    test_active_employees()
    test_certifications()
    print("\n✅ All basic tests passed!")
```

**Run it:**
```bash
cd backend
python test_roster_debug.py
```

---

## 8. Checking Logs

### Backend Logs (Python/FastAPI)

**While backend is running:**
- Logs appear in Terminal 1 (where you ran `uvicorn`)
- Watch for ERROR, WARNING messages

**Save logs to a file:**
```bash
# Run backend with logging
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1
```

**View the log file:**
```bash
# Windows
type backend.log

# Mac/Linux
cat backend.log

# View last 50 lines
tail -50 backend.log

# Follow logs in real-time
tail -f backend.log
```

### Frontend Logs (Next.js)

**Browser Console:**
1. Open your browser (Chrome, Edge, Firefox)
2. Press `F12` to open Developer Tools
3. Go to "Console" tab
4. Watch for errors (red messages)

**Next.js Terminal Logs:**
- If running `npm run dev`, logs appear in that terminal
- Look for compilation errors, warnings

### PostgreSQL Logs

**Windows:**
- Location: `C:\Program Files\PostgreSQL\14\data\log\`
- Files named like: `postgresql-2025-11-13.log`

**Mac:**
- Location: `/usr/local/var/postgres/server.log`

**Linux:**
- Location: `/var/log/postgresql/postgresql-14-main.log`

**View PostgreSQL logs:**
```bash
# Windows (adjust date)
type "C:\Program Files\PostgreSQL\14\data\log\postgresql-2025-11-13.log"

# Mac
tail -f /usr/local/var/postgres/server.log

# Linux
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 9. Common Errors and Solutions

### Error: "No module named 'app'"

**Problem:** Python can't find your app module

**Solution:**
```bash
# Make sure you're in the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set PYTHONPATH (Windows)
set PYTHONPATH=%CD%

# Set PYTHONPATH (Mac/Linux)
export PYTHONPATH=$(pwd)
```

### Error: "could not connect to server: Connection refused"

**Problem:** PostgreSQL is not running

**Solution:**

**Windows:**
```bash
# Check status
sc query postgresql-x64-14

# Start service
net start postgresql-x64-14
```

**Mac:**
```bash
# Start PostgreSQL
brew services start postgresql@14

# Or manually
pg_ctl -D /usr/local/var/postgres start
```

**Linux:**
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql
```

### Error: "FATAL: password authentication failed"

**Problem:** Wrong database password

**Solution:**

1. Check your `.env` file in `backend/` directory
2. Update `DATABASE_URL`:
```
DATABASE_URL=postgresql://postgres:YOUR_CORRECT_PASSWORD@localhost:5432/rostracore_db
```

3. Reset PostgreSQL password if needed:
```bash
# Windows (as admin)
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
\q

# Mac/Linux
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

### Error: "relation 'employees' does not exist"

**Problem:** Database tables not created

**Solution:**
```bash
cd backend

# Run migrations
alembic upgrade head

# If that fails, initialize alembic
alembic init migrations

# Then generate migrations from models
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

### Error: "Port 8000 is already in use"

**Problem:** Backend is already running somewhere

**Solution:**

**Windows:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (use PID from above)
taskkill /PID <PID> /F

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

**Mac/Linux:**
```bash
# Find process
lsof -i :8000

# Kill process (use PID from above)
kill -9 <PID>

# Or use different port
uvicorn app.main:app --reload --port 8001
```

### Error: "No feasible pairs generated" (Roster)

**Problem:** Roster constraints too strict or missing data

**Solution:**

1. **Enable testing mode** in `backend/app/config.py`:
```python
TESTING_MODE = True
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True
```

2. **Check you have data:**
```sql
-- Need active employees
SELECT COUNT(*) FROM employees WHERE status = 'active';

-- Need unassigned shifts
SELECT COUNT(*) FROM shifts WHERE assigned_employee_id IS NULL;
```

3. **Add test data if needed:**
```sql
-- Add a test employee
INSERT INTO employees (first_name, last_name, id_number, role, hourly_rate, status, email)
VALUES ('Test', 'Employee', '1234567890', 'unarmed', 50.00, 'active', 'test@example.com');

-- Add a test certification (use employee_id from above)
INSERT INTO certifications (employee_id, cert_type, issue_date, expiry_date, verified)
VALUES (1, 'PSIRA', '2024-01-01', '2026-12-31', true);
```

### Error: "ModuleNotFoundError: No module named 'X'"

**Problem:** Missing Python package

**Solution:**
```bash
cd backend

# Install missing package
pip install <package-name>

# Or reinstall all dependencies
pip install -r requirements.txt

# Update requirements.txt if you added a new package
pip freeze > requirements.txt
```

---

## 10. Debugging Checklist

Use this checklist to systematically debug roster generation issues.

### ✅ Pre-Flight Checks

```bash
# 1. Is PostgreSQL running?
psql -U postgres -d rostracore_db -c "SELECT 1"
# Expected: Returns "1"

# 2. Is backend running?
curl http://localhost:8000/docs
# Expected: Returns HTML page

# 3. Are migrations up to date?
cd backend && alembic current
# Expected: Shows current migration ID with "(head)"
```

### ✅ Data Checks (Run in SQL)

```sql
-- 1. Active Employees Check
SELECT 'Active Employees' as check_name, COUNT(*) as count
FROM employees WHERE status = 'active';
-- Expected: count > 0

-- 2. Valid Certifications Check
SELECT 'Valid Certifications' as check_name, COUNT(*) as count
FROM certifications WHERE expiry_date > CURRENT_DATE AND verified = true;
-- Expected: count > 0 (or SKIP_CERTIFICATION_CHECK=True)

-- 3. Employee Skills Check
SELECT 'Employee Skills' as check_name, COUNT(*) as count
FROM skills_matrix;
-- Expected: count > 0

-- 4. Unassigned Shifts Check
SELECT 'Unassigned Shifts' as check_name, COUNT(*) as count
FROM shifts
WHERE assigned_employee_id IS NULL
    AND start_time >= CURRENT_DATE;
-- Expected: count > 0

-- 5. Sites with GPS Check
SELECT 'Sites with GPS' as check_name, COUNT(*) as count
FROM sites WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL;
-- Expected: count > 0 (or may be OK if skipped)

-- 6. Dual Tracking Sync Check
SELECT 'Out of Sync Assignments' as check_name, COUNT(*) as count
FROM shifts s
LEFT JOIN shift_assignments sa ON s.shift_id = sa.shift_id
WHERE s.assigned_employee_id IS NOT NULL
    AND (sa.employee_id IS NULL
         OR s.assigned_employee_id != sa.employee_id);
-- Expected: count = 0 (perfect sync)
```

### ✅ Configuration Checks

Open `backend/app/config.py` and verify:

```python
# For testing (relaxed constraints):
TESTING_MODE = True  # ✅ Should be True
SKIP_CERTIFICATION_CHECK = True  # ✅ Should be True
SKIP_AVAILABILITY_CHECK = True  # ✅ Should be True
MAX_HOURS_WEEK = 60  # ✅ Relaxed
MIN_REST_HOURS = 6  # ✅ Relaxed

# For production (strict constraints):
TESTING_MODE = False  # Requires proper data
SKIP_CERTIFICATION_CHECK = False  # Requires certifications
SKIP_AVAILABILITY_CHECK = False  # Requires availability records
MAX_HOURS_WEEK = 48  # BCEA compliant
MIN_REST_HOURS = 8  # BCEA compliant
```

### ✅ API Test

```bash
# Test roster generation
curl -X POST "http://localhost:8000/api/v1/jobs/roster/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-15",
    "end_date": "2025-11-22",
    "site_ids": null,
    "algorithm": "production",
    "budget_limit": null,
    "user_id": 1,
    "org_id": 1
  }'
```

**Expected:**
- `"status": "SUCCESS"`
- `"assignments": [...]` with at least one assignment
- `"fill_rate"` > 0

### ✅ Logs Check

Watch backend terminal for:
```
INFO: Found X shifts to assign  # X should be > 0
INFO: Found Y active employees  # Y should be > 0
INFO: Found Z feasible pairs  # Z should be > 0
INFO: Roster generation complete: SUCCESS
```

---

## 11. Step-by-Step Debugging Session Example

Here's a complete debugging session from start to finish:

### Step 1: Open 3 Terminals

**Terminal 1: Backend**
```bash
cd "C:\Users\USER\Documents\Master Plan\RostraCore\backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
✅ Leave this running

**Terminal 2: Commands**
```bash
cd "C:\Users\USER\Documents\Master Plan\RostraCore"
```
✅ Use this for running commands

**Terminal 3: PostgreSQL**
```bash
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d rostracore_db
```
✅ Use this for SQL queries

### Step 2: Verify Database Has Data

**In Terminal 3 (PostgreSQL):**
```sql
-- Check employees
SELECT COUNT(*) as employee_count FROM employees WHERE status = 'active';
```

**If result is 0:**
```sql
-- Add test employee
INSERT INTO employees (
    first_name, last_name, id_number, role,
    hourly_rate, status, email, max_hours_week
) VALUES (
    'John', 'Doe', '9001010000000', 'unarmed',
    45.00, 'active', 'john.doe@test.com', 48
);

-- Get the employee ID
SELECT employee_id, first_name, last_name FROM employees ORDER BY employee_id DESC LIMIT 1;
```

**Add certification (use employee_id from above):**
```sql
INSERT INTO certifications (
    employee_id, cert_type, issue_date, expiry_date, verified
) VALUES (
    1, 'PSIRA Grade E', '2024-01-01', '2026-12-31', true
);
```

**Add skill:**
```sql
INSERT INTO skills_matrix (
    employee_id, skill_name, proficiency_level, certified
) VALUES (
    1, 'unarmed', 'expert', true
);
```

**Add shift:**
```sql
-- First, need a site
INSERT INTO sites (
    client_name, site_name, address, required_skill, min_staff
) VALUES (
    'Test Client', 'Main Gate', '123 Test St', 'unarmed', 1
);

-- Get site ID
SELECT site_id FROM sites ORDER BY site_id DESC LIMIT 1;

-- Add shift (use site_id from above)
INSERT INTO shifts (
    site_id, start_time, end_time, required_skill, status
) VALUES (
    1, '2025-11-15 08:00:00', '2025-11-15 16:00:00', 'unarmed', 'planned'
);
```

### Step 3: Test Roster Generation

**In Terminal 2:**
```bash
curl -X POST "http://localhost:8000/api/v1/jobs/roster/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-15",
    "end_date": "2025-11-22"
  }'
```

### Step 4: Check Results

**Watch Terminal 1 (Backend) for logs**

**Check if assignment was created in Terminal 3:**
```sql
-- Check shift was assigned
SELECT
    s.shift_id,
    s.assigned_employee_id,
    s.status
FROM shifts s
WHERE s.start_time >= '2025-11-15';

-- Check ShiftAssignment record was created
SELECT
    sa.assignment_id,
    sa.shift_id,
    sa.employee_id,
    sa.total_cost
FROM shift_assignments sa
WHERE sa.shift_id IN (
    SELECT shift_id FROM shifts WHERE start_time >= '2025-11-15'
);
```

### Step 5: Verify Fix

**Both queries should return data** - this means the dual tracking is working! ✅

---

## 12. Quick Reference Commands

### PostgreSQL Commands
```bash
# Connect
psql -U postgres -d rostracore_db

# List tables
\dt

# Describe table
\d employees

# Run SQL file
\i /path/to/file.sql

# Export query results
\copy (SELECT * FROM employees) TO 'employees.csv' CSV HEADER

# Quit
\q
```

### Git Commands
```bash
# Check current branch
git branch

# Check status
git status

# Pull latest changes
git pull origin claude/saas-business-model-research-011CUpKvVEq58o6aYRTWgEuJ

# View recent commits
git log --oneline -10
```

### Python/Backend Commands
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Check migration status
alembic current

# Run tests
pytest -v

# Run backend
uvicorn app.main:app --reload --port 8000

# Run debug script
python test_roster_debug.py
```

### Frontend Commands
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

---

## 13. Getting Help

### When Stuck

1. **Check logs first** - 80% of issues show up in logs
2. **Run the debugging checklist** - Systematic approach
3. **Search the error message** - Google/Stack Overflow
4. **Check database data** - Use SQL queries provided

### Documentation Links

- **FastAPI:** https://fastapi.tiangolo.com/
- **SQLAlchemy:** https://docs.sqlalchemy.org/
- **Alembic:** https://alembic.sqlalchemy.org/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Next.js:** https://nextjs.org/docs
- **Pytest:** https://docs.pytest.org/

### Local Documentation

- `BACKEND_MODEL_ANALYSIS.md` - Model documentation and issues
- `DEBUGGING_GUIDE.md` - This file
- `backend/README.md` - Backend setup
- `frontend/README.md` - Frontend setup

---

## 14. Installation Guide (If Tools Missing)

### Install Python

**Windows:**
1. Download from: https://www.python.org/downloads/
2. Run installer
3. ✅ CHECK "Add Python to PATH"
4. Click "Install Now"

**Mac:**
```bash
brew install python@3.10
```

**Linux:**
```bash
sudo apt update
sudo apt install python3.10 python3-pip
```

### Install