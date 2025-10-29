# RostraCore Testing Guide

Complete step-by-step guide to test all features of the RostraCore application.

---

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.9+ installed
- ✅ Node.js 18+ installed
- ✅ PostgreSQL installed (or Docker for containerized PostgreSQL)
- ✅ Git installed

---

## Step 1: Start PostgreSQL Database

### Option A: Using Docker (Recommended)

```bash
# Navigate to backend directory
cd C:\Users\CPS\Documents\dotroster\backend

# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps
```

**Expected output**: You should see `rostracore_db` container running on port 5432

### Option B: Using Local PostgreSQL

```bash
# Start PostgreSQL service
# Windows: Start from Services or run:
net start postgresql-x64-14

# Verify connection
psql -U rostracore_user -d rostracore
# Enter password: your_secure_password
# Type \q to exit
```

---

## Step 2: Set Up Backend

### 2.1 Activate Virtual Environment

```bash
cd C:\Users\CPS\Documents\dotroster\backend

# Activate virtual environment
venv\Scripts\activate

# You should see (venv) in your terminal prompt
```

### 2.2 Install Python Dependencies (if not already done)

```bash
pip install -r requirements.txt
```

### 2.3 Run Database Migrations

```bash
# Apply all migrations to create database tables
alembic upgrade head
```

**Expected output**:
```
INFO  [alembic.runtime.migration] Running upgrade -> xxxxx, Initial schema
INFO  [alembic.runtime.migration] Running upgrade xxxxx -> yyyyy, ...
```

### 2.4 Start Backend Server

```bash
# Start FastAPI server
uvicorn app.main:app --reload
```

**Expected output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxx] using WatchFiles
INFO:     Started server process [yyyy]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Backend is now running at: http://localhost:8000**

### 2.5 Test Backend API (in a new terminal)

```bash
# Test health endpoint
curl http://localhost:8000/health

# Or open in browser:
# http://localhost:8000/docs (Swagger UI)
```

---

## Step 3: Start Frontend

### 3.1 Open New Terminal

Keep the backend terminal running and open a new terminal window.

### 3.2 Navigate to Frontend Directory

```bash
cd C:\Users\CPS\Documents\dotroster\frontend
```

### 3.3 Start Development Server

```bash
npm run dev
```

**Expected output**:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in X.Xs
```

**✅ Frontend is now running at: http://localhost:3000**

---

## Step 4: Test the Application

### 4.1 Test Homepage

1. Open browser to: **http://localhost:3000**
2. You should see the RostraCore homepage with 4 cards:
   - 👥 Employees
   - 📍 Sites
   - 📅 Shifts
   - 🤖 Auto Roster

**✅ Homepage loads successfully**

---

### 4.2 Test Employee Management

#### Create Employee

1. Click **"Employees"** card on homepage
2. Click **"+ Add Employee"** button (top right)
3. Fill in the form:
   - **First Name**: John
   - **Last Name**: Smith
   - **ID Number**: EMP001
   - **Role**: Armed
   - **Hourly Rate**: 150
   - **Max Hours/Week**: 48
   - **Status**: Active
   - **Email**: john.smith@example.com
   - **Phone**: +27 123 456 789
4. Click **"Create"**

**✅ Expected Result**:
- Modal closes
- New employee appears in the table
- Success message (or page refresh shows the new employee)

#### Edit Employee

1. Find the employee you just created
2. Click **"Edit"** button
3. Change **Hourly Rate** to: 160
4. Click **"Update"**

**✅ Expected Result**:
- Modal closes
- Employee's hourly rate updates to $160.00/hr

#### Create Multiple Employees

Create at least 3-5 employees for testing:

```
Employee 2:
- Name: Sarah Johnson
- ID: EMP002
- Role: Unarmed
- Rate: 120

Employee 3:
- Name: Mike Davis
- ID: EMP003
- Role: Supervisor
- Rate: 180

Employee 4:
- Name: Lisa Brown
- ID: EMP004
- Role: Armed
- Rate: 155

Employee 5:
- Name: Tom Wilson
- ID: EMP005
- Role: Unarmed
- Rate: 125
```

#### Delete Employee

1. Click **"Delete"** on an employee
2. Confirm deletion

**✅ Expected Result**: Employee is removed from the list

---

### 4.3 Test Site Management

#### Create Site

1. Go back to homepage (click browser back or logo)
2. Click **"Sites"** card
3. Click **"+ Add Site"** button
4. Fill in the form:
   - **Client Name**: ABC Security Hub
   - **Address**: 123 Main Street, Johannesburg
   - **GPS Latitude**: -26.2041
   - **GPS Longitude**: 28.0473
   - **Shift Pattern**: 12hr
   - **Required Skill**: Armed
   - **Billing Rate**: 200
   - **Minimum Staff**: 2
   - **Notes**: High-security commercial site
5. Click **"Create"**

**✅ Expected Result**: New site appears in the card grid

#### Create Multiple Sites

Create at least 2-3 sites:

```
Site 2:
- Client: XYZ Shopping Mall
- Address: 456 Market Road, Pretoria
- Shift Pattern: Day (8h)
- Required Skill: Unarmed
- Billing Rate: 150
- Min Staff: 3

Site 3:
- Client: Corporate Tower
- Address: 789 Business Blvd, Cape Town
- Shift Pattern: Night
- Required Skill: Armed
- Billing Rate: 220
- Min Staff: 1
```

#### Edit and Delete Sites

Test editing and deleting sites similar to employees.

---

### 4.4 Test Shift Management

#### Navigate to Shifts Page

1. Go to homepage
2. Click **"Shifts"** card
3. You should see:
   - Filters section (Site, Status, Employee)
   - Statistics cards (Total, Assigned, Unassigned, Confirmed)
   - Empty shifts table

#### Create Shift

1. Click **"+ Create Shift"** button
2. Fill in the form:
   - **Site**: ABC Security Hub (select from dropdown)
   - **Start Time**: Today at 08:00
   - **End Time**: Today at 20:00
   - **Required Skill**: Armed
   - **Assign Employee**: John Smith (optional)
   - **Status**: Planned
   - **Mark as Overtime**: Unchecked
3. Click **"Create"**

**✅ Expected Result**:
- Shift appears in the table
- Statistics update (Total Shifts increases)
- If assigned, "Assigned" count increases

#### Create Multiple Shifts

Create 5-10 shifts with varying:
- Different sites
- Different dates (today, tomorrow, next week)
- Some assigned, some unassigned
- Different statuses (planned, confirmed)
- Mix of day/night shifts

**Example shifts**:
```
Shift 2:
- Site: XYZ Shopping Mall
- Start: Today 18:00
- End: Tomorrow 06:00
- Required: Unarmed
- Assigned: Sarah Johnson
- Status: Confirmed

Shift 3:
- Site: Corporate Tower
- Start: Tomorrow 08:00
- End: Tomorrow 20:00
- Required: Armed
- Assigned: (Unassigned)
- Status: Planned
```

#### Test Filtering

1. **Filter by Site**: Select "ABC Security Hub"
   - **✅ Expected**: Only shifts at that site show
2. **Filter by Status**: Select "Confirmed"
   - **✅ Expected**: Only confirmed shifts show
3. **Filter by Employee**: Select "John Smith"
   - **✅ Expected**: Only shifts assigned to John show
4. Click **"Clear Filters"**
   - **✅ Expected**: All shifts show again

#### Edit and Delete Shifts

Test editing shift times, reassigning employees, and deleting shifts.

---

### 4.5 Test Availability Management

#### Navigate to Availability Page

1. In your browser, go to: **http://localhost:3000/availability**
2. Or create a link from homepage to this page

#### Create Availability Record

1. Click **"+ Add Availability"** button
2. Fill in the form:
   - **Employee**: John Smith
   - **Date**: Today's date
   - **Start Time**: 06:00
   - **End Time**: 22:00
   - **Available**: ✅ Checked
3. Click **"Create"**

**✅ Expected Result**:
- Availability record appears in table
- Shows "Available" status in green badge
- Statistics update

#### Create Multiple Availability Records

Create records for different scenarios:

```
Record 2:
- Employee: Sarah Johnson
- Date: Tomorrow
- Start: 08:00
- End: 18:00
- Available: Yes

Record 3:
- Employee: Mike Davis
- Date: Today
- Start: 00:00
- End: 23:59
- Available: No (mark as unavailable)

Record 4:
- Employee: Lisa Brown
- Date: Next Monday
- Start: 06:00
- End: 14:00
- Available: Yes
```

#### Test Filtering

1. **Filter by Employee**: Select "John Smith"
   - **✅ Expected**: Only John's availability shows
2. Check statistics update correctly

---

### 4.6 Test Auto Roster Generation

#### Navigate to Roster Page

1. Go to homepage
2. Click **"Auto Roster"** card

#### Prerequisites for Roster Generation

Before generating a roster, ensure you have:
- ✅ At least 3-5 employees created
- ✅ At least 2-3 sites created
- ✅ At least 5-10 shifts created
- ✅ Some shifts should be unassigned
- ✅ Some availability records created

#### Generate Roster

1. Select **Start Date**: Today
2. Select **End Date**: 7 days from today
3. Click **"Generate Roster"** button
4. Wait for algorithm to complete (may take a few seconds)

**✅ Expected Results**:
- Loading state appears
- Summary statistics display:
  - Total Cost
  - Shifts Filled
  - Fill Rate (%)
  - Employees Used
- Assignments table shows which employees are assigned to which shifts
- Unfilled shifts alert appears if any shifts couldn't be assigned
- **"Confirm Roster"** button appears

#### Confirm Roster

1. Review the assignments
2. Click **"Confirm Roster"** button

**✅ Expected Result**:
- Success message
- Assignments are saved to the database
- Go back to Shifts page and verify employees are now assigned

---

### 4.7 Test API Documentation

1. Open: **http://localhost:8000/docs**
2. Explore the Swagger UI
3. Try executing some API calls directly:
   - **GET /api/v1/employees** - List all employees
   - **POST /api/v1/employees** - Create an employee
   - **GET /api/v1/sites** - List all sites

**✅ Expected Result**: All endpoints respond correctly

---

## Step 5: Test Error Handling

### Test Validation Errors

1. **Empty Required Fields**: Try creating an employee without filling required fields
   - **✅ Expected**: Form validation prevents submission

2. **Invalid Data**: Try entering negative hourly rate
   - **✅ Expected**: HTML5 validation or error message

3. **Duplicate Employee**: Try creating an employee with existing ID number
   - **✅ Expected**: Error message from backend

### Test Backend Connection Issues

1. Stop the backend server (CTRL+C in backend terminal)
2. Try creating an employee in the frontend
   - **✅ Expected**: Error message "Failed to fetch" or connection error

3. Restart backend server
4. Retry the operation
   - **✅ Expected**: Works correctly

---

## Step 6: Verify Data Persistence

1. Create some employees, sites, and shifts
2. Stop both frontend and backend servers
3. Restart both servers
4. Check that all data is still present

**✅ Expected Result**: All data persists (stored in PostgreSQL)

---

## Troubleshooting Common Issues

### Issue: "Connection Refused" when accessing backend

**Solution**:
- Ensure backend server is running on port 8000
- Check: `http://localhost:8000/health`
- Verify no other process is using port 8000

### Issue: Frontend shows "Failed to fetch"

**Solution**:
- Check backend is running
- Verify CORS is enabled in backend
- Check `.env.local` has correct API URL

### Issue: Database connection errors

**Solution**:
- Verify PostgreSQL is running
- Check credentials in `backend/.env`
- Run: `psql -U rostracore_user -d rostracore` to test connection

### Issue: "Module not found" errors

**Solution**:
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

---

## Testing Checklist

Use this checklist to ensure all features work:

### Backend
- [ ] Backend server starts without errors
- [ ] Health endpoint responds
- [ ] Swagger docs load at /docs
- [ ] Database migrations applied successfully

### Frontend - Homepage
- [ ] Homepage loads correctly
- [ ] All navigation cards are visible
- [ ] Links work to all pages

### Frontend - Employees
- [ ] Employee list loads
- [ ] Can create new employee
- [ ] Can edit existing employee
- [ ] Can delete employee
- [ ] Form validation works
- [ ] Error messages display correctly

### Frontend - Sites
- [ ] Site list loads (card view)
- [ ] Can create new site
- [ ] Can edit existing site
- [ ] Can delete site
- [ ] All form fields work correctly

### Frontend - Shifts
- [ ] Shift list loads
- [ ] Statistics display correctly
- [ ] Can create new shift
- [ ] Can edit existing shift
- [ ] Can delete shift
- [ ] Can filter by site
- [ ] Can filter by status
- [ ] Can filter by employee
- [ ] Clear filters works
- [ ] Assigned/unassigned tracking works

### Frontend - Availability
- [ ] Availability list loads
- [ ] Can create availability record
- [ ] Can edit availability record
- [ ] Can delete availability record
- [ ] Can filter by employee
- [ ] Statistics display correctly

### Frontend - Roster Generation
- [ ] Roster generation page loads
- [ ] Date selection works
- [ ] Generate button triggers algorithm
- [ ] Results display correctly
- [ ] Summary statistics show
- [ ] Assignments table populates
- [ ] Confirm roster works
- [ ] Assignments save to shifts

### Error Handling
- [ ] Form validation prevents invalid data
- [ ] Backend errors display user-friendly messages
- [ ] Loading states display during API calls
- [ ] Network errors are handled gracefully

---

## Next Steps After Testing

Once all tests pass:

1. **Document Issues**: Note any bugs or unexpected behavior
2. **Performance Testing**: Try with 50+ employees, 100+ shifts
3. **Edge Cases**: Test with empty data, invalid dates, etc.
4. **Browser Compatibility**: Test in Chrome, Firefox, Edge
5. **Mobile Responsive**: Test on mobile device or browser dev tools

---

## Success Criteria

✅ **Application is working correctly if**:
- All CRUD operations work for all entities
- Data persists after server restart
- Filters and search work correctly
- Roster generation successfully assigns employees to shifts
- No console errors in browser
- No server errors in terminal
- Forms validate input correctly
- Error messages are clear and helpful

---

**Happy Testing! 🚀**

For issues or questions, refer to:
- `README.md` - Project overview
- `SETUP_GUIDE.md` - Setup instructions
- `spec.md` - Product specification
- `PROJECT_SUMMARY.md` - What has been built
