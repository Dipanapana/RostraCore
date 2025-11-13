# Backend Model Analysis & Roster Generation Issues

## Executive Summary

This document provides a comprehensive analysis of the RostraCore backend models, their relationships, and identifies critical issues that may be preventing roster generation from working correctly.

---

## 1. Core Models Overview

### 1.1 Employee Model (`backend/app/models/employee.py`)

**Primary Key:** `employee_id`

**Key Fields:**
- `first_name`, `last_name` (String, required)
- `id_number` (String, unique, required)
- `role` (Enum: armed, unarmed, supervisor)
- `status` (Enum: active, inactive)
- `hourly_rate` (Float, required)
- `max_hours_week` (Integer, default=48)
- `home_gps_lat`, `home_gps_lng` (Float, nullable)
- `email`, `phone` (String)

**Relationships:**
- `shifts` → One-to-Many with Shift
- `certifications` → One-to-Many with Certification
- `availability` → One-to-Many with Availability
- `skills` → One-to-Many with SkillsMatrix

---

### 1.2 Site Model (`backend/app/models/site.py`)

**Primary Key:** `site_id`

**Key Fields:**
- `client_id` (Foreign Key to clients, nullable)
- `client_name` (String, required)
- `site_name` (String, nullable) - Specific site name
- `required_skill` (String) - Skill required for this site
- `min_staff` (Integer, default=1)
- `shift_pattern` (String) - day/night/12hr
- `billing_rate` (Float)
- `gps_lat`, `gps_lng` (Float, nullable)
- `supervisor_id` (Foreign Key to employees, nullable)

**Relationships:**
- `client` → Many-to-One with Client
- `supervisor` → Many-to-One with Employee
- `shifts` → One-to-Many with Shift
- `shift_templates` → One-to-Many with ShiftTemplate

---

### 1.3 Shift Model (`backend/app/models/shift.py`)

**Primary Key:** `shift_id`

**Key Fields:**
- `site_id` (Foreign Key, required)
- `start_time`, `end_time` (DateTime, required)
- `required_skill` (String, nullable)
- `assigned_employee_id` (Foreign Key to employees, **nullable**)
- `status` (Enum: planned, confirmed, completed, cancelled)
- `is_overtime` (Boolean, default=False)
- `includes_meal_break` (Boolean, default=True)
- `meal_break_duration_minutes` (Integer, default=60)

**Relationships:**
- `site` → Many-to-One with Site
- `employee` → Many-to-One with Employee (can be NULL)
- `attendance` → One-to-One with Attendance
- `shift_assignment` → One-to-One with ShiftAssignment

**Properties:**
- `duration_hours` - Calculates shift duration
- `paid_hours` - Duration minus meal break
- `requires_meal_break` - True if > 5 hours (BCEA compliance)

---

### 1.4 Roster Model (`backend/app/models/roster.py`)

**Primary Key:** `roster_id`

**Key Fields:**
- `roster_code` (String, unique, e.g., "R2025-11-W1")
- `start_date`, `end_date` (DateTime, required)
- `status` (String: draft, optimizing, optimized, published, active, completed, archived)
- `total_shifts`, `assigned_shifts`, `unassigned_shifts` (Integer)
- `total_cost`, `regular_pay_cost`, `overtime_cost` (Float)
- `bcea_compliant`, `psira_compliant` (Boolean)
- `solver_status` (String: optimal, feasible, infeasible)
- `algorithm_used` (String: hungarian, milp, production_cpsat)

**Relationships:**
- `shift_assignments` → One-to-Many with ShiftAssignment

**Properties:**
- `fill_rate` - Percentage of shifts filled (assigned/total)

---

### 1.5 ShiftAssignment Model (`backend/app/models/shift_assignment.py`)

**Primary Key:** `assignment_id`

**Key Fields:**
- `shift_id` (Foreign Key, required)
- `employee_id` (Foreign Key, required)
- `roster_id` (Foreign Key, required)
- `regular_hours`, `overtime_hours` (Float)
- `regular_pay`, `overtime_pay`, `night_premium`, `weekend_premium` (Float)
- `travel_reimbursement`, `total_cost` (Float)
- `is_confirmed` (Boolean)
- `checked_in`, `checked_out` (Boolean)

**Relationships:**
- `shift` → Many-to-One with Shift
- `employee` → Many-to-One with Employee
- `roster` → Many-to-One with Roster

---

### 1.6 Availability Model (`backend/app/models/availability.py`)

**Primary Key:** `avail_id`

**Key Fields:**
- `employee_id` (Foreign Key, required)
- `date` (Date, required)
- `start_time`, `end_time` (Time, required)
- `available` (Boolean, default=True)

**Relationships:**
- `employee` → Many-to-One with Employee

---

### 1.7 Certification Model (`backend/app/models/certification.py`)

**Primary Key:** `cert_id`

**Key Fields:**
- `employee_id` (Foreign Key, required)
- `cert_type` (String, required)
- `issue_date`, `expiry_date` (Date, required)
- `verified` (Boolean, default=False)
- `cert_number`, `issuing_authority` (String)

**Relationships:**
- `employee` → Many-to-One with Employee

---

### 1.8 SkillsMatrix Model (`backend/app/models/skills_matrix.py`)

**Primary Key:** `skill_id`

**Key Fields:**
- `employee_id` (Foreign Key, required)
- `skill_name` (String, required) - e.g., armed response, driver, dog handler
- `proficiency_level` (String) - beginner, intermediate, expert
- `certified` (Boolean, default=False)
- `cert_expiry_date` (Date, nullable)

**Relationships:**
- `employee` → Many-to-One with Employee

---

### 1.9 Client Model (`backend/app/models/client.py`)

**Primary Key:** `client_id`

**Key Fields:**
- `org_id` (Foreign Key to organizations, required)
- `client_name` (String, required)
- `contact_person`, `contact_email`, `contact_phone` (String)
- `billing_rate` (Numeric)
- `status` (String: active, inactive, suspended)

**Relationships:**
- `organization` → Many-to-One with Organization
- `sites` → One-to-Many with Site

---

## 2. Entity Relationship Diagram

```
Organization
    └── Client (Many-to-One)
            └── Site (One-to-Many)
                    ├── Shift (One-to-Many)
                    │       ├── ShiftAssignment (One-to-One)
                    │       │           └── Roster (Many-to-One)
                    │       └── Employee (Many-to-One) [assigned_employee_id]
                    └── ShiftTemplate (One-to-Many)

Employee
    ├── Shift (One-to-Many) [assigned_employee_id]
    ├── Certification (One-to-Many)
    ├── Availability (One-to-Many)
    ├── SkillsMatrix (One-to-Many)
    ├── Attendance (One-to-Many)
    ├── LeaveRequest (One-to-Many)
    └── Expense (One-to-Many)
```

---

## 3. CRITICAL ISSUES IDENTIFIED

### 🔴 ISSUE #1: Dual Tracking System for Shift Assignments

**Problem:** There are TWO ways shifts are tracked as "assigned":

1. **Shift.assigned_employee_id** (nullable field in shifts table)
2. **ShiftAssignment** table (separate assignment tracking)

**Impact:** This creates confusion and potential data inconsistency:
- When roster generation creates ShiftAssignment records, does it also update Shift.assigned_employee_id?
- Queries for "unassigned shifts" look for `Shift.assigned_employee_id == None`
- But the ShiftAssignment table might have assignments that aren't reflected in the Shift table

**Location:**
- `backend/app/models/shift.py` line 27
- `backend/app/models/shift_assignment.py` lines 20-22

**Recommendation:**
- **Option A:** Use ONLY ShiftAssignment table and remove assigned_employee_id from Shift
- **Option B:** Keep assigned_employee_id but ensure it's ALWAYS synced with ShiftAssignment records
- **Option C:** Make assigned_employee_id a computed property that queries ShiftAssignment

---

### 🔴 ISSUE #2: Certification Validation Logic is Backwards

**Problem:** In `backend/app/algorithms/constraints.py` line 58:

```python
return len(certifications) == 0  # No certs required
```

**Logic Flow:**
1. If `required_cert_type` is specified and NO matching valid cert found → Returns False ✅
2. If ANY certification is valid → Returns True ✅
3. **If employee has ZERO certifications → Returns True** ❌

**Impact:** Employees with NO certifications at all pass the certification check! This is likely wrong - security guards typically MUST have PSIRA certification.

**Location:** `backend/app/algorithms/constraints.py` line 58

**Recommendation:**
```python
# Should probably be:
return False  # No certifications = not eligible

# OR if certifications are truly optional:
return True  # Explicitly allow employees without certs
```

---

### 🔴 ISSUE #3: Skills Not Fully Utilized

**Problem:** In roster generation (`backend/app/algorithms/roster_generator.py` line 128):

```python
"skills": [e.role.value],  # Basic: role is the main skill
```

The employee's skills are hardcoded to ONLY their role (armed/unarmed/supervisor), but there's a separate **SkillsMatrix** table that stores additional skills (driver, dog handler, etc.) that's **completely ignored**.

**Impact:** Skill matching is incomplete - employees with specialized skills in SkillsMatrix are not being matched to shifts requiring those skills.

**Location:** `backend/app/algorithms/roster_generator.py` line 128

**Recommendation:**
```python
# Query SkillsMatrix and include all skills
employee_skills = [skill.skill_name for skill in e.skills]
"skills": [e.role.value] + employee_skills,
```

---

### 🟡 ISSUE #4: Overly Permissive Availability Check

**Problem:** In `backend/app/algorithms/roster_generator.py` lines 344-346:

```python
if not availability_records:
    # No availability records = assume available
    return True
```

**Impact:** If an employee has NO availability records at all, they're assumed to be available for ANY shift. This might be too permissive - it should perhaps return False or require explicit "always available" flag.

**Location:** `backend/app/algorithms/roster_generator.py` lines 344-346

**Recommendation:**
- Add an `always_available` flag to Employee model
- OR require at least one availability record
- OR make this configurable

---

### 🟡 ISSUE #5: GPS Validation Bypassed

**Problem:** Multiple locations skip distance checks if GPS is missing:

```python
if not employee.get("home_gps_lat") or not shift.get("site"):
    return 0.0  # Distance = 0
```

**Impact:** Employees without GPS coordinates can be assigned to ANY site, regardless of actual distance. This could result in impractical assignments.

**Location:**
- `backend/app/algorithms/roster_generator.py` line 300
- `backend/app/algorithms/constraints.py` line 153

**Recommendation:**
- Require GPS coordinates for employees and sites
- OR make distance constraint optional via config flag
- OR return a high penalty value instead of 0

---

### 🟡 ISSUE #6: No Relationship Between Site.required_skill and Shift.required_skill

**Problem:** Both Site and Shift have a `required_skill` field:
- `Site.required_skill` (site-level requirement)
- `Shift.required_skill` (shift-specific requirement)

**Clarification Needed:**
- Are these meant to be the same?
- Does Shift.required_skill override Site.required_skill?
- Should shifts inherit site's required skill if not specified?

**Location:**
- `backend/app/models/site.py` line 33
- `backend/app/models/shift.py` line 26

**Recommendation:**
- Document the relationship clearly
- Consider making Shift.required_skill default to Site.required_skill
- Or enforce that they must match

---

## 4. Data Flow for Roster Generation

### Step-by-Step Process:

1. **Query Unassigned Shifts**
   - Finds shifts where `Shift.assigned_employee_id == None`
   - Filters by date range and optional site IDs

2. **Query Available Employees**
   - Gets all employees with `status == ACTIVE`
   - Extracts role as primary skill (MISSING SkillsMatrix data!)

3. **Generate Feasible Pairs**
   - For each employee-shift combination, checks:
     - ✅ Skill match (employee.role vs shift.required_skill)
     - ⚠️ Certification validity (BROKEN LOGIC)
     - ✅ Availability window
     - ✅ Weekly hour limits
     - ✅ Rest period between shifts
     - ⚠️ Distance constraint (BYPASSED if GPS missing)

4. **Optimize Assignments**
   - Uses Hungarian Algorithm (linear_sum_assignment)
   - Minimizes total cost (hourly_rate × hours + distance penalty)
   - **Returns empty list if no feasible pairs exist**

5. **Create Assignments**
   - Creates ShiftAssignment records
   - ❓ Does NOT update Shift.assigned_employee_id (POTENTIAL BUG)

---

## 5. Why Roster Generation Might Be Failing

### Most Likely Causes (in order of probability):

1. **No Feasible Pairs Generated** ⭐⭐⭐⭐⭐
   - Certification check is too strict (Issue #2)
   - All employees fail certification validation
   - Result: Empty feasible_pairs list → No assignments

2. **Skills Not Matching** ⭐⭐⭐⭐
   - Shifts require skills not in employee.role
   - SkillsMatrix is ignored (Issue #3)
   - Result: Skill check fails for all employees

3. **No Active Employees** ⭐⭐⭐
   - All employees have status=INACTIVE
   - Or no employees exist in database

4. **GPS Coordinates Missing** ⭐⭐
   - If distance check is critical and GPS is missing
   - (But currently this returns True, so less likely)

5. **Availability Too Restrictive** ⭐⭐
   - If employees have very limited availability windows
   - Shifts fall outside all availability blocks

6. **Dual Tracking Confusion** ⭐
   - Shifts already marked as "assigned" in Shift table
   - But no ShiftAssignment records exist
   - Query for unassigned shifts returns empty

---

## 6. Recommended Fixes (Priority Order)

### HIGH PRIORITY

1. **Fix Certification Logic**
   ```python
   # backend/app/algorithms/constraints.py line 58
   # Change to:
   if not certifications:
       return False  # Require at least one certification
   return False  # No valid certs found
   ```

2. **Include SkillsMatrix in Skill Matching**
   ```python
   # backend/app/algorithms/roster_generator.py line 128
   employee_skills = [e.role.value]
   if hasattr(e, 'skills') and e.skills:
       employee_skills.extend([skill.skill_name for skill in e.skills])
   ```

3. **Sync Shift.assigned_employee_id with ShiftAssignment**
   - When creating ShiftAssignment, also update Shift.assigned_employee_id
   - Or remove the field entirely and use joins

### MEDIUM PRIORITY

4. **Make Availability Check Configurable**
   - Add `allow_without_availability` config flag
   - Document the behavior clearly

5. **Improve GPS Handling**
   - Log warning when GPS is missing
   - Make distance constraint optional
   - Consider returning penalty value instead of 0

6. **Clarify Site vs Shift required_skill**
   - Document relationship
   - Add validation to ensure consistency

### LOW PRIORITY

7. **Add Testing Mode Configuration**
   - Make SKIP_CERTIFICATION_CHECK a proper config setting
   - Add other testing mode flags
   - Document testing mode behavior

---

## 7. Testing Recommendations

### Debug Checklist:

1. **Check Employee Data**
   ```sql
   SELECT COUNT(*) FROM employees WHERE status = 'active';
   SELECT employee_id, first_name, last_name, role FROM employees LIMIT 5;
   ```

2. **Check Shift Data**
   ```sql
   SELECT COUNT(*) FROM shifts WHERE assigned_employee_id IS NULL;
   SELECT shift_id, site_id, start_time, required_skill FROM shifts LIMIT 5;
   ```

3. **Check Certifications**
   ```sql
   SELECT employee_id, cert_type, expiry_date, verified
   FROM certifications
   WHERE expiry_date > CURRENT_DATE;
   ```

4. **Check Skills Matrix**
   ```sql
   SELECT employee_id, skill_name, certified
   FROM skills_matrix;
   ```

5. **Test Roster Generation with Logging**
   - Add debug logging to each constraint check
   - Log number of feasible pairs found
   - Log why pairs are rejected

---

## 8. Model Relationship Issues

### Additional Observations:

1. **Client ↔ Site Relationship**
   - Site has both `client_id` (FK) and `client_name` (redundant)
   - `client_name` marked as "kept for backward compatibility"
   - Should eventually migrate to use client_id exclusively

2. **Supervisor Tracking**
   - Site has `supervisor_id` (FK to employees)
   - But no reverse relationship on Employee
   - Consider adding `supervised_sites` relationship

3. **Multiple Attendance Systems**
   - Attendance table exists
   - ShiftAssignment also tracks check-in/out
   - Potential duplication of data

---

## 9. Configuration Settings Referenced

From `app.config.settings`:

- `MAX_HOURS_WEEK` - Maximum hours per week (default 48)
- `MIN_REST_HOURS` - Minimum rest between shifts (default 8)
- `OT_MULTIPLIER` - Overtime rate multiplier (default 1.5)
- `MAX_DISTANCE_KM` - Maximum travel distance (default 50)

**Note:** No `SKIP_CERTIFICATION_CHECK` found in config - this is hardcoded or missing.

---

## 10. Next Steps

1. **Immediate:** Fix certification validation logic
2. **Short-term:** Include SkillsMatrix in skill matching
3. **Medium-term:** Resolve dual tracking of assignments
4. **Long-term:** Comprehensive testing suite for roster generation

---

**Document Version:** 1.0
**Date:** 2025-11-13
**Author:** Claude Code Analysis
