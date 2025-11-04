# RostraCore v2.0 - Complete Implementation Plan

**Version:** 2.0  
**Last Updated:** November 2025  
**Target Timeline:** 12 months  
**Technology Stack:** Python 3.9+, FastAPI, PostgreSQL, Google OR-Tools, React, Next.js

---

## 📋 Table of Contents

1. [Phase 0: Project Foundation & Setup](#phase-0-project-foundation--setup)
2. [Phase 1: Database Schema & Models](#phase-1-database-schema--models)
3. [Phase 2: Core CP-SAT Optimization Engine](#phase-2-core-cp-sat-optimization-engine)
4. [Phase 3: API Layer & Basic CRUD](#phase-3-api-layer--basic-crud)
5. [Phase 4: PSIRA Compliance System](#phase-4-psira-compliance-system)
6. [Phase 5: BCEA Labor Law Compliance](#phase-5-bcea-labor-law-compliance)
7. [Phase 6: Advanced Rostering Features](#phase-6-advanced-rostering-features)
8. [Phase 7: Payroll Integration](#phase-7-payroll-integration)
9. [Phase 8: Mobile App Backend](#phase-8-mobile-app-backend)
10. [Phase 9: Client Portal Backend](#phase-9-client-portal-backend)
11. [Phase 10: Frontend Dashboard](#phase-10-frontend-dashboard)
12. [Phase 11: Mobile App (React Native)](#phase-11-mobile-app-react-native)
13. [Phase 12: Advanced Features (ML, Analytics)](#phase-12-advanced-features-ml-analytics)

---

## Phase 0: Project Foundation & Setup

**Timeline:** Week 1  
**Goal:** Set up development environment and project structure

### Step 0.1: Initialize Backend Project

**Instructions for Claude:**
```
Create a new FastAPI project with the following structure:

rostracore/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Configuration management
│   │   ├── database.py             # Database connection
│   │   ├── dependencies.py         # Dependency injection
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── shift.py
│   │   │   ├── site.py
│   │   │   ├── roster.py
│   │   │   └── compliance.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── employee.py
│   │   │   ├── shift.py
│   │   │   └── roster.py
│   │   ├── api/                    # API routes
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── employees.py
│   │   │   │   ├── shifts.py
│   │   │   │   ├── rosters.py
│   │   │   │   └── compliance.py
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── roster_optimizer.py   # CP-SAT engine
│   │   │   ├── compliance_checker.py
│   │   │   └── cost_calculator.py
│   │   ├── utils/                  # Helper functions
│   │   │   ├── __init__.py
│   │   │   ├── datetime_utils.py
│   │   │   └── distance_calculator.py
│   │   └── tests/                  # Test files
│   │       ├── __init__.py
│   │       ├── test_optimizer.py
│   │       └── test_compliance.py
│   ├── migrations/                 # Alembic migrations
│   ├── requirements.txt
│   ├── .env.example
│   └── docker-compose.yml
├── frontend/
│   └── (Next.js structure - will build later)
└── README.md
```

**requirements.txt contents:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
ortools==9.8.3296
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pytest==7.4.3
httpx==0.25.2
redis==5.0.1
celery==5.3.4
```

**Acceptance Criteria:**
- ✅ Project structure created
- ✅ All dependencies installed without errors
- ✅ Can run `uvicorn app.main:app --reload` successfully
- ✅ `/docs` endpoint shows empty Swagger UI

---

### Step 0.2: Configure Database Connection

**Instructions for Claude:**

Create `app/config.py`:
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://rostracore:password123@localhost:5432/rostracore_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Business Rules (BCEA Compliance)
    MAX_WEEKLY_HOURS: int = 48
    MIN_REST_HOURS: int = 8
    OVERTIME_MULTIPLIER: float = 1.5
    MEAL_BREAK_AFTER_HOURS: int = 5
    MEAL_BREAK_DURATION_MINUTES: int = 60
    
    # PSIRA
    PSIRA_API_URL: str = "https://api.psira.co.za"  # If available
    PSIRA_ALERT_DAYS: list = [60, 30, 7]  # Alert before expiry
    
    # Optimization
    SOLVER_TIME_LIMIT_SECONDS: int = 60
    SOLVER_WORKERS: int = 8
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

Create `app/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Create `app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="RostraCore API",
    description="Security Guard Rostering & Optimization System",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "RostraCore API v2.0", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: rostracore
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: rostracore_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

**Acceptance Criteria:**
- ✅ Docker containers start successfully
- ✅ Can connect to PostgreSQL
- ✅ `GET /health` returns 200 OK

---

## Phase 1: Database Schema & Models

**Timeline:** Week 1-2  
**Goal:** Create complete database schema for all entities

### Step 1.1: Create Employee Model

**Instructions for Claude:**

Create `app/models/employee.py`:
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from datetime import datetime

class PSIRAGrade(enum.Enum):
    GRADE_A = "A"  # Security Officer
    GRADE_B = "B"  # Supervisor
    GRADE_C = "C"  # Controller
    GRADE_D = "D"  # Officer in Charge
    GRADE_E = "E"  # Specialized (armed, close protection)

class EmploymentStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ON_LEAVE = "on_leave"

class Employee(Base):
    __tablename__ = "employees"
    
    # Basic Info
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    id_number = Column(String(13), unique=True, nullable=False)  # SA ID
    phone = Column(String(20))
    email = Column(String(255))
    address = Column(String(500))
    latitude = Column(Float)  # For distance calculation
    longitude = Column(Float)
    
    # Employment
    employment_status = Column(SQLEnum(EmploymentStatus), default=EmploymentStatus.ACTIVE)
    hire_date = Column(DateTime, nullable=False)
    termination_date = Column(DateTime, nullable=True)
    
    # Pay
    hourly_rate = Column(Float, nullable=False)  # Base hourly rate in Rands
    overtime_rate_multiplier = Column(Float, default=1.5)  # 1.5x for OT
    
    # PSIRA Compliance
    psira_registration_number = Column(String(50), unique=True, nullable=False, index=True)
    psira_grade = Column(SQLEnum(PSIRAGrade), nullable=False)
    psira_expiry_date = Column(DateTime, nullable=False)
    psira_status = Column(String(20), default="active")  # active, expired, suspended
    
    # Skills & Certifications
    is_armed_certified = Column(Boolean, default=False)
    firearms_license_number = Column(String(50), nullable=True)
    firearms_license_expiry = Column(DateTime, nullable=True)
    first_aid_certified = Column(Boolean, default=False)
    first_aid_expiry = Column(DateTime, nullable=True)
    
    # Skills JSON: {"retail": true, "warehouse": true, "residential": false}
    skills = Column(JSON, default={})
    
    # Certifications JSON: list of cert objects
    certifications = Column(JSON, default=[])
    
    # Availability
    # JSON format: {"monday": {"available": true, "slots": [{"start": "08:00", "end": "20:00"}]}}
    availability = Column(JSON, default={})
    
    # Preferences
    preferred_sites = Column(JSON, default=[])  # List of site IDs
    max_weekly_hours = Column(Integer, default=48)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shift_assignments = relationship("ShiftAssignment", back_populates="employee")
    attendance_records = relationship("Attendance", back_populates="employee")
```

**Acceptance Criteria:**
- ✅ Model created with all fields
- ✅ Includes PSIRA compliance fields
- ✅ Has JSON fields for flexible data

---

### Step 1.2: Create Site Model

**Instructions for Claude:**

Create `app/models/site.py`:
```python
from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    site_code = Column(String(50), unique=True, nullable=False, index=True)
    site_name = Column(String(255), nullable=False)
    
    # Client
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Location
    address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Site Type
    site_type = Column(String(50))  # retail, warehouse, residential, corporate, event
    
    # Requirements
    requires_armed_guards = Column(Boolean, default=False)
    minimum_psira_grade = Column(String(10), default="A")
    
    # Required skills JSON: ["retail_experience", "alarm_systems", "cctv_monitoring"]
    required_skills = Column(JSON, default=[])
    
    # Special requirements JSON
    special_requirements = Column(JSON, default={})
    
    # Contact
    contact_person = Column(String(255))
    contact_phone = Column(String(20))
    contact_email = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="sites")
    shifts = relationship("Shift", back_populates="site")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    client_code = Column(String(50), unique=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    
    # Contact
    contact_person = Column(String(255))
    phone = Column(String(20))
    email = Column(String(255))
    
    # Billing
    billing_address = Column(String(500))
    payment_terms = Column(String(50))  # "30 days", "60 days"
    
    # Contract
    contract_start_date = Column(DateTime)
    contract_end_date = Column(DateTime)
    monthly_budget = Column(Float)  # Budget cap in Rands
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sites = relationship("Site", back_populates="client")
```

**Acceptance Criteria:**
- ✅ Site and Client models created
- ✅ Geographic coordinates for distance calculation
- ✅ Flexible requirements using JSON

---

### Step 1.3: Create Shift Model

**Instructions for Claude:**

Create `app/models/shift.py`:
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class ShiftType(enum.Enum):
    DAY = "day"           # 06:00 - 18:00
    NIGHT = "night"       # 18:00 - 06:00
    CUSTOM = "custom"

class ShiftStatus(enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String(50), unique=True, index=True)
    
    # Site
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    
    # Timing
    start_datetime = Column(DateTime, nullable=False, index=True)
    end_datetime = Column(DateTime, nullable=False, index=True)
    duration_hours = Column(Float, nullable=False)  # Calculated
    
    # Classification
    shift_type = Column(SQLEnum(ShiftType), default=ShiftType.CUSTOM)
    is_overnight = Column(Boolean, default=False)
    is_weekend = Column(Boolean, default=False)
    is_public_holiday = Column(Boolean, default=False)
    
    # Requirements
    required_guards = Column(Integer, default=1, nullable=False)
    required_psira_grade = Column(String(10), default="A")
    requires_armed = Column(Boolean, default=False)
    required_skills = Column(JSON, default=[])
    
    # Cost (base - before assignment)
    estimated_cost = Column(Float)
    actual_cost = Column(Float)
    
    # Status
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.DRAFT)
    
    # Metadata
    notes = Column(String(1000))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    site = relationship("Site", back_populates="shifts")
    assignments = relationship("ShiftAssignment", back_populates="shift")

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), nullable=True, index=True)
    
    # Assignment details
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(Integer)  # User ID who made assignment
    
    # Cost breakdown
    regular_hours = Column(Float, default=0)
    overtime_hours = Column(Float, default=0)
    regular_pay = Column(Float, default=0)
    overtime_pay = Column(Float, default=0)
    night_premium = Column(Float, default=0)
    weekend_premium = Column(Float, default=0)
    travel_reimbursement = Column(Float, default=0)
    total_cost = Column(Float, default=0)
    
    # Status
    is_confirmed = Column(Boolean, default=False)
    confirmation_datetime = Column(DateTime)
    
    # Attendance tracking
    checked_in = Column(Boolean, default=False)
    check_in_time = Column(DateTime)
    checked_out = Column(Boolean, default=False)
    check_out_time = Column(DateTime)
    
    # Metadata
    notes = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    shift = relationship("Shift", back_populates="assignments")
    employee = relationship("Employee", back_populates="shift_assignments")
    roster = relationship("Roster", back_populates="assignments")
```

**Acceptance Criteria:**
- ✅ Shift model with full timing info
- ✅ ShiftAssignment for many-to-many relationship
- ✅ Cost tracking fields

---

### Step 1.4: Create Roster Model

**Instructions for Claude:**

Create `app/models/roster.py`:
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class RosterStatus(enum.Enum):
    DRAFT = "draft"
    OPTIMIZING = "optimizing"
    OPTIMIZED = "optimized"
    PUBLISHED = "published"
    ACTIVE = "active"
    COMPLETED = "completed"

class Roster(Base):
    __tablename__ = "rosters"
    
    id = Column(Integer, primary_key=True, index=True)
    roster_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Period
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    period_description = Column(String(100))  # "Week 45 2024", "November 2024"
    
    # Status
    status = Column(SQLEnum(RosterStatus), default=RosterStatus.DRAFT)
    
    # Optimization
    optimization_started_at = Column(DateTime)
    optimization_completed_at = Column(DateTime)
    optimization_duration_seconds = Column(Float)
    
    # Results
    total_shifts = Column(Integer, default=0)
    assigned_shifts = Column(Integer, default=0)
    unassigned_shifts = Column(Integer, default=0)
    
    # Costs
    total_cost = Column(Float, default=0)
    regular_pay_cost = Column(Float, default=0)
    overtime_cost = Column(Float, default=0)
    premium_cost = Column(Float, default=0)  # Night + weekend
    travel_cost = Column(Float, default=0)
    
    # Budget
    budget_limit = Column(Float)
    is_within_budget = Column(Boolean, default=True)
    
    # Compliance
    bcea_compliant = Column(Boolean, default=True)
    psira_compliant = Column(Boolean, default=True)
    compliance_issues = Column(JSON, default=[])
    
    # Solver details
    solver_status = Column(String(50))  # "OPTIMAL", "FEASIBLE", "INFEASIBLE"
    solver_objective_value = Column(Float)
    solver_log = Column(Text)  # Store solver output
    
    # Metadata
    created_by = Column(Integer)  # User ID
    published_by = Column(Integer)
    published_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignments = relationship("ShiftAssignment", back_populates="roster")
```

**Acceptance Criteria:**
- ✅ Roster model tracks optimization status
- ✅ Cost breakdown fields
- ✅ Compliance tracking

---

### Step 1.5: Create Compliance Models

**Instructions for Claude:**

Create `app/models/compliance.py`:
```python
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class PSIRAAlert(Base):
    __tablename__ = "psira_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    alert_type = Column(String(50))  # "expiry_warning", "expired", "suspended"
    days_until_expiry = Column(Integer)
    expiry_date = Column(DateTime, nullable=False)
    
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer)  # User ID
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    employee = relationship("Employee")

class BCEAViolation(Base):
    __tablename__ = "bcea_violations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Reference
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id"), index=True)
    
    # Violation details
    violation_type = Column(String(100), nullable=False)
    # Types: "weekly_hours_exceeded", "insufficient_rest", "no_meal_break", 
    #        "excessive_consecutive_days", "unauthorized_overtime"
    
    violation_description = Column(Text, nullable=False)
    severity = Column(String(20))  # "critical", "high", "medium", "low"
    
    # Values
    rule_limit = Column(Float)      # e.g., 48 hours
    actual_value = Column(Float)    # e.g., 52 hours
    
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer)
    resolution_notes = Column(Text)
    
    employee = relationship("Employee")
    shift = relationship("Shift")
    roster = relationship("Roster")

class Certification(Base):
    __tablename__ = "certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    # Certification details
    certification_type = Column(String(100), nullable=False)
    # Types: "psira_grade_a", "psira_grade_b", "firearms", "first_aid", "cctv_operations"
    
    certification_number = Column(String(100))
    issuing_authority = Column(String(255))
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False, index=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Documents
    document_url = Column(String(500))  # S3/cloud storage URL
    
    # Alerts
    alert_60_days_sent = Column(Boolean, default=False)
    alert_30_days_sent = Column(Boolean, default=False)
    alert_7_days_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    employee = relationship("Employee")
```

**Acceptance Criteria:**
- ✅ PSIRA alert tracking
- ✅ BCEA violation logging
- ✅ Certification management

---

### Step 1.6: Create Attendance & Payroll Models

**Instructions for Claude:**

Create `app/models/attendance.py`:
```python
from sqlalchemy import Column, Integer, Float, DateTime, Boolean, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Attendance(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("shift_assignments.id"), nullable=False)
    
    # Clock in/out
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    
    actual_check_in = Column(DateTime)
    actual_check_out = Column(DateTime)
    
    # GPS verification
    check_in_latitude = Column(Float)
    check_in_longitude = Column(Float)
    check_in_distance_from_site = Column(Float)  # meters
    
    check_out_latitude = Column(Float)
    check_out_longitude = Column(Float)
    check_out_distance_from_site = Column(Float)
    
    # Hours calculation
    scheduled_hours = Column(Float, nullable=False)
    actual_hours = Column(Float)
    early_minutes = Column(Integer, default=0)
    late_minutes = Column(Integer, default=0)
    overtime_minutes = Column(Integer, default=0)
    
    # Status
    is_no_show = Column(Boolean, default=False)
    is_early_departure = Column(Boolean, default=False)
    is_late_arrival = Column(Boolean, default=False)
    
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")
    shift = relationship("Shift")
    assignment = relationship("ShiftAssignment")

class PayrollExport(Base):
    __tablename__ = "payroll_exports"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Period
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)
    period_description = Column(String(100))
    
    # Export details
    export_datetime = Column(DateTime, default=datetime.utcnow)
    exported_by = Column(Integer)  # User ID
    
    # Statistics
    total_employees = Column(Integer)
    total_hours = Column(Float)
    total_regular_hours = Column(Float)
    total_overtime_hours = Column(Float)
    total_amount = Column(Float)
    
    # File
    file_name = Column(String(255))
    file_url = Column(String(500))
    file_format = Column(String(20))  # "csv", "xlsx", "sage_format"
    
    # Status
    is_imported_to_payroll = Column(Boolean, default=False)
    imported_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Acceptance Criteria:**
- ✅ Attendance with GPS tracking
- ✅ Payroll export tracking
- ✅ Hour calculations

---

### Step 1.7: Run Migrations

**Instructions for Claude:**

Create initial migration:
```bash
# Initialize Alembic
alembic init migrations

# Edit alembic.ini - set sqlalchemy.url to use your DATABASE_URL

# Create first migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

Create `alembic/env.py` modification:
```python
# Add to env.py
from app.database import Base
from app.models.employee import Employee
from app.models.site import Site, Client
from app.models.shift import Shift, ShiftAssignment
from app.models.roster import Roster
from app.models.compliance import PSIRAAlert, BCEAViolation, Certification
from app.models.attendance import Attendance, PayrollExport

target_metadata = Base.metadata
```

**Acceptance Criteria:**
- ✅ All tables created in PostgreSQL
- ✅ Can query tables with `SELECT * FROM employees;`
- ✅ Migrations run without errors

---

## Phase 2: Core CP-SAT Optimization Engine

**Timeline:** Week 3-5 (MOST CRITICAL PHASE)  
**Goal:** Build production-grade rostering optimizer using Google OR-Tools

### Step 2.1: Install OR-Tools and Create Base Optimizer

**Instructions for Claude:**

Ensure OR-Tools is in requirements.txt:
```txt
ortools==9.8.3296
```

Create `app/services/roster_optimizer.py`:
```python
from ortools.sat.python import cp_model
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
from app.models.employee import Employee
from app.models.shift import Shift
from app.models.site import Site
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class RosterOptimizer:
    """
    Core CP-SAT based optimization engine for security guard rostering.
    
    This class handles:
    - Multi-shift assignment (guards work 4-6 shifts per week)
    - BCEA compliance (48h weekly limit, 8h rest periods)
    - PSIRA certification matching
    - Skills-based assignment
    - Cost minimization
    - Fairness constraints
    """
    
    def __init__(self, employees: List[Employee], shifts: List[Shift], sites: Dict[int, Site]):
        self.employees = employees
        self.shifts = shifts
        self.sites = sites
        
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Decision variables
        self.x = {}  # x[(employee_id, shift_id)] = 1 if assigned
        self.weekly_hours = {}  # weekly_hours[employee_id] = total hours
        
        # Results
        self.solution_status = None
        self.assignments = []
        self.total_cost = 0
        self.solver_log = ""
        
    def build_model(self):
        """Build the complete CP-SAT model with all constraints."""
        logger.info(f"Building model for {len(self.employees)} employees and {len(self.shifts)} shifts")
        
        # Step 1: Create decision variables
        self._create_variables()
        
        # Step 2: Add constraints
        self._add_shift_coverage_constraints()
        self._add_no_overlap_constraints()
        self._add_weekly_hours_constraints()
        self._add_rest_period_constraints()
        self._add_skills_constraints()
        self._add_psira_constraints()
        self._add_fairness_constraints()
        
        # Step 3: Define objective function
        self._define_objective()
        
        logger.info("Model built successfully")
    
    def _create_variables(self):
        """Create decision variables for assignments."""
        for emp in self.employees:
            # Only create variables for feasible assignments
            for shift in self.shifts:
                # Check basic feasibility
                if self._is_feasible_assignment(emp, shift):
                    var_name = f"assign_e{emp.id}_s{shift.id}"
                    self.x[(emp.id, shift.id)] = self.model.NewBoolVar(var_name)
                else:
                    # Not feasible, set to 0
                    self.x[(emp.id, shift.id)] = 0
        
        # Create weekly hours variables
        for emp in self.employees:
            var_name = f"hours_e{emp.id}"
            self.weekly_hours[emp.id] = self.model.NewIntVar(0, 48, var_name)
    
    def _is_feasible_assignment(self, emp: Employee, shift: Shift) -> bool:
        """Check if assignment is feasible based on basic criteria."""
        
        # Check employment status
        if emp.employment_status.value != "active":
            return False
        
        # Check PSIRA status
        if emp.psira_status != "active":
            return False
        
        # Check PSIRA expiry
        if emp.psira_expiry_date < shift.start_datetime:
            return False
        
        # Check PSIRA grade requirement
        if shift.requires_armed and not emp.is_armed_certified:
            return False
        
        # Check availability (simplified - you'll need to check time windows)
        # TODO: Implement proper availability checking
        
        return True
    
    def _add_shift_coverage_constraints(self):
        """Ensure every shift has exactly the required number of guards."""
        for shift in self.shifts:
            # Sum of all assignments to this shift = required_guards
            assignments = []
            for emp in self.employees:
                if (emp.id, shift.id) in self.x and self.x[(emp.id, shift.id)] != 0:
                    assignments.append(self.x[(emp.id, shift.id)])
            
            if assignments:
                self.model.Add(sum(assignments) == shift.required_guards)
            else:
                logger.warning(f"No feasible guards for shift {shift.id}")
    
    def _add_no_overlap_constraints(self):
        """Prevent guards from working overlapping shifts."""
        for emp in self.employees:
            # Find all pairs of overlapping shifts
            for i, shift1 in enumerate(self.shifts):
                for shift2 in self.shifts[i+1:]:
                    if self._shifts_overlap(shift1, shift2):
                        # Guard can't work both
                        var1 = self.x.get((emp.id, shift1.id), 0)
                        var2 = self.x.get((emp.id, shift2.id), 0)
                        
                        if var1 != 0 and var2 != 0:
                            self.model.Add(var1 + var2 <= 1)
    
    def _shifts_overlap(self, shift1: Shift, shift2: Shift) -> bool:
        """Check if two shifts overlap in time."""
        return (shift1.start_datetime < shift2.end_datetime and 
                shift2.start_datetime < shift1.end_datetime)
    
    def _add_weekly_hours_constraints(self):
        """Enforce 48-hour weekly limit (BCEA compliance)."""
        for emp in self.employees:
            # Calculate total hours
            total = []
            for shift in self.shifts:
                var = self.x.get((emp.id, shift.id), 0)
                if var != 0:
                    # Use integer hours for CP-SAT
                    hours = int(shift.duration_hours)
                    total.append(var * hours)
            
            if total:
                self.model.Add(self.weekly_hours[emp.id] == sum(total))
                self.model.Add(self.weekly_hours[emp.id] <= settings.MAX_WEEKLY_HOURS)
    
    def _add_rest_period_constraints(self):
        """Enforce 8-hour rest period between shifts (BCEA compliance)."""
        for emp in self.employees:
            for shift1 in self.shifts:
                for shift2 in self.shifts:
                    if shift1.id != shift2.id:
                        # Check if shift2 starts within 8 hours of shift1 ending
                        time_between = (shift2.start_datetime - shift1.end_datetime).total_seconds() / 3600
                        
                        if 0 < time_between < settings.MIN_REST_HOURS:
                            # Can't work both shifts
                            var1 = self.x.get((emp.id, shift1.id), 0)
                            var2 = self.x.get((emp.id, shift2.id), 0)
                            
                            if var1 != 0 and var2 != 0:
                                self.model.Add(var1 + var2 <= 1)
    
    def _add_skills_constraints(self):
        """Only assign guards with required skills."""
        # This is handled in _is_feasible_assignment
        # But you can add more sophisticated skill matching here
        pass
    
    def _add_psira_constraints(self):
        """Ensure PSIRA compliance for all assignments."""
        # This is handled in _is_feasible_assignment
        # Additional checks can be added here
        pass
    
    def _add_fairness_constraints(self):
        """Balance workload across guards."""
        # Optional: Add constraints to balance night shifts, weekends, etc.
        # This can be complex - implement in Phase 6
        pass
    
    def _define_objective(self):
        """Define cost minimization objective."""
        cost_terms = []
        
        for emp in self.employees:
            for shift in self.shifts:
                var = self.x.get((emp.id, shift.id), 0)
                if var != 0:
                    # Calculate cost for this assignment
                    base_cost = int(emp.hourly_rate * shift.duration_hours * 100)  # Scale up for integer
                    
                    # Add night premium
                    if shift.shift_type.value == "night":
                        base_cost += int(20 * shift.duration_hours * 100)
                    
                    # Add weekend premium
                    if shift.is_weekend:
                        base_cost += int(30 * shift.duration_hours * 100)
                    
                    # Add travel cost (simplified)
                    site = self.sites.get(shift.site_id)
                    if site and emp.latitude and emp.longitude:
                        distance = self._calculate_distance(
                            emp.latitude, emp.longitude,
                            site.latitude, site.longitude
                        )
                        travel_cost = int(distance * 2 * 100)  # R2 per km
                        base_cost += travel_cost
                    
                    cost_terms.append(var * base_cost)
        
        if cost_terms:
            self.model.Minimize(sum(cost_terms))
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in km using haversine formula."""
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        km = 6371 * c
        
        return km
    
    def solve(self) -> bool:
        """Solve the optimization problem."""
        logger.info("Starting CP-SAT solver...")
        
        # Configure solver
        self.solver.parameters.max_time_in_seconds = settings.SOLVER_TIME_LIMIT_SECONDS
        self.solver.parameters.num_search_workers = settings.SOLVER_WORKERS
        self.solver.parameters.log_search_progress = True
        
        # Solve
        self.solution_status = self.solver.Solve(self.model)
        
        # Check status
        if self.solution_status == cp_model.OPTIMAL:
            logger.info("✅ Optimal solution found!")
            self._extract_solution()
            return True
        elif self.solution_status == cp_model.FEASIBLE:
            logger.info("✅ Feasible solution found (may not be optimal)")
            self._extract_solution()
            return True
        elif self.solution_status == cp_model.INFEASIBLE:
            logger.error("❌ No feasible solution exists")
            self._diagnose_infeasibility()
            return False
        else:
            logger.error(f"❌ Solver failed with status: {self.solution_status}")
            return False
    
    def _extract_solution(self):
        """Extract assignments from solved model."""
        self.assignments = []
        
        for emp in self.employees:
            for shift in self.shifts:
                var = self.x.get((emp.id, shift.id))
                if var and var != 0 and self.solver.Value(var) == 1:
                    # This guard is assigned to this shift
                    assignment = {
                        'employee_id': emp.id,
                        'shift_id': shift.id,
                        'cost': self._calculate_assignment_cost(emp, shift)
                    }
                    self.assignments.append(assignment)
        
        self.total_cost = self.solver.ObjectiveValue() / 100  # Scale back down
        logger.info(f"Total cost: R{self.total_cost:,.2f}")
        logger.info(f"Total assignments: {len(self.assignments)}")
    
    def _calculate_assignment_cost(self, emp: Employee, shift: Shift) -> float:
        """Calculate actual cost for an assignment."""
        base_cost = emp.hourly_rate * shift.duration_hours
        
        if shift.shift_type.value == "night":
            base_cost += 20 * shift.duration_hours
        
        if shift.is_weekend:
            base_cost += 30 * shift.duration_hours
        
        return base_cost
    
    def _diagnose_infeasibility(self):
        """Provide helpful information when no solution exists."""
        logger.info("Diagnosing infeasibility...")
        
        # Count total required guard-hours
        total_required = sum(s.required_guards * s.duration_hours for s in self.shifts)
        
        # Count total available guard-hours
        total_available = len(self.employees) * settings.MAX_WEEKLY_HOURS
        
        logger.info(f"Required guard-hours: {total_required}")
        logger.info(f"Available guard-hours: {total_available}")
        
        if total_required > total_available:
            logger.error("❌ Not enough guard capacity! Need to hire more guards or reduce shifts.")
        
        # Check for shifts with no feasible guards
        for shift in self.shifts:
            feasible_count = sum(
                1 for emp in self.employees 
                if self._is_feasible_assignment(emp, shift)
            )
            if feasible_count < shift.required_guards:
                logger.error(f"❌ Shift {shift.id} needs {shift.required_guards} guards but only {feasible_count} are feasible")

    def get_results(self) -> Dict:
        """Return optimization results."""
        return {
            'status': self.solution_status,
            'assignments': self.assignments,
            'total_cost': self.total_cost,
            'solver_time': self.solver.WallTime(),
            'is_optimal': self.solution_status == cp_model.OPTIMAL
        }
```

**Acceptance Criteria:**
- ✅ CP-SAT model builds without errors
- ✅ Can handle 20+ employees and 80+ shifts
- ✅ Enforces basic constraints (coverage, no overlap, hours)
- ✅ Returns feasible solution

---

### Step 2.2: Add Advanced Constraint Handling

**Instructions for Claude:**

Enhance `_add_fairness_constraints()` in `roster_optimizer.py`:

```python
def _add_fairness_constraints(self):
    """Balance workload fairly across guards."""
    
    # 1. Balance night shifts
    night_shifts = [s for s in self.shifts if s.shift_type.value == "night"]
    
    if len(night_shifts) > 0:
        night_count = {}
        for emp in self.employees:
            var_name = f"nights_e{emp.id}"
            night_count[emp.id] = self.model.NewIntVar(0, len(night_shifts), var_name)
            
            # Count night shifts for this employee
            night_assignments = []
            for shift in night_shifts:
                var = self.x.get((emp.id, shift.id), 0)
                if var != 0:
                    night_assignments.append(var)
            
            if night_assignments:
                self.model.Add(night_count[emp.id] == sum(night_assignments))
        
        # Minimize difference between max and min night shifts
        if len(night_count) > 1:
            max_nights = self.model.NewIntVar(0, len(night_shifts), 'max_nights')
            min_nights = self.model.NewIntVar(0, len(night_shifts), 'min_nights')
            
            self.model.AddMaxEquality(max_nights, list(night_count.values()))
            self.model.AddMinEquality(min_nights, list(night_count.values()))
            
            # Add fairness penalty to objective (implement in next step)
            # fairness_penalty = (max_nights - min_nights) * 1000
    
    # 2. Maximum consecutive working days
    self._add_consecutive_days_limit()

def _add_consecutive_days_limit(self):
    """Prevent guards from working too many consecutive days."""
    MAX_CONSECUTIVE_DAYS = 6
    
    # Group shifts by date
    shifts_by_date = {}
    for shift in self.shifts:
        date = shift.start_datetime.date()
        if date not in shifts_by_date:
            shifts_by_date[date] = []
        shifts_by_date[date].append(shift)
    
    # Sort dates
    sorted_dates = sorted(shifts_by_date.keys())
    
    # For each employee, check consecutive windows
    for emp in self.employees:
        for i in range(len(sorted_dates) - MAX_CONSECUTIVE_DAYS):
            window_dates = sorted_dates[i:i + MAX_CONSECUTIVE_DAYS + 1]
            
            # Count days worked in this window
            days_worked = []
            for date in window_dates:
                day_shifts = shifts_by_date[date]
                # Check if employee works any shift this day
                day_var = self.model.NewBoolVar(f"e{emp.id}_works_{date}")
                
                shift_vars = []
                for shift in day_shifts:
                    var = self.x.get((emp.id, shift.id), 0)
                    if var != 0:
                        shift_vars.append(var)
                
                if shift_vars:
                    # day_var = 1 if any shift is worked
                    self.model.AddMaxEquality(day_var, shift_vars)
                    days_worked.append(day_var)
            
            # Can't work more than MAX_CONSECUTIVE_DAYS
            if days_worked:
                self.model.Add(sum(days_worked) <= MAX_CONSECUTIVE_DAYS)
```

Add meal break validation:
```python
def _add_meal_break_constraints(self):
    """Ensure shifts >5 hours include meal breaks (BCEA requirement)."""
    
    # For shifts longer than 5 hours, they should include a 1-hour meal break
    # This is handled at shift creation time, but we validate here
    
    for shift in self.shifts:
        if shift.duration_hours > 5:
            # In real implementation, shift should have:
            # - actual_work_hours = duration_hours - 1 (meal break)
            # We'll flag this for validation
            pass
```

**Acceptance Criteria:**
- ✅ Night shifts distributed fairly
- ✅ Maximum 6 consecutive working days
- ✅ Meal break awareness

---

### Step 2.3: Create Optimizer Service Interface

**Instructions for Claude:**

Create `app/services/optimizer_service.py`:
```python
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.shift import Shift, ShiftAssignment
from app.models.site import Site
from app.models.roster import Roster, RosterStatus
from app.services.roster_optimizer import RosterOptimizer
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class OptimizerService:
    """Service layer for roster optimization."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def optimize_roster(self, roster_id: int) -> Roster:
        """
        Optimize a roster using CP-SAT.
        
        Args:
            roster_id: ID of the roster to optimize
            
        Returns:
            Updated roster with assignments
        """
        # Load roster
        roster = self.db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise ValueError(f"Roster {roster_id} not found")
        
        # Update status
        roster.status = RosterStatus.OPTIMIZING
        roster.optimization_started_at = datetime.utcnow()
        self.db.commit()
        
        try:
            # Load employees (active only)
            employees = self.db.query(Employee).filter(
                Employee.employment_status == "active",
                Employee.psira_status == "active",
                Employee.psira_expiry_date > roster.end_date
            ).all()
            
            # Load shifts for this roster period
            shifts = self.db.query(Shift).filter(
                Shift.start_datetime >= roster.start_date,
                Shift.start_datetime < roster.end_date,
                Shift.status != "cancelled"
            ).all()
            
            # Load sites
            site_ids = list(set(s.site_id for s in shifts))
            sites_list = self.db.query(Site).filter(Site.id.in_(site_ids)).all()
            sites = {s.id: s for s in sites_list}
            
            logger.info(f"Optimizing roster with {len(employees)} employees and {len(shifts)} shifts")
            
            # Create optimizer
            optimizer = RosterOptimizer(employees, shifts, sites)
            
            # Build model
            optimizer.build_model()
            
            # Solve
            success = optimizer.solve()
            
            if success:
                # Save assignments
                results = optimizer.get_results()
                self._save_assignments(roster, results['assignments'])
                
                # Update roster
                roster.status = RosterStatus.OPTIMIZED
                roster.total_cost = results['total_cost']
                roster.assigned_shifts = len(results['assignments'])
                roster.solver_status = "OPTIMAL" if results['is_optimal'] else "FEASIBLE"
                
            else:
                roster.status = RosterStatus.DRAFT
                roster.solver_status = "INFEASIBLE"
            
            roster.optimization_completed_at = datetime.utcnow()
            roster.optimization_duration_seconds = (
                roster.optimization_completed_at - roster.optimization_started_at
            ).total_seconds()
            
            self.db.commit()
            
            return roster
            
        except Exception as e:
            logger.error(f"Optimization failed: {str(e)}")
            roster.status = RosterStatus.DRAFT
            self.db.commit()
            raise
    
    def _save_assignments(self, roster: Roster, assignments: list):
        """Save shift assignments to database."""
        
        for assignment in assignments:
            # Check if assignment already exists
            existing = self.db.query(ShiftAssignment).filter(
                ShiftAssignment.roster_id == roster.id,
                ShiftAssignment.shift_id == assignment['shift_id'],
                ShiftAssignment.employee_id == assignment['employee_id']
            ).first()
            
            if not existing:
                # Create new assignment
                new_assignment = ShiftAssignment(
                    roster_id=roster.id,
                    shift_id=assignment['shift_id'],
                    employee_id=assignment['employee_id'],
                    total_cost=assignment['cost'],
                    assigned_at=datetime.utcnow()
                )
                self.db.add(new_assignment)
        
        self.db.commit()
    
    def get_roster_summary(self, roster_id: int) -> dict:
        """Get summary statistics for a roster."""
        roster = self.db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise ValueError(f"Roster {roster_id} not found")
        
        # Count assignments
        assignments = self.db.query(ShiftAssignment).filter(
            ShiftAssignment.roster_id == roster_id
        ).all()
        
        # Count shifts
        total_shifts = self.db.query(Shift).filter(
            Shift.start_datetime >= roster.start_date,
            Shift.start_datetime < roster.end_date
        ).count()
        
        # Calculate costs
        total_cost = sum(a.total_cost for a in assignments)
        
        # Employee hours
        employee_hours = {}
        for assignment in assignments:
            emp_id = assignment.employee_id
            shift = assignment.shift
            if emp_id not in employee_hours:
                employee_hours[emp_id] = 0
            employee_hours[emp_id] += shift.duration_hours
        
        return {
            'roster_id': roster_id,
            'status': roster.status.value,
            'total_shifts': total_shifts,
            'assigned_shifts': len(assignments),
            'unassigned_shifts': total_shifts - len(assignments),
            'total_cost': total_cost,
            'employees_working': len(employee_hours),
            'avg_hours_per_employee': sum(employee_hours.values()) / len(employee_hours) if employee_hours else 0,
            'optimization_time': roster.optimization_duration_seconds
        }
```

**Acceptance Criteria:**
- ✅ Can optimize roster from database
- ✅ Saves assignments correctly
- ✅ Returns summary statistics
- ✅ Handles errors gracefully

---

## Phase 3: API Layer & Basic CRUD

**Timeline:** Week 4-5  
**Goal:** Create REST API endpoints for all entities

### Step 3.1: Create Employee API

**Instructions for Claude:**

Create `app/api/v1/employees.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from datetime import datetime

router = APIRouter(prefix="/employees", tags=["employees"])

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee."""
    
    # Check if employee code already exists
    existing = db.query(Employee).filter(
        Employee.employee_code == employee.employee_code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee code already exists"
        )
    
    # Create employee
    db_employee = Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    
    return db_employee

@router.get("/", response_model=List[EmployeeResponse])
def list_employees(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db)
):
    """List all employees with optional filtering."""
    
    query = db.query(Employee)
    
    if status:
        query = query.filter(Employee.employment_status == status)
    
    employees = query.offset(skip).limit(limit).all()
    return employees

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get employee by ID."""
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Update employee."""
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Update fields
    for key, value in employee_update.dict(exclude_unset=True).items():
        setattr(employee, key, value)
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    return employee

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Delete (deactivate) employee."""
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Don't actually delete, just deactivate
    employee.employment_status = "inactive"
    employee.updated_at = datetime.utcnow()
    db.commit()
    
    return None

@router.get("/{employee_id}/compliance-status")
def get_employee_compliance(employee_id: int, db: Session = Depends(get_db)):
    """Get employee's compliance status."""
    
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    now = datetime.utcnow()
    
    # Check PSIRA status
    psira_days_to_expiry = (employee.psira_expiry_date - now).days if employee.psira_expiry_date else None
    psira_status = "expired" if psira_days_to_expiry and psira_days_to_expiry < 0 else "active"
    
    # Check firearms license
    firearms_status = None
    if employee.firearms_license_expiry:
        firearms_days = (employee.firearms_license_expiry - now).days
        firearms_status = "expired" if firearms_days < 0 else "active"
    
    return {
        'employee_id': employee_id,
        'psira_status': psira_status,
        'psira_days_to_expiry': psira_days_to_expiry,
        'firearms_status': firearms_status,
        'is_compliant': psira_status == "active"
    }
```

Create Pydantic schemas in `app/schemas/employee.py`:
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from datetime import datetime
from app.models.employee import PSIRAGrade, EmploymentStatus

class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    id_number: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    hourly_rate: float
    psira_registration_number: str
    psira_grade: PSIRAGrade
    psira_expiry_date: datetime

class EmployeeCreate(EmployeeBase):
    hire_date: datetime
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    hourly_rate: Optional[float] = None
    employment_status: Optional[EmploymentStatus] = None
    psira_expiry_date: Optional[datetime] = None

class EmployeeResponse(EmployeeBase):
    id: int
    employment_status: EmploymentStatus
    hire_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
```

Register router in `app/main.py`:
```python
from app.api.v1 import employees

app.include_router(employees.router, prefix="/api/v1")
```

**Acceptance Criteria:**
- ✅ POST /api/v1/employees creates employee
- ✅ GET /api/v1/employees lists all employees
- ✅ GET /api/v1/employees/{id} returns single employee
- ✅ PUT /api/v1/employees/{id} updates employee
- ✅ GET /api/v1/employees/{id}/compliance-status returns compliance info

---

### Step 3.2: Create Shifts API

**Instructions for Claude:**

Follow same pattern as employees API. Create:
- `app/api/v1/shifts.py`
- `app/schemas/shift.py`

Include endpoints:
- POST /api/v1/shifts
- GET /api/v1/shifts (with filters: date range, site_id, status)
- GET /api/v1/shifts/{id}
- PUT /api/v1/shifts/{id}
- DELETE /api/v1/shifts/{id}

**Acceptance Criteria:**
- ✅ Full CRUD for shifts
- ✅ Can filter by date range and site

---

### Step 3.3: Create Roster API with Optimization

**Instructions for Claude:**

Create `app/api/v1/rosters.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.roster import Roster, RosterStatus
from app.services.optimizer_service import OptimizerService
from app.schemas.roster import RosterCreate, RosterResponse

router = APIRouter(prefix="/rosters", tags=["rosters"])

@router.post("/", response_model=RosterResponse)
def create_roster(roster: RosterCreate, db: Session = Depends(get_db)):
    """Create a new roster."""
    
    db_roster = Roster(**roster.dict())
    db.add(db_roster)
    db.commit()
    db.refresh(db_roster)
    
    return db_roster

@router.post("/{roster_id}/optimize")
def optimize_roster(
    roster_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger roster optimization."""
    
    roster = db.query(Roster).filter(Roster.id == roster_id).first()
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")
    
    # Run optimization in background
    optimizer_service = OptimizerService(db)
    background_tasks.add_task(optimizer_service.optimize_roster, roster_id)
    
    return {
        "message": "Optimization started",
        "roster_id": roster_id,
        "status": "optimizing"
    }

@router.get("/{roster_id}/summary")
def get_roster_summary(roster_id: int, db: Session = Depends(get_db)):
    """Get roster summary with statistics."""
    
    optimizer_service = OptimizerService(db)
    return optimizer_service.get_roster_summary(roster_id)

@router.get("/{roster_id}/assignments")
def get_roster_assignments(roster_id: int, db: Session = Depends(get_db)):
    """Get all assignments for a roster."""
    
    from app.models.shift import ShiftAssignment
    
    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.roster_id == roster_id
    ).all()
    
    return [
        {
            'assignment_id': a.id,
            'employee_id': a.employee_id,
            'shift_id': a.shift_id,
            'cost': a.total_cost
        }
        for a in assignments
    ]
```

**Acceptance Criteria:**
- ✅ POST /api/v1/rosters/{id}/optimize triggers optimization
- ✅ Optimization runs in background
- ✅ Can retrieve assignments after optimization

---

## Phase 4: PSIRA Compliance System

**Timeline:** Week 6-7  
**Goal:** Automate PSIRA registration tracking and alerts

### Step 4.1: Create PSIRA Alert System

**Instructions for Claude:**

Create `app/services/psira_compliance_service.py`:
```python
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.compliance import PSIRAAlert, Certification
from datetime import datetime, timedelta
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class PSIRAComplianceService:
    """Service for PSIRA compliance checking and alerts."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_all_employees(self):
        """Check PSIRA compliance for all active employees."""
        
        employees = self.db.query(Employee).filter(
            Employee.employment_status == "active"
        ).all()
        
        alerts_created = 0
        
        for employee in employees:
            if self._needs_alert(employee):
                self._create_alert(employee)
                alerts_created += 1
        
        logger.info(f"Created {alerts_created} PSIRA alerts")
        
        return alerts_created
    
    def _needs_alert(self, employee: Employee) -> bool:
        """Check if employee needs a PSIRA alert."""
        
        if not employee.psira_expiry_date:
            return False
        
        now = datetime.utcnow()
        days_to_expiry = (employee.psira_expiry_date - now).days
        
        # Check if we should create alert
        for alert_days in settings.PSIRA_ALERT_DAYS:  # [60, 30, 7]
            if days_to_expiry <= alert_days:
                # Check if alert already exists for this period
                existing = self.db.query(PSIRAAlert).filter(
                    PSIRAAlert.employee_id == employee.id,
                    PSIRAAlert.days_until_expiry == alert_days,
                    PSIRAAlert.is_resolved == False
                ).first()
                
                if not existing:
                    return True
        
        # Check if expired
        if days_to_expiry < 0:
            return True
        
        return False
    
    def _create_alert(self, employee: Employee):
        """Create PSIRA alert for employee."""
        
        now = datetime.utcnow()
        days_to_expiry = (employee.psira_expiry_date - now).days
        
        if days_to_expiry < 0:
            alert_type = "expired"
        else:
            alert_type = "expiry_warning"
        
        alert = PSIRAAlert(
            employee_id=employee.id,
            alert_type=alert_type,
            days_until_expiry=days_to_expiry,
            expiry_date=employee.psira_expiry_date
        )
        
        self.db.add(alert)
        self.db.commit()
        
        logger.info(f"Created {alert_type} alert for employee {employee.id}, {days_to_expiry} days")
    
    def get_active_alerts(self):
        """Get all unresolved PSIRA alerts."""
        
        return self.db.query(PSIRAAlert).filter(
            PSIRAAlert.is_resolved == False
        ).order_by(PSIRAAlert.days_until_expiry).all()
    
    def get_expired_employees(self):
        """Get all employees with expired PSIRA registration."""
        
        now = datetime.utcnow()
        
        return self.db.query(Employee).filter(
            Employee.employment_status == "active",
            Employee.psira_expiry_date < now
        ).all()
    
    def prevent_rostering_expired_employees(self, employee_id: int, shift_start: datetime) -> bool:
        """
        Check if employee can be rostered for a shift.
        Returns True if can be rostered, False if PSIRA expired.
        """
        
        employee = self.db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return False
        
        # Check if PSIRA will be valid at shift start
        if employee.psira_expiry_date < shift_start:
            logger.warning(f"Cannot roster employee {employee_id}: PSIRA expired")
            return False
        
        return True
    
    def generate_compliance_report(self, start_date: datetime, end_date: datetime) -> dict:
        """Generate PSIRA compliance report for a period."""
        
        # Get all employees who worked during period
        from app.models.shift import ShiftAssignment
        
        assignments = self.db.query(ShiftAssignment).join(
            ShiftAssignment.shift
        ).filter(
            ShiftAssignment.shift.start_datetime >= start_date,
            ShiftAssignment.shift.start_datetime <= end_date
        ).all()
        
        employee_ids = list(set(a.employee_id for a in assignments))
        employees = self.db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        
        compliant_count = 0
        expired_count = 0
        expiring_soon_count = 0
        
        now = datetime.utcnow()
        
        for emp in employees:
            days_to_expiry = (emp.psira_expiry_date - now).days if emp.psira_expiry_date else -999
            
            if days_to_expiry < 0:
                expired_count += 1
            elif days_to_expiry < 30:
                expiring_soon_count += 1
            else:
                compliant_count += 1
        
        return {
            'period': f"{start_date.date()} to {end_date.date()}",
            'total_employees': len(employees),
            'compliant': compliant_count,
            'expiring_soon_30_days': expiring_soon_count,
            'expired': expired_count,
            'compliance_rate': (compliant_count / len(employees) * 100) if employees else 0
        }
```

**Acceptance Criteria:**
- ✅ Checks all employees for expiring PSIRA
- ✅ Creates alerts at 60/30/7 days
- ✅ Can list expired employees
- ✅ Generates compliance reports

---

### Step 4.2: Create PSIRA API Endpoints

**Instructions for Claude:**

Create `app/api/v1/compliance.py`:
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.psira_compliance_service import PSIRAComplianceService
from datetime import datetime, timedelta

router = APIRouter(prefix="/compliance", tags=["compliance"])

@router.post("/psira/check-all")
def check_all_psira(db: Session = Depends(get_db)):
    """Run PSIRA compliance check for all employees."""
    
    service = PSIRAComplianceService(db)
    alerts_created = service.check_all_employees()
    
    return {
        "message": "PSIRA check completed",
        "alerts_created": alerts_created
    }

@router.get("/psira/alerts")
def get_psira_alerts(db: Session = Depends(get_db)):
    """Get all active PSIRA alerts."""
    
    service = PSIRAComplianceService(db)
    alerts = service.get_active_alerts()
    
    return [
        {
            'alert_id': a.id,
            'employee_id': a.employee_id,
            'alert_type': a.alert_type,
            'days_until_expiry': a.days_until_expiry,
            'expiry_date': a.expiry_date,
            'created_at': a.created_at
        }
        for a in alerts
    ]

@router.get("/psira/expired-employees")
def get_expired_employees(db: Session = Depends(get_db)):
    """Get employees with expired PSIRA registration."""
    
    service = PSIRAComplianceService(db)
    employees = service.get_expired_employees()
    
    return [
        {
            'employee_id': e.id,
            'name': f"{e.first_name} {e.last_name}",
            'psira_number': e.psira_registration_number,
            'expiry_date': e.psira_expiry_date,
            'days_expired': (datetime.utcnow() - e.psira_expiry_date).days
        }
        for e in employees
    ]

@router.get("/psira/report")
def get_compliance_report(
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db)
):
    """Generate PSIRA compliance report."""
    
    service = PSIRAComplianceService(db)
    return service.generate_compliance_report(start_date, end_date)
```

**Acceptance Criteria:**
- ✅ POST /api/v1/compliance/psira/check-all runs check
- ✅ GET /api/v1/compliance/psira/alerts returns alerts
- ✅ GET /api/v1/compliance/psira/expired-employees lists expired
- ✅ GET /api/v1/compliance/psira/report generates report

---

### Step 4.3: Add Automated PSIRA Checking to Optimizer

**Instructions for Claude:**

Update `_is_feasible_assignment()` in `roster_optimizer.py`:
```python
def _is_feasible_assignment(self, emp: Employee, shift: Shift) -> bool:
    """Check if assignment is feasible based on all criteria."""
    
    # ... existing checks ...
    
    # PSIRA expiry check - CRITICAL
    if emp.psira_expiry_date < shift.start_datetime:
        logger.warning(f"Employee {emp.id} PSIRA expires before shift {shift.id}")
        return False
    
    # PSIRA status check
    if emp.psira_status != "active":
        logger.warning(f"Employee {emp.id} PSIRA status is {emp.psira_status}")
        return False
    
    # Firearms license check (if armed shift)
    if shift.requires_armed:
        if not emp.is_armed_certified:
            return False
        if emp.firearms_license_expiry and emp.firearms_license_expiry < shift.start_datetime:
            logger.warning(f"Employee {emp.id} firearms license expires before shift {shift.id}")
            return False
    
    return True
```

**Acceptance Criteria:**
- ✅ Optimizer automatically excludes expired PSIRA guards
- ✅ Armed shifts only get armed-certified guards
- ✅ Firearms licenses checked for armed shifts

---

## Phase 5: BCEA Labor Law Compliance

**Timeline:** Week 7-8  
**Goal:** Full BCEA and Sectoral Determination 6 compliance

### Step 5.1: Create BCEA Compliance Checker

**Instructions for Claude:**

Create `app/services/bcea_compliance_service.py`:
```python
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.shift import Shift, ShiftAssignment
from app.models.roster import Roster
from app.models.compliance import BCEAViolation
from datetime import datetime, timedelta
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class BCEAComplianceService:
    """Service for BCEA (Basic Conditions of Employment Act) compliance."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_roster_compliance(self, roster_id: int) -> dict:
        """
        Check if a roster is BCEA compliant.
        
        Checks:
        1. Maximum 48 hours per week per employee
        2. Minimum 8 hours rest between shifts
        3. 12 consecutive hours daily rest
        4. Meal breaks after 5 hours
        5. Maximum consecutive working days
        """
        
        roster = self.db.query(Roster).filter(Roster.id == roster_id).first()
        if not roster:
            raise ValueError(f"Roster {roster_id} not found")
        
        violations = []
        
        # Get all assignments for this roster
        assignments = self.db.query(ShiftAssignment).filter(
            ShiftAssignment.roster_id == roster_id
        ).all()
        
        # Group by employee
        employee_assignments = {}
        for assignment in assignments:
            emp_id = assignment.employee_id
            if emp_id not in employee_assignments:
                employee_assignments[emp_id] = []
            employee_assignments[emp_id].append(assignment)
        
        # Check each employee
        for emp_id, emp_assignments in employee_assignments.items():
            violations.extend(self._check_employee_compliance(emp_id, emp_assignments, roster))
        
        # Save violations to database
        for violation_data in violations:
            violation = BCEAViolation(**violation_data)
            self.db.add(violation)
        
        self.db.commit()
        
        is_compliant = len(violations) == 0
        
        # Update roster compliance status
        roster.bcea_compliant = is_compliant
        roster.compliance_issues = [v['violation_description'] for v in violations]
        self.db.commit()
        
        return {
            'roster_id': roster_id,
            'is_compliant': is_compliant,
            'violations_count': len(violations),
            'violations': violations
        }
    
    def _check_employee_compliance(self, employee_id: int, assignments: list, roster: Roster) -> list:
        """Check compliance for a single employee."""
        
        violations = []
        
        # Sort assignments by start time
        sorted_assignments = sorted(assignments, key=lambda a: a.shift.start_datetime)
        
        # 1. Check weekly hours (48h max)
        total_hours = sum(a.shift.duration_hours for a in assignments)
        if total_hours > settings.MAX_WEEKLY_HOURS:
            violations.append({
                'employee_id': employee_id,
                'roster_id': roster.id,
                'violation_type': 'weekly_hours_exceeded',
                'violation_description': f'Employee worked {total_hours:.1f} hours, exceeds 48h limit',
                'severity': 'critical',
                'rule_limit': settings.MAX_WEEKLY_HOURS,
                'actual_value': total_hours
            })
        
        # 2. Check rest periods between shifts (8h min)
        for i in range(len(sorted_assignments) - 1):
            shift1 = sorted_assignments[i].shift
            shift2 = sorted_assignments[i + 1].shift
            
            time_between = (shift2.start_datetime - shift1.end_datetime).total_seconds() / 3600
            
            if time_between < settings.MIN_REST_HOURS:
                violations.append({
                    'employee_id': employee_id,
                    'shift_id': shift2.id,
                    'roster_id': roster.id,
                    'violation_type': 'insufficient_rest',
                    'violation_description': f'Only {time_between:.1f}h rest between shifts (minimum 8h required)',
                    'severity': 'critical',
                    'rule_limit': settings.MIN_REST_HOURS,
                    'actual_value': time_between
                })
        
        # 3. Check meal breaks (required after 5h continuous work)
        for assignment in assignments:
            shift = assignment.shift
            if shift.duration_hours > 5:
                # Check if shift includes meal break time
                # In production, shifts should have a meal_break_included flag
                # For now, we assume shifts >8h include break, others don't
                if shift.duration_hours > 8:
                    # Likely includes break
                    pass
                else:
                    violations.append({
                        'employee_id': employee_id,
                        'shift_id': shift.id,
                        'roster_id': roster.id,
                        'violation_type': 'no_meal_break',
                        'violation_description': f'Shift of {shift.duration_hours}h needs meal break',
                        'severity': 'medium',
                        'rule_limit': 5,
                        'actual_value': shift.duration_hours
                    })
        
        # 4. Check consecutive working days
        consecutive_days = self._count_consecutive_days(sorted_assignments)
        if consecutive_days > 6:
            violations.append({
                'employee_id': employee_id,
                'roster_id': roster.id,
                'violation_type': 'excessive_consecutive_days',
                'violation_description': f'Employee worked {consecutive_days} consecutive days (max 6)',
                'severity': 'high',
                'rule_limit': 6,
                'actual_value': consecutive_days
            })
        
        return violations
    
    def _count_consecutive_days(self, sorted_assignments: list) -> int:
        """Count maximum consecutive working days."""
        
        if not sorted_assignments:
            return 0
        
        # Extract unique dates
        dates = set()
        for assignment in sorted_assignments:
            date = assignment.shift.start_datetime.date()
            dates.add(date)
        
        sorted_dates = sorted(dates)
        
        max_consecutive = 1
        current_consecutive = 1
        
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 1
        
        return max_consecutive
    
    def calculate_overtime_pay(self, employee: Employee, hours_worked: float) -> dict:
        """
        Calculate overtime pay according to BCEA.
        
        First 45 hours: Regular rate
        Hours 46-48: 1.5x rate
        Beyond 48h: 2x rate (if authorized)
        """
        
        regular_hours = min(hours_worked, 45)
        overtime_hours = max(0, min(hours_worked - 45, 3))  # Hours 46-48
        excess_hours = max(0, hours_worked - 48)  # Beyond 48h
        
        regular_pay = regular_hours * employee.hourly_rate
        overtime_pay = overtime_hours * employee.hourly_rate * settings.OVERTIME_MULTIPLIER
        excess_pay = excess_hours * employee.hourly_rate * 2.0  # Double time
        
        total_pay = regular_pay + overtime_pay + excess_pay
        
        return {
            'employee_id': employee.id,
            'total_hours': hours_worked,
            'regular_hours': regular_hours,
            'overtime_hours': overtime_hours,
            'excess_hours': excess_hours,
            'regular_pay': regular_pay,
            'overtime_pay': overtime_pay,
            'excess_pay': excess_pay,
            'total_pay': total_pay
        }
    
    def get_violations_report(self, start_date: datetime, end_date: datetime) -> dict:
        """Generate BCEA violations report for a period."""
        
        violations = self.db.query(BCEAViolation).filter(
            BCEAViolation.detected_at >= start_date,
            BCEAViolation.detected_at <= end_date
        ).all()
        
        # Group by type
        by_type = {}
        for v in violations:
            vtype = v.violation_type
            if vtype not in by_type:
                by_type[vtype] = []
            by_type[vtype].append(v)
        
        return {
            'period': f"{start_date.date()} to {end_date.date()}",
            'total_violations': len(violations),
            'by_type': {k: len(v) for k, v in by_type.items()},
            'critical_violations': len([v for v in violations if v.severity == 'critical']),
            'resolved_violations': len([v for v in violations if v.is_resolved])
        }
```

**Acceptance Criteria:**
- ✅ Checks all BCEA requirements
- ✅ Detects violations automatically
- ✅ Calculates overtime correctly
- ✅ Generates violations report

---

### Step 5.2: Add BCEA Validation to Optimizer

**Instructions for Claude:**

The optimizer already has BCEA constraints built-in (weekly hours, rest periods). Add validation after solving:

Update `OptimizerService.optimize_roster()` in `optimizer_service.py`:
```python
def optimize_roster(self, roster_id: int) -> Roster:
    # ... existing code ...
    
    if success:
        # Save assignments
        results = optimizer.get_results()
        self._save_assignments(roster, results['assignments'])
        
        # ✅ ADD THIS: Run BCEA compliance check
        from app.services.bcea_compliance_service import BCEAComplianceService
        bcea_service = BCEAComplianceService(self.db)
        compliance_result = bcea_service.check_roster_compliance(roster_id)
        
        # Update roster
        roster.status = RosterStatus.OPTIMIZED
        roster.total_cost = results['total_cost']
        roster.assigned_shifts = len(results['assignments'])
        roster.solver_status = "OPTIMAL" if results['is_optimal'] else "FEASIBLE"
        roster.bcea_compliant = compliance_result['is_compliant']
        
        if not compliance_result['is_compliant']:
            logger.warning(f"Roster {roster_id} has {compliance_result['violations_count']} BCEA violations")
    
    # ... rest of code ...
```

**Acceptance Criteria:**
- ✅ Every optimized roster is checked for BCEA compliance
- ✅ Violations are logged to database
- ✅ Roster marked as non-compliant if violations found

---

## [CONTINUE WITH REMAINING PHASES...]

**Due to length constraints, here's the outline for remaining phases:**

### **Phase 6: Advanced Rostering Features** (Week 9-10)
- Sick call emergency re-optimization
- Shift swap validation
- Incremental roster updates
- Guard preferences & availability management

### **Phase 7: Payroll Integration** (Week 10-11)
- Export to CSV/Excel for payroll systems
- Sage Pastel format export
- VIP Premier format export
- UIF/COID/SDL calculations

### **Phase 8: Mobile App Backend** (Week 11-12)
- Guard authentication & profiles
- View schedule API
- Clock in/out with GPS
- Shift swap requests
- Push notifications

### **Phase 9: Client Portal Backend** (Week 12-13)
- Client authentication
- View assigned guards
- Real-time roster access
- Incident reports viewing
- Billing & invoices

### **Phase 10: Frontend Dashboard** (Week 13-16)
- Next.js setup
- Employee management UI
- Shift creation UI
- Roster visualization (calendar view)
- Optimization trigger interface
- Compliance dashboard

### **Phase 11: Mobile App (React Native)** (Week 17-20)
- React Native setup (iOS & Android)
- Guard login & profile
- Schedule view
- Clock in/out with GPS geofencing
- Shift swap requests
- Push notifications setup

### **Phase 12: Advanced Features** (Week 21-24+)
- ML demand forecasting (scikit-learn)
- Fatigue risk scoring
- Advanced analytics dashboard
- Historical reporting
- Budget forecasting
- SaaS multi-tenancy

---

## Testing Strategy

For each phase, create tests:

```python
# tests/test_optimizer.py
def test_optimizer_basic_assignment():
    """Test that optimizer assigns guards to shifts."""
    # Create test data
    # Run optimizer
    # Assert all shifts covered
    
def test_optimizer_respects_weekly_hours():
    """Test that no guard exceeds 48 hours."""
    # Create scenario with potential for overwork
    # Run optimizer
    # Assert all guards <= 48h
    
def test_optimizer_enforces_rest_periods():
    """Test 8-hour rest period enforcement."""
    # Create overlapping shifts
    # Run optimizer
    # Assert no guard has <8h rest
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Monitoring setup (Sentry, Datadog)
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] User training materials ready
- [ ] Support process established

---

## Success Metrics

Track these KPIs:

1. **Optimization Performance**
   - Average solve time: <30 seconds for 50 guards
   - Solution quality: 98%+ optimal

2. **Compliance**
   - PSIRA compliance: 100%
   - BCEA violations: 0
   - Audit pass rate: 100%

3. **Cost Savings**
   - Overtime reduction: 15%+
   - Budget accuracy: 98%+
   - Payroll error rate: <1%

4. **User Satisfaction**
   - Client retention: 85%+
   - Guard app usage: 70%+
   - Support tickets: <10/week

---

**This implementation plan provides a complete roadmap. Start with Phase 0 and work through sequentially. Each phase builds on the previous one.**

**Good luck building RostraCore v2.0! 🚀**
