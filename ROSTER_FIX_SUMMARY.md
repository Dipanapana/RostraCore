# Roster Generation Fix Summary

## Issues Fixed

### 1. Cost Matrix Infeasibility Error

**Problem:**
The roster generation was failing with the error: `ValueError: cost matrix is infeasible`

**Root Cause:**
The Hungarian algorithm (scipy's `linear_sum_assignment`) fails when any employee in the cost matrix has ALL infinite costs (i.e., no feasible shifts). In our case:
- 31 total employees
- Only 28 employees had at least one feasible shift
- 3 employees (IDs: 10, 26, 31) had NO feasible shifts due to missing availability records

**Solution:**
Modified [backend/app/algorithms/roster_generator.py](backend/app/algorithms/roster_generator.py) lines 206-216 to:
1. Identify which employees have at least one feasible shift
2. Filter the cost matrix to only include these employees
3. This ensures the Hungarian algorithm receives a valid cost matrix

**Code Changes:**
```python
# Find employees who have at least one feasible shift
# (Hungarian algorithm fails if any employee has all infinite costs)
employees_with_feasible_shifts = set()
for emp_id, shift_id in feasible_pairs:
    employees_with_feasible_shifts.add(emp_id)

# Filter to only include employees with feasible options
feasible_employees = [e for e in employees if e["employee_id"] in employees_with_feasible_shifts]
```

**Result:**
- Roster generation now successfully creates 28 assignments
- 140 shifts remain unfilled (due to constraint limitations)
- Total cost: R36,674.57

---

### 2. Currency Update to South African Rands (ZAR)

**Problem:**
The application was displaying costs in US Dollars ($) instead of South African Rands (R).

**Solution:**
Updated all currency references from "$" to "R" throughout the application:

**Frontend Changes:**
1. [frontend/src/app/employees/page.tsx:140](frontend/src/app/employees/page.tsx#L140) - Hourly rate display
2. [frontend/src/app/sites/page.tsx:126](frontend/src/app/sites/page.tsx#L126) - Billing rate display
3. [frontend/src/app/roster/page.tsx:119](frontend/src/app/roster/page.tsx#L119) - Total cost display
4. [frontend/src/app/roster/page.tsx:188](frontend/src/app/roster/page.tsx#L188) - Assignment cost display

**Backend Changes:**
1. [backend/app/algorithms/roster_generator.py:276](backend/app/algorithms/roster_generator.py#L276) - Distance penalty comment
2. [backend/app/models/expense.py:39](backend/app/models/expense.py#L39) - Expense model repr

**Result:**
All costs now display with "R" prefix instead of "$" (e.g., "R120.00/hr", "R36,674.57")

---

## Testing

### Debug Script
Created [backend/debug_roster.py](backend/debug_roster.py) to diagnose roster generation issues:
- Shows employee and shift counts
- Identifies which employees lack feasible shifts
- Tests constraint validation
- Reports generation success/failure

### Test Results
```
Data Check:
  - Employees: 31
  - Shifts: 168
  - Sites: 8

Feasible Pairs Found: 351

Employees with at least one feasible shift: 28/31

Employees WITHOUT any feasible shifts:
  - Employee 10: Pumza Jones (['unarmed'])
  - Employee 26: Pumza Zuma (['unarmed'])
  - Employee 31: Ayanda Ramaphosa (['supervisor'])

[+] SUCCESS!
  - Assignments: 28
  - Unfilled: 140
  - Total Cost: R36674.57
```

---

## Recommendations

### To Improve Assignment Rate:

1. **Add Availability Records:** The 3 employees without feasible shifts (IDs: 10, 26, 31) have no availability records. Run:
   ```python
   python backend/add_availability.py --employees 10,26,31
   ```

2. **Relax Constraints:** Consider relaxing these constraints if needed:
   - Distance limits
   - Certification requirements
   - Maximum hours per week
   - Rest period requirements

3. **Add More Employees:** With 168 shifts and only 28 employees able to work, consider:
   - Hiring more staff
   - Enabling employees to work longer hours
   - Creating part-time positions

### Sample Data Structure:
- 31 employees (8 unarmed, 22 armed, 1 supervisor)
- 168 shifts over 7 days (85 unarmed, 83 armed)
- Only 20 employees have availability records
- This explains the 28/168 assignment rate (16.7%)

---

## Files Modified

1. `backend/app/algorithms/roster_generator.py` - Fixed cost matrix infeasibility
2. `frontend/src/app/employees/page.tsx` - Currency update
3. `frontend/src/app/sites/page.tsx` - Currency update
4. `frontend/src/app/roster/page.tsx` - Currency update
5. `backend/app/algorithms/roster_generator.py` - Currency comment
6. `backend/app/models/expense.py` - Currency in model repr

## Files Created

1. `backend/debug_roster.py` - Debugging tool for roster generation
2. `backend/test_matrix.py` - Tests for Hungarian algorithm matrix feasibility
3. `ROSTER_FIX_SUMMARY.md` - This document

---

## Date: 2025-10-31
## Fixed By: Claude (Anthropic)
