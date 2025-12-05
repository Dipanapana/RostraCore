# Roster Generation Fix Guide - GuardianOS

## CRITICAL: Step-by-Step Diagnostic and Fix

This guide will help you diagnose and fix roster generation issues systematically.

---

## **Step 1: Check Database Has Data**

Run this command in your terminal (from the `backend` directory):

```bash
python -c "
from app.database import get_db
from app.models.employee import Employee
from app.models.site import Site
from app.models.shift import Shift

db = next(get_db())

employees = db.query(Employee).filter(Employee.status == 'ACTIVE').all()
sites = db.query(Site).all()
unfilled_shifts = db.query(Shift).filter(Shift.status == 'UNFILLED').all()

print('='*80)
print('DATABASE STATUS')
print('='*80)
print(f'Active Employees: {len(employees)}')
print(f'Sites: {len(sites)}')
print(f'Unfilled Shifts: {len(unfilled_shifts)}')
print()

if len(employees) == 0:
    print('❌ NO EMPLOYEES FOUND - You need to add employees first!')
elif len(employees) < 3:
    print('⚠️  WARNING: Only {len(employees)} employees - roster generation may fail')
else:
    print(f'✓ You have {len(employees)} employees')

if len(sites) == 0:
    print('❌ NO SITES FOUND - You need to add sites/clients first!')
else:
    print(f'✓ You have {len(sites)} sites')

if len(unfilled_shifts) == 0:
    print('❌ NO UNFILLED SHIFTS - You need to create shifts first!')
else:
    print(f'✓ You have {len(unfilled_shifts)} unfilled shifts')
print('='*80)
"
```

### Expected Output:
```
Active Employees: 10
Sites: 3
Unfilled Shifts: 42
✓ You have 10 employees
✓ You have 3 sites
✓ You have 42 unfilled shifts
```

### If You See Errors:

**"NO EMPLOYEES FOUND"**
- Go to the Employees page
- Add at least 3-5 employees
- Make sure their status is "ACTIVE"

**"NO SITES FOUND"**
- Go to the Clients page
- Add at least 1 client with 1-2 sites

**"NO UNFILLED SHIFTS"**
- Go to the Shifts page
- Create shifts for the next 7 days
- Make sure shift status is "UNFILLED"

---

## **Step 2: Create Test Shifts (If Needed)**

If you have no shifts, run this script to create test shifts:

```bash
python -c "
from app.database import get_db
from app.models.shift import Shift
from app.models.site import Site
from datetime import datetime, timedelta
import random

db = next(get_db())

# Get first site
site = db.query(Site).first()
if not site:
    print('❌ No sites found! Add a site first.')
    exit(1)

print(f'Creating test shifts for site: {site.site_name}')

# Create shifts for next 7 days
start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

shifts_created = 0
for day in range(7):
    shift_date = start_date + timedelta(days=day)

    # Morning shift: 8 AM - 4 PM
    morning_shift = Shift(
        site_id=site.site_id,
        shift_date=shift_date.date(),
        start_time=shift_date.replace(hour=8, minute=0).time(),
        end_time=shift_date.replace(hour=16, minute=0).time(),
        status='UNFILLED',
        required_guards=1,
        role_required='Security Guard'
    )
    db.add(morning_shift)
    shifts_created += 1

    # Evening shift: 4 PM - 12 AM
    evening_shift = Shift(
        site_id=site.site_id,
        shift_date=shift_date.date(),
        start_time=shift_date.replace(hour=16, minute=0).time(),
        end_time=shift_date.replace(hour=23, minute=59).time(),
        status='UNFILLED',
        required_guards=1,
        role_required='Security Guard'
    )
    db.add(evening_shift)
    shifts_created += 1

db.commit()
print(f'✓ Created {shifts_created} test shifts')
print(f'  Date range: {start_date.date()} to {(start_date + timedelta(days=6)).date()}')
"
```

---

## **Step 3: Check Configuration Settings**

Open `backend/app/config.py` and verify these settings:

```python
# Should be set to True for testing
TESTING_MODE = True
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True

# These should be relaxed for testing
MAX_HOURS_WEEK = 60  # Increased from 48
MIN_REST_HOURS = 6   # Decreased from 8
MAX_DISTANCE_KM = 100.0  # Increased from 50
```

### If These Are Wrong:

1. Open `backend/app/config.py`
2. Find the section with these variables
3. Change them to the values above
4. Restart the backend server

---

## **Step 4: Test Roster Generation Directly**

Run the comprehensive roster generation test:

```bash
cd backend
python test_roster_comprehensive.py
```

### This Script Will:
1. Check your database has employees, sites, and shifts
2. Attempt to generate a roster
3. Show detailed results including:
   - How many shifts were filled
   - Which employees were assigned
   - Cost breakdown
   - Any constraint violations

### Expected Output:
```
================================================================================
ROSTRACORE ROSTER GENERATION TEST
================================================================================

DATABASE STATUS
---
Active Employees: 10
Sites: 3
Unfilled Shifts: 14

TESTING ROSTER GENERATION
---
Start Date: 2025-11-14
End Date: 2025-11-20
Algorithm: production

RESULTS
---
✓ Roster generated successfully!
Assigned Shifts: 12 / 14 (85.7%)
Unfilled Shifts: 2
Total Cost: R 15,420.00

ASSIGNMENTS
---
2025-11-14 08:00 - John Doe @ Main Gate
2025-11-14 16:00 - Jane Smith @ Main Gate
...
```

### If You See Errors:

**"No feasible solution found"**
- Constraints are too restrictive
- Not enough employees to cover all shifts
- Try relaxing constraints in config.py

**"No assignments could be generated"**
- Check that employees have the required skills
- Verify employees are ACTIVE status
- Check shift requirements match employee capabilities

---

## **Step 5: Test Via API**

If the direct test works, test via the API:

```bash
# First, get your auth token by logging in
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# This will return: {"access_token": "eyJ0eXAi..."}
# Copy the token and use it below:

TOKEN="your_token_here"

# Now test roster generation
curl -X POST "http://localhost:8000/api/v1/roster/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-14",
    "end_date": "2025-11-20",
    "algorithm": "production"
  }'
```

---

## **Step 6: Check Backend Logs**

If roster generation still fails, check the backend logs:

```bash
# If running with uvicorn
tail -f backend_logs.log

# Or check Docker logs if using Docker
docker logs rostracore-backend -f
```

Look for:
- ❌ "Constraint violation" errors
- ❌ "No feasible solution" messages
- ❌ SQLAlchemy errors
- ❌ "Employee does not meet requirements" warnings

---

## **Step 7: Common Issues and Fixes**

### Issue: "Dashboard shows 0 shifts"

**Cause:** No shifts exist in the database OR shifts are not in UNFILLED status

**Fix:**
```bash
python -c "
from app.database import get_db
from app.models.shift import Shift

db = next(get_db())
shifts = db.query(Shift).all()
print(f'Total shifts in database: {len(shifts)}')
for s in shifts:
    print(f'  - {s.shift_date} {s.start_time} status={s.status}')
"
```

---

### Issue: "No assignments could be generated"

**Cause 1:** Employees don't have required skills

**Fix:** Check skill requirements
```bash
python -c "
from app.database import get_db
from app.models.shift import Shift
from app.models.employee import Employee

db = next(get_db())
shifts = db.query(Shift).filter(Shift.status == 'UNFILLED').all()
employees = db.query(Employee).filter(Employee.status == 'ACTIVE').all()

print('SHIFT REQUIREMENTS:')
for s in shifts[:5]:
    print(f'  - {s.shift_date}: requires role={s.role_required}, skills={s.required_skills}')

print()
print('EMPLOYEE CAPABILITIES:')
for e in employees:
    print(f'  - {e.first_name} {e.last_name}: role={e.role}')
"
```

**Cause 2:** Constraints too restrictive

**Fix:** Temporarily relax constraints in `backend/app/config.py`:
```python
TESTING_MODE = True
MAX_HOURS_WEEK = 80
MIN_REST_HOURS = 4
MAX_DISTANCE_KM = 200.0
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True
```

---

### Issue: "Roster generation times out"

**Cause:** Too many shifts or complex constraints

**Fix:**
1. Generate roster for smaller date range (3-4 days instead of 7)
2. Reduce number of shifts per day
3. Use "hungarian" algorithm instead of "production" for faster results

---

### Issue: "Frontend shows 'Generating...' but never completes"

**Cause:** Backend roster generation is asynchronous and may be stuck

**Fix:**
1. Check if Celery worker is running:
```bash
celery -A app.celery_worker inspect active
```

2. If Celery not running, roster generation will timeout
3. For now, use synchronous generation by setting in config:
```python
USE_CELERY = False
```

---

## **Step 8: Force Synchronous Roster Generation**

If async/Celery is causing issues, force synchronous mode:

1. Edit `backend/app/config.py`:
```python
USE_CELERY = False  # Set to False
```

2. Restart backend server

3. Try roster generation again from frontend

This will make roster generation happen immediately instead of in background.

---

## **Step 9: Reset and Start Fresh**

If nothing works, reset your shifts and start fresh:

```bash
python -c "
from app.database import get_db
from app.models.shift import Shift

db = next(get_db())

# Delete all existing shifts
db.query(Shift).delete()
db.commit()
print('✓ All shifts deleted')
"
```

Then:
1. Go to Shifts page in frontend
2. Create 10-15 new shifts manually
3. Make sure they are spread across 3-5 days
4. Try roster generation again

---

## **Step 10: Contact Support**

If roster generation still doesn't work after all steps, provide these details:

1. Output of Step 1 (database status)
2. Output of Step 4 (test_roster_comprehensive.py)
3. Backend log file (last 100 lines)
4. Screenshot of error in frontend
5. Config.py contents

---

## **Quick Fix Checklist**

- [ ] Database has at least 3 employees (ACTIVE status)
- [ ] Database has at least 1 site
- [ ] Database has at least 10 unfilled shifts
- [ ] TESTING_MODE = True in config.py
- [ ] SKIP_CERTIFICATION_CHECK = True
- [ ] SKIP_AVAILABILITY_CHECK = True
- [ ] MAX_HOURS_WEEK >= 60
- [ ] MIN_REST_HOURS <= 6
- [ ] Backend server is running
- [ ] PostgreSQL is running
- [ ] No errors in backend logs

---

## **Next Steps After Roster Works**

Once roster generation is working:

1. **Tighten constraints** back to realistic values
2. **Enable certification checks** (SKIP_CERTIFICATION_CHECK = False)
3. **Enable availability checks** (SKIP_AVAILABILITY_CHECK = False)
4. **Add real employee data** with proper skills and certifications
5. **Test with realistic shift patterns**
6. **Move to production configuration**

---

## **Additional Diagnostics**

### Check Optimizer Algorithm:

```bash
python -c "
from app.services.roster_generator import RosterGenerator
from app.database import get_db

db = next(get_db())
generator = RosterGenerator(db, algorithm='production')
print(f'Using algorithm: {generator.algorithm}')
print(f'Testing mode: {generator.testing_mode}')
"
```

### Check Employee-Shift Compatibility:

```bash
python -c "
from app.database import get_db
from app.models.shift import Shift
from app.models.employee import Employee
from datetime import datetime

db = next(get_db())

# Get first unfilled shift
shift = db.query(Shift).filter(Shift.status == 'UNFILLED').first()
if not shift:
    print('No unfilled shifts')
    exit()

print(f'Shift: {shift.shift_date} {shift.start_time}-{shift.end_time}')
print(f'Required role: {shift.role_required}')
print()

# Check which employees can work this shift
employees = db.query(Employee).filter(Employee.status == 'ACTIVE').all()
print('Compatible employees:')
for emp in employees:
    can_work = emp.role == shift.role_required
    print(f'  - {emp.first_name} {emp.last_name}: role={emp.role}, compatible={can_work}')
"
```

---

**This guide should help you systematically diagnose and fix roster generation issues!**
