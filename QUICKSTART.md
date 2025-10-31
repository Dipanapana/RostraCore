# RostraCore - Quick Start Guide

**Get RostraCore running locally in 5 minutes!**

This guide will help you run the RostraCore application locally on your Windows machine.

---

## ✅ Prerequisites

- ✅ Python 3.13+ installed
- ✅ Node.js 18+ installed (for frontend, optional)
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

---

## 🚀 Quick Start (Backend Only)

### Step 1: Clone & Navigate

```bash
cd "C:\Users\USER\Documents\Master Plan\RostraCore"
```

### Step 2: Set Up Python Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment

The `.env` file is already configured with SQLite for local testing:

```env
DATABASE_URL=sqlite:///./rostracore.db
```

**Note:** SQLite requires no installation or setup - it's built into Python!

### Step 4: Run Database Migrations

```bash
alembic upgrade head
```

This creates all the necessary tables in the SQLite database.

### Step 5: Start the Backend Server

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**✅ Backend is now running!**
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

---

## 📊 Access the Application

### API Documentation (Swagger UI)
Open your browser and go to: **http://localhost:8000/docs**

Here you can:
- View all available API endpoints
- Test endpoints directly in the browser
- See request/response schemas

### API Endpoints Available

**Core Entities:**
- 👥 `/api/employees` - Manage employees
- 📍 `/api/sites` - Manage work sites
- 🕐 `/api/shifts` - Manage shifts
- 📅 `/api/availability` - Employee availability
- 📜 `/api/certifications` - Employee certifications
- 💰 `/api/budgets` - Budget management

**Rostering:**
- 🤖 `/api/roster/generate` - Auto-generate roster
- 📊 `/api/roster/optimize` - Optimize existing roster
- 📈 `/api/reports` - Generate reports

---

## 🎯 Implemented Algorithms

Your RostraCore installation includes these production-ready algorithms:

### 1. **Hungarian Algorithm** (Optimal Assignment)
- **Location:** `backend/app/algorithms/optimizer.py:17-29`
- **Purpose:** Finds globally optimal shift assignments
- **Uses:** `scipy.optimize.linear_sum_assignment`
- **Cost Function:** `hourly_rate × hours + distance_penalty`

### 2. **Greedy Heuristic** (Fast Assignment)
- **Location:** `backend/app/algorithms/optimizer.py:32-79`
- **Purpose:** Quick approximate solution
- **Strategy:** Assign lowest-cost pairs first

### 3. **Integer Linear Programming** (Advanced Constraints)
- **Location:** `backend/app/algorithms/optimizer.py:82-166`
- **Purpose:** Handles complex constraints (budgets, quotas)
- **Uses:** PuLP solver
- **Features:** Budget limits, multiple constraints

### 4. **Constraint Validation Engine**
- **Location:** `backend/app/algorithms/constraints.py`
- **Checks:**
  - ✅ Skill matching
  - ✅ Certification validity
  - ✅ Availability windows
  - ✅ Weekly hour limits (max 48h)
  - ✅ Rest periods (min 8h between shifts)
  - ✅ Distance constraints (max 50km)
  - ✅ Overtime calculations

### 5. **Distance Calculation** (Haversine Formula)
- **Location:** `backend/app/algorithms/constraints.py:165-199`
- **Purpose:** Calculate GPS distance between employee home and site
- **Accuracy:** Earth curvature-aware

### 6. **Overtime Cost Calculator**
- **Location:** `backend/app/algorithms/constraints.py:202-242`
- **Features:** Regular vs overtime hours, cost breakdown

---

## 🧪 Test the Algorithms

### Option 1: Using the API Docs (Easiest)

1. Go to http://localhost:8000/docs
2. Click on **POST /api/roster/generate**
3. Click "Try it out"
4. Enter sample data (see below)
5. Click "Execute"

### Option 2: Using cURL

```bash
curl -X POST "http://localhost:8000/api/roster/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-11-01T00:00:00",
    "end_date": "2025-11-07T23:59:59"
  }'
```

### Option 3: Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/api/roster/generate",
    json={
        "start_date": "2025-11-01T00:00:00",
        "end_date": "2025-11-07T23:59:59"
    }
)

print(response.json())
```

---

## 📁 Project Structure

```
RostraCore/
├── backend/
│   ├── app/
│   │   ├── algorithms/          # 🧮 Rostering algorithms
│   │   │   ├── roster_generator.py    # Main engine
│   │   │   ├── optimizer.py           # Hungarian, Greedy, ILP
│   │   │   └── constraints.py         # Constraint validators
│   │   ├── api/
│   │   │   └── endpoints/       # API routes
│   │   ├── models/              # Database models
│   │   ├── services/            # Business logic
│   │   ├── main.py             # FastAPI app
│   │   ├── config.py           # Settings
│   │   └── database.py         # DB connection
│   ├── rostracore.db           # 📊 SQLite database
│   ├── .env                    # Environment config
│   └── requirements.txt        # Python dependencies
└── frontend/                   # (Optional) React UI
```

---

## 🛠️ Development Commands

### Backend

```bash
# Activate virtual environment
cd backend
venv\Scripts\activate

# Start server
python -m uvicorn app.main:app --reload

# Run database migrations
alembic upgrade head

# Create new migration (after model changes)
alembic revision --autogenerate -m "description"

# Run tests
pytest

# Check database
sqlite3 rostracore.db
```

### View Database (SQLite)

```bash
# Install SQLite browser or use CLI
sqlite3 rostracore.db

# In SQLite CLI:
.tables                    # List tables
SELECT * FROM employees;   # View employees
SELECT * FROM shifts;      # View shifts
.quit                      # Exit
```

---

## 🔄 Switch to PostgreSQL (Production)

When ready for production, switch from SQLite to PostgreSQL:

### 1. Start PostgreSQL (Docker)

```bash
cd backend
docker-compose up -d
```

### 2. Update .env

```env
# Comment out SQLite
# DATABASE_URL=sqlite:///./rostracore.db

# Uncomment PostgreSQL
DATABASE_URL=postgresql://rostracore_user:d00730fe3e184c0c95d735b7536057a7@localhost:5432/rostracore
```

### 3. Run Migrations

```bash
alembic upgrade head
```

### 4. Restart Server

```bash
python -m uvicorn app.main:app --reload
```

---

## 📚 Algorithm Documentation

### How the Roster Generator Works

1. **Fetch Unassigned Shifts** - Get all shifts in date range
2. **Fetch Available Employees** - Get all active employees
3. **Generate Feasible Pairs** - Check constraints for each (employee, shift):
   - Skill match? ✓
   - Valid certifications? ✓
   - Available? ✓
   - Within hour limits? ✓
   - Rest period met? ✓
   - Distance acceptable? ✓
4. **Build Cost Matrix** - Calculate cost for each feasible pair
5. **Optimize** - Run Hungarian algorithm to find optimal assignments
6. **Return Results** - Assignments + summary + unfilled shifts

### Cost Function

```
Total Cost = Base Cost + Distance Penalty
Where:
  Base Cost = hourly_rate × shift_hours
  Distance Penalty = distance_km × $0.10
```

### Constraints

| Constraint | Default | Configurable |
|------------|---------|--------------|
| Max Hours/Week | 48h | `.env: MAX_HOURS_WEEK` |
| Min Rest Hours | 8h | `.env: MIN_REST_HOURS` |
| Max Distance | 50km | `.env: MAX_DISTANCE_KM` |
| OT Multiplier | 1.5x | `.env: OT_MULTIPLIER` |

---

## 🐛 Troubleshooting

### Port 8000 Already in Use

```bash
# Use a different port
python -m uvicorn app.main:app --reload --port 8001
```

### Database Locked (SQLite)

```bash
# Close all database connections
# Delete rostracore.db and re-run migrations
rm rostracore.db
alembic upgrade head
```

### Import Errors

```bash
# Ensure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Docker Desktop Issues

If Docker isn't working, you can:
1. Use SQLite (already configured)
2. Install PostgreSQL locally
3. Skip Docker entirely for now

---

## 📞 Next Steps

### 1. Add Sample Data

Create employees, sites, and shifts through the API:
- Go to http://localhost:8000/docs
- Use the POST endpoints to create data

### 2. Generate Your First Roster

After adding data:
1. POST `/api/roster/generate` with date range
2. View optimized assignments
3. Export to PDF/Excel

### 3. Explore the Frontend (Optional)

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

---

## ✅ Success Checklist

- [x] Python 3.13 installed
- [x] Dependencies installed
- [x] SQLite database created
- [x] Migrations applied
- [x] Backend running on http://localhost:8000
- [x] API docs accessible at /docs
- [ ] Sample data created
- [ ] First roster generated

---

## 🎉 You're Ready!

Your RostraCore application is now running locally with:
- ✅ Full backend API
- ✅ SQLite database
- ✅ Complete rostering algorithms
- ✅ Interactive API documentation

**Start building rosters!** 🚀

For more details, see [SETUP_GUIDE.md](SETUP_GUIDE.md)
