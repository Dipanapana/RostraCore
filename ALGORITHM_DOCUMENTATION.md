# 🧮 RostraCore Roster Generation Algorithms
## Complete Step-by-Step Explanation

**Last Updated:** 2025-11-13
**Purpose:** Detailed explanation of all roster generation algorithms for absolute beginners
**Skill Level:** Beginner-friendly (no prior algorithm knowledge required)

---

## 📋 Table of Contents

1. [Overview - What is Roster Generation?](#1-overview---what-is-roster-generation)
2. [The Three Algorithms](#2-the-three-algorithms)
3. [Algorithm 1: Hungarian Algorithm (Basic)](#3-algorithm-1-hungarian-algorithm-basic)
4. [Algorithm 2: CP-SAT Optimizer (Production)](#4-algorithm-2-cp-sat-optimizer-production)
5. [Constraints Module (The Rules)](#5-constraints-module-the-rules)
6. [Complete Example Walkthrough](#6-complete-example-walkthrough)
7. [Common Issues and Solutions](#7-common-issues-and-solutions)

---

## 1. Overview - What is Roster Generation?

### The Problem

Imagine you own a security company:
- You have **15 security guards** (employees)
- You have **5 client sites** that need guarding
- You need to create **50 shifts** next week
- Each shift needs exactly 1 guard
- Guards have skills (armed, unarmed, supervisor)
- Guards have certifications (PSIRA) that expire
- Guards can only work so many hours per week
- Guards need rest between shifts

**The Question:** Which guard should work which shift to minimize cost while following all the rules?

This is called the "**Assignment Problem**" and it's what our algorithms solve.

---

## 2. The Three Algorithms

RostraCore has 3 different algorithms to solve this problem:

### Algorithm Comparison

| Algorithm | Speed | Quality | When to Use |
|-----------|-------|---------|-------------|
| **Hungarian** | ⚡ Fast (seconds) | ⭐ Good | Testing, small rosters (< 100 shifts) |
| **CP-SAT** | 🐢 Slower (minutes) | ⭐⭐⭐ Excellent | Production, large rosters (100+ shifts) |
| **MILP** | 🐌 Slowest | ⭐⭐ Better | Experimental (not used in production) |

**We'll focus on Hungarian (simple) and CP-SAT (production) because these are the ones you'll use.**

---

## 3. Algorithm 1: Hungarian Algorithm (Basic)

**File:** `backend/app/algorithms/roster_generator.py`
**Class:** `RosterGenerator`

### What It Does

The Hungarian Algorithm finds the cheapest way to assign employees to shifts. Think of it like this:

```
Shifts:    [Shift A] [Shift B] [Shift C]
           /    |    \    |    /
Employees: [John]  [Mary]  [Peter]
Cost:      R400    R350    R450
```

It finds the combination that costs the least while following all the rules.

---

### Step-by-Step Process

#### STEP 1: Load Data (`_get_unassigned_shifts` and `_get_available_employees`)

**What happens:**
```python
def generate_roster(self, start_date, end_date, site_ids):
    # Step 1: Get unassigned shifts
    shifts = self._get_unassigned_shifts(start_date, end_date, site_ids)

    # Step 2: Get available employees
    employees = self._get_available_employees()
```

**Example:**
```
Found 50 unassigned shifts:
  - Shift 1: Site A, Nov 15 08:00-16:00, needs "unarmed"
  - Shift 2: Site B, Nov 15 16:00-00:00, needs "armed"
  - Shift 3: Site A, Nov 16 08:00-16:00, needs "unarmed"
  ...

Found 15 active employees:
  - Employee 1: John Doe, unarmed guard, R45/hr
  - Employee 2: Mary Smith, armed guard, R55/hr
  - Employee 3: Peter Jones, supervisor, R65/hr
  ...
```

**What `_get_unassigned_shifts` does:**
```python
def _get_unassigned_shifts(self, start_date, end_date, site_ids):
    # Query database for shifts that don't have an employee yet
    query = self.db.query(Shift).filter(
        Shift.start_time >= start_date,
        Shift.start_time < end_date,
        Shift.assigned_employee_id == None  # ← No employee assigned yet!
    )

    # Return list of shift dictionaries with all info we need
    return [{
        "shift_id": s.shift_id,
        "site_id": s.site_id,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "required_skill": s.effective_required_skill,  # "unarmed", "armed", etc.
        "site": {
            "gps_lat": s.site.gps_lat,
            "gps_lng": s.site.gps_lng
        }
    } for s in shifts]
```

**What `_get_available_employees` does:**
```python
def _get_available_employees(self):
    # Query database for active employees only
    employees = self.db.query(Employee).filter(
        Employee.status == EmployeeStatus.ACTIVE
    ).all()

    # Return list with employee info + skills + certifications
    return [{
        "employee_id": e.employee_id,
        "first_name": e.first_name,
        "last_name": e.last_name,
        "role": e.role,  # unarmed, armed, supervisor
        "hourly_rate": e.hourly_rate,  # R45.00
        "max_hours_week": e.max_hours_week,  # 48 hours
        "skills": self._get_employee_skills(e),  # ["unarmed", "driver"]
        "certifications": [{
            "cert_type": "PSIRA Grade E",
            "expiry_date": "2026-12-31",
            "verified": True
        }]
    } for e in employees]
```

**NEW: The SkillsMatrix Integration**
```python
def _get_employee_skills(self, employee):
    # Start with role as primary skill
    skills = [employee.role.value]  # e.g., ["unarmed"]

    # FIXED: Add skills from SkillsMatrix table
    if hasattr(employee, 'skills') and employee.skills:
        for skill in employee.skills:
            if skill.skill_name and skill.skill_name not in skills:
                skills.append(skill.skill_name)

    # Now employee might have: ["unarmed", "driver", "first_aid"]
    return skills
```

---

#### STEP 2: Generate Feasible Pairs (`_generate_feasible_pairs`)

**What happens:**

Now we check: "Can this employee work this shift?"

```python
feasible_pairs = self._generate_feasible_pairs(shifts, employees)
```

**The Algorithm:**
```
FOR each employee:
    FOR each shift:
        ✓ Does employee have required skill?
        ✓ Does employee have valid certification?
        ✓ Is employee available at that time?
        ✓ Would this exceed weekly hour limit?
        ✓ Has employee had enough rest since last shift?
        ✓ Is employee close enough to the site?

        IF all checks pass:
            ADD (employee, shift) to feasible_pairs
```

**Example:**
```
Checking: Can John work Shift 1?
  ✓ Skill match: John is "unarmed", shift needs "unarmed" → PASS
  ✓ Certification: John has PSIRA valid until 2026 → PASS
  ✓ Availability: John is available Nov 15 08:00-16:00 → PASS
  ✓ Hours: John has worked 32hrs this week, shift is 8hrs, 32+8=40 < 48 → PASS
  ✓ Rest: John's last shift ended Nov 14 at 18:00, this starts Nov 15 08:00 = 14hrs rest → PASS
  ✓ Distance: John lives 15km from site, max is 50km → PASS

  → (John, Shift 1) is FEASIBLE! Add to list.

Checking: Can Mary work Shift 1?
  ✗ Skill match: Mary is "armed", shift needs "unarmed" → FAIL

  → (Mary, Shift 1) is NOT feasible.

Checking: Can John work Shift 2?
  ✗ Skill match: John is "unarmed", shift needs "armed" → FAIL

  → (John, Shift 2) is NOT feasible.

... repeat for all combinations ...

Result: 250 feasible pairs out of 750 total combinations (50 shifts × 15 employees)
```

**The Code:**
```python
def _generate_feasible_pairs(self, shifts, employees):
    feasible_pairs = []

    for employee in employees:
        employee_id = employee["employee_id"]
        current_hours = self._get_employee_hours_this_week(employee_id)

        for shift in shifts:
            shift_id = shift["shift_id"]

            # Run all 6 constraint checks
            if (self._check_skill_match(employee, shift) and
                self._check_certification_valid(employee, shift) and
                self._check_availability(employee, shift) and
                self._check_hour_limits(employee, shift, current_hours) and
                self._check_rest_period(employee, shift) and
                self._check_distance(employee, shift)):

                # All checks passed!
                feasible_pairs.append((employee_id, shift_id))

    return feasible_pairs
```

---

#### STEP 3: Optimize Assignments (`_optimize_assignments`)

**What happens:**

Now we have 250 possible assignments. But we want the **cheapest** combination.

```python
optimal_assignments = self._optimize_assignments(shifts, employees, feasible_pairs)
```

**The Hungarian Algorithm** solves this using a **cost matrix**:

```
         Shift 1    Shift 2    Shift 3
John     R360       ∞          R370
Mary     ∞          R440       ∞
Peter    R520       R550       R530

∞ = Impossible (not feasible)
```

**How it works:**

1. **Build the Cost Matrix**
   ```python
   # Create matrix filled with infinity (impossible)
   cost_matrix = np.full((n_employees, n_shifts), np.inf)

   # Fill in feasible pairs with actual costs
   for emp_id, shift_id in feasible_pairs:
       cost = employee_hourly_rate × shift_hours + distance_penalty
       cost_matrix[emp_idx, shift_idx] = cost
   ```

2. **Run Hungarian Algorithm**
   ```python
   from scipy.optimize import linear_sum_assignment

   # This finds the minimum cost assignment
   row_ind, col_ind = linear_sum_assignment(cost_matrix)
   ```

3. **Extract Assignments**
   ```python
   assignments = []
   for emp_idx, shift_idx in zip(row_ind, col_ind):
       if cost_matrix[emp_idx, shift_idx] < np.inf:
           assignments.append({
               "employee_id": employees[emp_idx]["employee_id"],
               "shift_id": shifts[shift_idx]["shift_id"],
               "cost": cost_matrix[emp_idx, shift_idx]
           })
   ```

**Example Result:**
```
Optimal Assignments:
  - John → Shift 1 (Cost: R360)
  - Mary → Shift 2 (Cost: R440)
  - Peter → Shift 3 (Cost: R530)

  Total Cost: R1,330
```

**Why this is optimal:**

The Hungarian Algorithm guarantees this is the **cheapest possible** assignment. Any other combination would cost more:

```
Alternative 1:
  - John → Shift 3 (R370)
  - Mary → Shift 2 (R440)
  - Peter → Shift 1 (R520)
  Total: R1,330  ← Same cost!

Alternative 2:
  - Peter → Shift 1 (R520)
  - Mary → Shift 2 (R440)
  - Peter → Shift 3 (R530)
  Total: R1,490  ← More expensive! ✗
```

---

#### STEP 4: Calculate Summary (`_calculate_roster_summary`)

**What happens:**

Now we calculate statistics about the roster:

```python
roster_summary = self._calculate_roster_summary(
    optimal_assignments, employees, shifts
)
```

**Example Output:**
```python
{
    "total_cost": 15000.00,
    "total_shifts_filled": 45,
    "average_cost_per_shift": 333.33,
    "fill_rate": 90.0,  # 45 out of 50 shifts filled
    "employees_utilized": 12,  # 12 out of 15 employees used
    "employee_hours": {
        1: 40.0,  # John worked 40 hours
        2: 32.0,  # Mary worked 32 hours
        ...
    }
}
```

---

### Limitations of Hungarian Algorithm

**Problem:** It's a "greedy" one-time assignment. It doesn't consider:
- Balance between employees (one person might get all night shifts)
- Future shifts (might assign someone now when they're needed more later)
- Multi-shift constraints (can't work 2 shifts on same day even if times don't overlap)

**Solution:** Use CP-SAT for production!

---

## 4. Algorithm 2: CP-SAT Optimizer (Production)

**File:** `backend/app/algorithms/production_optimizer.py`
**Class:** `ProductionRosterOptimizer`

### What It Does

CP-SAT is a **Constraint Programming** solver. Instead of just minimizing cost, it:
- Enforces BCEA (South African labor law) compliance
- Balances workload fairly across all employees
- Handles multi-week rosters
- Considers consecutive day limits
- Optimizes for both cost AND fairness

Think of it as a much smarter version of Hungarian that plays "chess" with assignments.

---

### Step-by-Step Process

#### STEP 1: Load Data (`_load_data`)

Same as Hungarian, but also:
- Groups shifts by date
- Calculates week numbers
- Loads site information

```python
def optimize(self, start_date, end_date, site_ids):
    # Step 1: Load all data
    self._load_data(start_date, end_date, site_ids)
```

**Example:**
```
Loaded:
  - 50 shifts
  - 15 employees
  - 5 sites
  - Shifts grouped by date:
      Nov 15: 10 shifts
      Nov 16: 10 shifts
      Nov 17: 10 shifts
      ...
  - Weeks: [46, 47]  # ISO week numbers
```

---

#### STEP 2: Build Feasibility Matrix (`_build_feasibility_matrix`)

Similar to Hungarian, but returns **detailed diagnostics**:

```python
def _check_feasibility(self, emp, shift):
    reasons = []

    # Check skill match
    if not settings.SKIP_SKILL_MATCHING:
        if not self._check_skill_match(emp, shift):
            reasons.append(f"Skill mismatch: employee has {emp.role.value}, shift needs {shift.required_skill}")

    # Check certifications
    if not settings.SKIP_CERTIFICATION_CHECK:
        if not self._check_certifications(emp, shift):
            reasons.append("Invalid or expired certifications")

    # ... more checks ...

    # Calculate cost if feasible
    cost = 0.0
    if not reasons:
        cost = self._calculate_assignment_cost(emp, shift, distance_km)

    return FeasibilityCheck(
        is_feasible=len(reasons) == 0,
        reasons=reasons,
        cost=cost
    )
```

**Example Output:**
```
Feasibility Matrix Built:
  - Total pairs: 750 (50 shifts × 15 employees)
  - Feasible pairs: 250 (33.3%)
  - Infeasible pairs: 500 (66.7%)

Top infeasibility reasons:
  - Skill mismatch: 300 violations
  - Invalid certifications: 150 violations
  - Distance too far: 50 violations
```

---

#### STEP 3: Create Decision Variables (`_create_variables`)

**This is where CP-SAT gets powerful!**

CP-SAT creates **binary variables** (0 or 1) for every possible assignment:

```python
# Assignment variables: x[emp, shift] = 1 if assigned, 0 otherwise
for emp in employees:
    for shift in shifts:
        if feasible(emp, shift):
            x[emp, shift] = BoolVar("assign_e{}_s{}".format(emp.id, shift.id))
```

**But it also creates "helper" variables:**

```python
# Works-on-date variables: y[emp, date] = 1 if employee works that day
for emp in employees:
    for date in all_dates:
        y[emp, date] = BoolVar("works_e{}_d{}".format(emp.id, date))

# Weekly hours variables: h[emp, week] = total hours that week
for emp in employees:
    for week in weeks:
        h[emp, week] = IntVar(0, 48, "hours_e{}_w{}".format(emp.id, week))

# Night shift count: n[emp] = number of night shifts
for emp in employees:
    n[emp] = IntVar(0, num_night_shifts, "nights_e{}".format(emp.id))

# Weekend shift count: w[emp] = number of weekend shifts
for emp in employees:
    w[emp] = IntVar(0, num_weekend_shifts, "weekends_e{}".format(emp.id))
```

**Example:**
```
Created 2,500 decision variables:
  - 250 assignment variables (feasible pairs)
  - 225 works-on-date variables (15 employees × 15 dates)
  - 30 weekly hours variables (15 employees × 2 weeks)
  - 15 night shift count variables
  - 15 weekend shift count variables
```

---

#### STEP 4: Add Constraints (`_add_*_constraints`)

**Now we add the RULES that must be followed:**

##### Constraint 1: Shift Coverage
```python
def _add_shift_coverage_constraints(self):
    for shift in shifts:
        # Exactly 1 employee per shift (MUST be filled)
        self.model.Add(
            sum(x[emp, shift] for emp in feasible_employees_for_shift) == 1
        )
```

**What this means:**
```
Shift 1: x[John, Shift1] + x[Mary, Shift1] + x[Peter, Shift1] = 1
         (exactly one of these must be 1, others must be 0)
```

##### Constraint 2: No Overlapping Shifts
```python
def _add_no_overlap_constraints(self):
    for emp in employees:
        for shift1, shift2 in overlapping_shift_pairs:
            # Employee can't work both overlapping shifts
            self.model.Add(
                x[emp, shift1] + x[emp, shift2] <= 1
            )
```

**Example:**
```
John can't work:
  - Shift 1 (Nov 15 08:00-16:00) AND Shift 2 (Nov 15 14:00-22:00)

Constraint: x[John, Shift1] + x[John, Shift2] <= 1
```

##### Constraint 3: Weekly Hours Limit
```python
def _add_weekly_hours_constraints(self):
    for emp in employees:
        for week in weeks:
            # Total hours = sum of shift hours worked
            self.model.Add(
                h[emp, week] == sum(x[emp, shift] * shift_hours
                                   for shift in shifts_in_week)
            )

            # Must not exceed 48 hours (BCEA compliance)
            self.model.Add(h[emp, week] <= 48)
```

**Example:**
```
John's Week 46 hours:
  h[John, 46] = x[John, Shift1]×8 + x[John, Shift3]×8 + x[John, Shift5]×12 + ...

And: h[John, 46] <= 48
```

##### Constraint 4: Rest Period (8 hours minimum)
```python
def _add_rest_period_constraints(self):
    for emp in employees:
        for shift1, shift2 in shift_pairs:
            time_between = shift2.start - shift1.end

            if 0 < time_between < 8 hours:
                # Not enough rest - can't work both
                self.model.Add(
                    x[emp, shift1] + x[emp, shift2] <= 1
                )
```

**Example:**
```
Shift A ends: Nov 15 22:00
Shift B starts: Nov 16 04:00
Time between: 6 hours (< 8 hours minimum)

Constraint: x[John, ShiftA] + x[John, ShiftB] <= 1
(John can't work both because not enough rest)
```

##### Constraint 5: Consecutive Days (Max 6 in any 7-day window)
```python
def _add_consecutive_days_constraints(self):
    for emp in employees:
        # Link assignment to works-on-date
        for date in dates:
            self.model.AddMaxEquality(
                y[emp, date],
                [x[emp, shift] for shift in shifts_on_date]
            )

        # Check 7-day windows
        for window_start in dates:
            window = [window_start + i days for i in range(7)]

            # Max 6 days worked in any 7-day window
            self.model.Add(
                sum(y[emp, date] for date in window) <= 6
            )
```

**Example:**
```
Nov 15-21 (7 days):
  John works: Mon, Tue, Wed, Thu, Fri, Sat = 6 days  → OK ✓
  John works: Mon, Tue, Wed, Thu, Fri, Sat, Sun = 7 days  → VIOLATION ✗
```

##### Constraint 6: Fairness (Balance Night/Weekend Shifts)
```python
def _add_fairness_constraints(self):
    # Count night shifts per employee
    for emp in employees:
        self.model.Add(
            n[emp] == sum(x[emp, shift] for shift in night_shifts)
        )

    # Count weekend shifts per employee
    for emp in employees:
        self.model.Add(
            w[emp] == sum(x[emp, shift] for shift in weekend_shifts)
        )
```

---

#### STEP 5: Define Objective (`_define_objective`)

**CP-SAT can optimize for multiple goals at once!**

```python
def _define_objective(self):
    # Primary objective: Minimize cost
    cost_terms = []
    for (emp, shift), var in assignment_vars.items():
        cost = feasibility_matrix[emp, shift].cost * 100  # Scale to integer
        cost_terms.append(var * cost)

    # Secondary objective: Minimize unfairness
    max_hours = IntVar(0, 48, "max_weekly_hours")
    min_hours = IntVar(0, 48, "min_weekly_hours")

    self.model.AddMaxEquality(max_hours, all_weekly_hours)
    self.model.AddMinEquality(min_hours, all_weekly_hours)

    fairness_penalty = (max_hours - min_hours) * 1000

    # Combined objective
    self.model.Minimize(sum(cost_terms) + fairness_penalty)
```

**What this means:**
- Primary: Minimize R costs
- Secondary: Balance hours (minimize difference between busiest and least busy employee)

**Example:**
```
Solution A:
  - Total Cost: R15,000
  - Max employee hours: 48
  - Min employee hours: 32
  - Fairness penalty: (48-32) × 1000 = 16,000
  - Total objective: 15,000 + 16,000 = 31,000

Solution B:
  - Total Cost: R15,500  (R500 more expensive)
  - Max employee hours: 44
  - Min employee hours: 40
  - Fairness penalty: (44-40) × 1000 = 4,000
  - Total objective: 15,500 + 4,000 = 19,500  ← BETTER!

CP-SAT chooses Solution B (more fair, slightly more expensive)
```

---

#### STEP 6: Solve (`_solve`)

**Now CP-SAT finds the best solution:**

```python
def _solve(self):
    # Configure solver
    self.solver.parameters.max_time_in_seconds = 120  # 2 minutes
    self.solver.parameters.num_search_workers = 8  # Use 8 CPU cores

    # Solve!
    self.solution_status = self.solver.Solve(self.model)

    if self.solution_status == cp_model.OPTIMAL:
        print("✅ Found OPTIMAL solution!")
    elif self.solution_status == cp_model.FEASIBLE:
        print("✅ Found FEASIBLE solution (may not be optimal)")
    elif self.solution_status == cp_model.INFEASIBLE:
        print("❌ INFEASIBLE - no solution exists")
```

**What CP-SAT does internally:**
1. Starts with an initial solution (might not be optimal)
2. Tries to improve it by changing assignments
3. Checks if all constraints are still satisfied
4. Keeps track of the best solution found so far
5. Continues until time limit or proves it found the optimal solution

**Example Output:**
```
Solving CP-SAT model...
  Iteration 1: Cost = R18,000
  Iteration 5: Cost = R16,500  (improved)
  Iteration 12: Cost = R15,200  (improved)
  Iteration 20: Cost = R15,000  (improved)
  Iteration 50: Cost = R15,000  (no improvement)
  ...
  Iteration 100: Proved OPTIMAL!

✅ OPTIMAL solution found in 45.3 seconds
```

---

#### STEP 7: Extract Solution (`_extract_solution`)

```python
def _extract_solution(self):
    assignments = []

    for (emp_id, shift_id), var in assignment_vars.items():
        if self.solver.Value(var) == 1:  # If variable = 1, it's assigned
            assignments.append({
                "employee_id": emp_id,
                "shift_id": shift_id,
                "cost": feasibility_matrix[emp_id, shift_id].cost
            })

    return assignments
```

**Example:**
```
Extracted 45 assignments:
  - John (emp_id=1) → Shift 1 (shift_id=5), Cost: R360
  - Mary (emp_id=2) → Shift 2 (shift_id=7), Cost: R440
  - Peter (emp_id=3) → Shift 3 (shift_id=9), Cost: R520
  ...
```

---

### CP-SAT vs Hungarian Summary

| Feature | Hungarian | CP-SAT |
|---------|-----------|---------|
| **Speed** | Seconds | Minutes |
| **Quality** | Good | Excellent |
| **Fairness** | ✗ No | ✓ Yes |
| **BCEA Compliance** | Partial | Full |
| **Multi-week** | ✗ No | ✓ Yes |
| **Consecutive days** | ✗ No | ✓ Yes |
| **Optimal guarantee** | ✓ Yes | ✓ Yes |

**Recommendation:** Use CP-SAT for production, Hungarian for testing.

---

## 5. Constraints Module (The Rules)

**File:** `backend/app/algorithms/constraints.py`

This module contains all the constraint checking functions used by both algorithms.

### Function 1: `check_skill_match`

**What it does:** Checks if employee has the required skill for a shift.

```python
def check_skill_match(employee_skills: List[str], required_skill: str) -> bool:
    if not required_skill:
        return True  # No skill required

    return required_skill.lower() in [s.lower() for s in employee_skills]
```

**Example:**
```python
# Employee has skills: ["unarmed", "driver"]
# Shift requires: "unarmed"

check_skill_match(["unarmed", "driver"], "unarmed")  → True ✓

# Shift requires: "armed"
check_skill_match(["unarmed", "driver"], "armed")  → False ✗
```

**Special Rules:**
- Armed guards can work unarmed shifts (downgrade OK)
- Supervisors can work any shift
- Unarmed guards cannot work armed shifts (upgrade not OK)

---

### Function 2: `check_certification_validity`

**What it does:** Checks if employee has valid, non-expired PSIRA certification.

```python
def check_certification_validity(
    certifications: List[Dict],
    shift_date: datetime,
    required_cert_type: Optional[str] = None,
    skip_check: bool = False
) -> bool:
    # Testing mode: skip check
    if skip_check:
        return True

    # Check if any certification is valid for shift date
    for cert in certifications:
        if cert["expiry_date"] > shift_date.date():
            return True

    # FIXED: No valid certifications found
    return False  # Changed from returning True for empty list
```

**Example:**
```python
certifications = [
    {
        "cert_type": "PSIRA Grade E",
        "expiry_date": date(2026, 12, 31),
        "verified": True
    }
]

shift_date = datetime(2025, 11, 15)

check_certification_validity(certifications, shift_date)  → True ✓
(because 2026-12-31 > 2025-11-15)

shift_date = datetime(2027, 1, 1)
check_certification_validity(certifications, shift_date)  → False ✗
(because 2026-12-31 < 2027-01-01, expired!)
```

---

### Function 3: `check_availability_overlap`

**What it does:** Checks if employee marked themselves available during shift time.

```python
def check_availability_overlap(
    availability: List[Dict],
    shift_start: datetime,
    shift_end: datetime
) -> bool:
    shift_date = shift_start.date()

    for avail in availability:
        if avail["date"] == shift_date and avail["available"]:
            # Check time overlap
            avail_start = datetime.combine(shift_date, avail["start_time"])
            avail_end = datetime.combine(shift_date, avail["end_time"])

            # Shift must be FULLY within availability window
            if avail_start <= shift_start and shift_end <= avail_end:
                return True

    return False
```

**Example:**
```python
availability = [
    {
        "date": date(2025, 11, 15),
        "start_time": time(6, 0),   # 06:00
        "end_time": time(18, 0),    # 18:00
        "available": True
    }
]

shift_start = datetime(2025, 11, 15, 8, 0)   # 08:00
shift_end = datetime(2025, 11, 15, 16, 0)    # 16:00

check_availability_overlap(availability, shift_start, shift_end)  → True ✓
(because 06:00 <= 08:00 and 16:00 <= 18:00)

shift_start = datetime(2025, 11, 15, 4, 0)   # 04:00 (too early!)
shift_end = datetime(2025, 11, 15, 12, 0)    # 12:00

check_availability_overlap(availability, shift_start, shift_end)  → False ✗
(because 04:00 < 06:00, shift starts before availability)
```

---

### Function 4: `check_rest_period`

**What it does:** Ensures employee has minimum 8 hours rest between shifts (BCEA requirement).

```python
def check_rest_period(
    last_shift_end: Optional[datetime],
    next_shift_start: datetime,
    min_rest_hours: int = 8
) -> bool:
    if last_shift_end is None:
        return True  # No previous shift, always OK

    rest_duration = next_shift_start - last_shift_end
    rest_hours = rest_duration.total_seconds() / 3600

    return rest_hours >= min_rest_hours
```

**Example:**
```python
# Last shift ended Nov 15 at 22:00
last_shift_end = datetime(2025, 11, 15, 22, 0)

# Next shift starts Nov 16 at 08:00
next_shift_start = datetime(2025, 11, 16, 8, 0)

rest_hours = (08:00 - 22:00) = 10 hours

check_rest_period(last_shift_end, next_shift_start, min_rest_hours=8)  → True ✓
(because 10 hours >= 8 hours)

# Next shift starts Nov 16 at 04:00
next_shift_start = datetime(2025, 11, 16, 4, 0)

rest_hours = (04:00 - 22:00) = 6 hours

check_rest_period(last_shift_end, next_shift_start, min_rest_hours=8)  → False ✗
(because 6 hours < 8 hours, not enough rest!)
```

---

### Function 5: `check_weekly_hours`

**What it does:** Ensures adding this shift won't exceed the 48-hour weekly limit (BCEA requirement).

```python
def check_weekly_hours(
    current_hours: float,
    shift_hours: float,
    max_hours_week: int = 48
) -> bool:
    return (current_hours + shift_hours) <= max_hours_week
```

**Example:**
```python
# Employee has already worked 40 hours this week
current_hours = 40.0

# This shift is 8 hours
shift_hours = 8.0

check_weekly_hours(40.0, 8.0, max_hours_week=48)  → True ✓
(because 40 + 8 = 48, exactly at limit)

check_weekly_hours(42.0, 8.0, max_hours_week=48)  → False ✗
(because 42 + 8 = 50, exceeds 48-hour limit!)
```

---

### Function 6: `check_distance_constraint`

**What it does:** Checks if employee lives within reasonable distance from site.

```python
def check_distance_constraint(
    employee_location: Dict,
    site_location: Dict,
    max_distance_km: float = 50.0
) -> bool:
    if not employee_location.get("lat") or not site_location.get("lat"):
        return True  # No GPS data, skip constraint

    distance = calculate_haversine_distance(
        employee_location["lat"],
        employee_location["lng"],
        site_location["lat"],
        site_location["lng"]
    )

    return distance <= max_distance_km
```

**Example:**
```python
employee_location = {"lat": -26.2041, "lng": 28.0473}  # Johannesburg
site_location = {"lat": -26.3054, "lng": 27.9085}      # Soweto

distance = 15.2 km

check_distance_constraint(employee_location, site_location, max_distance_km=50)  → True ✓
(because 15.2 km <= 50 km)

site_location = {"lat": -29.8587, "lng": 31.0218}      # Durban (very far!)

distance = 485.3 km

check_distance_constraint(employee_location, site_location, max_distance_km=50)  → False ✗
(because 485.3 km > 50 km, too far!)
```

---

### Function 7: `calculate_haversine_distance`

**What it does:** Calculates distance between two GPS coordinates using the Haversine formula.

```python
def calculate_haversine_distance(lat1, lon1, lat2, lon2) -> float:
    R = 6371  # Earth's radius in kilometers

    # Convert to radians
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)

    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    distance = R * c
    return distance
```

**Example:**
```python
# Johannesburg to Pretoria
lat1, lon1 = -26.2041, 28.0473
lat2, lon2 = -25.7479, 28.2293

distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
→ 56.4 km

# Johannesburg to Cape Town
lat1, lon1 = -26.2041, 28.0473
lat2, lon2 = -33.9249, 18.4241

distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
→ 1,265.8 km
```

---

### Function 8: `calculate_overtime_cost`

**What it does:** Calculates regular and overtime pay based on hours worked.

```python
def calculate_overtime_cost(
    total_hours: float,
    hourly_rate: float,
    max_regular_hours: int = 40,
    ot_multiplier: float = 1.5
) -> Dict[str, float]:
    if total_hours <= max_regular_hours:
        return {
            "regular_hours": total_hours,
            "overtime_hours": 0,
            "regular_cost": total_hours * hourly_rate,
            "overtime_cost": 0,
            "total_cost": total_hours * hourly_rate
        }

    regular_hours = max_regular_hours
    overtime_hours = total_hours - max_regular_hours

    regular_cost = regular_hours * hourly_rate
    overtime_cost = overtime_hours * hourly_rate * ot_multiplier
    total_cost = regular_cost + overtime_cost

    return {
        "regular_hours": regular_hours,
        "overtime_hours": overtime_hours,
        "regular_cost": regular_cost,
        "overtime_cost": overtime_cost,
        "total_cost": total_cost
    }
```

**Example:**
```python
# Employee worked 45 hours at R50/hour
# First 40 hours = regular pay
# Last 5 hours = overtime (1.5× pay)

result = calculate_overtime_cost(
    total_hours=45.0,
    hourly_rate=50.0,
    max_regular_hours=40,
    ot_multiplier=1.5
)

→ {
    "regular_hours": 40.0,
    "overtime_hours": 5.0,
    "regular_cost": 2000.0,    # 40 × R50
    "overtime_cost": 375.0,    # 5 × R50 × 1.5
    "total_cost": 2375.0       # R2000 + R375
}
```

---

## 6. Complete Example Walkthrough

Let's walk through a complete roster generation from start to finish with a small example.

### The Scenario

**Company:** GuardianOS Security
**Period:** Nov 15-16, 2025 (2 days)
**Employees:** 3
**Shifts:** 4

#### Employees:
1. **John Doe** - Unarmed guard, R45/hr, lives in Johannesburg
2. **Mary Smith** - Armed guard, R55/hr, lives in Sandton
3. **Peter Jones** - Supervisor, R65/hr, lives in Pretoria

#### Shifts:
1. **Shift A** - Site 1, Nov 15 08:00-16:00 (8hrs), needs "unarmed"
2. **Shift B** - Site 2, Nov 15 18:00-02:00 (8hrs), needs "armed"
3. **Shift C** - Site 1, Nov 16 08:00-16:00 (8hrs), needs "unarmed"
4. **Shift D** - Site 3, Nov 16 20:00-04:00 (8hrs), needs "supervisor"

---

### Step 1: Feasibility Check

**Shift A (Nov 15 08:00-16:00, unarmed):**
- John: ✓ Skill match (unarmed), ✓ Cert valid, ✓ Available, ✓ Hours OK → **FEASIBLE**
- Mary: ✗ Skill mismatch (armed guard for unarmed shift, waste of resources)
- Peter: ✓ Could work (supervisor can do any shift) → **FEASIBLE**

**Shift B (Nov 15 18:00-02:00, armed):**
- John: ✗ Skill mismatch (unarmed can't do armed shift)
- Mary: ✓ Skill match (armed), ✓ Cert valid, ✓ Available → **FEASIBLE**
- Peter: ✓ Supervisor can do armed shift → **FEASIBLE**

**Shift C (Nov 16 08:00-16:00, unarmed):**
- John: ✗ Rest period violation (Shift A ends 16:00, Shift C starts 08:00 = 16hrs rest ✓, but if John worked Shift B ending 02:00, then 6hrs rest ✗)
  - If John worked Shift A: ✓ **FEASIBLE**
  - If John worked Shift B: ✗ Not feasible
- Mary: Same logic as John
- Peter: ✓ **FEASIBLE**

**Shift D (Nov 16 20:00-04:00, supervisor):**
- John: ✗ Skill mismatch (unarmed can't supervise)
- Mary: ✗ Skill mismatch (armed guard, not supervisor)
- Peter: ✓ Perfect match → **FEASIBLE**

---

### Step 2: Cost Calculation

**Feasible assignments with costs:**

```
John → Shift A: 8hrs × R45 = R360
Peter → Shift A: 8hrs × R65 = R520

Mary → Shift B: 8hrs × R55 + night premium R160 = R600
Peter → Shift B: 8hrs × R65 + night premium R160 = R680

John → Shift C: 8hrs × R45 = R360 (only if didn't work Shift B)
Peter → Shift C: 8hrs × R65 = R520

Peter → Shift D: 8hrs × R65 + night premium R160 = R680
```

---

### Step 3: Hungarian Algorithm Solution

**Cost Matrix:**
```
         Shift A   Shift B   Shift C   Shift D
John     R360      ∞         R360*     ∞
Mary     ∞         R600      ∞         ∞
Peter    R520      R680      R520      R680

* John can only do Shift C if he didn't work Shift B (rest constraint)
```

**Hungarian finds:**
1. John → Shift A (R360)
2. Mary → Shift B (R600)
3. Peter → Shift C (R520)
4. Peter → Shift D (R680)

**Wait! Peter can't work both C and D!**

Hungarian doesn't see this overlap issue, so we need to adjust:

**Corrected solution:**
1. John → Shift A (R360)
2. Mary → Shift B (R600)
3. John → Shift C (R360) - Valid because 16hrs rest after Shift A
4. Peter → Shift D (R680)

**Total Cost:** R2,000

---

### Step 4: CP-SAT Solution

CP-SAT would consider additional factors:

**Fairness:**
- John: 16 hours (Shift A + C)
- Mary: 8 hours (Shift B)
- Peter: 8 hours (Shift D)

This is unbalanced! Mary and Peter only work 1 shift, John works 2.

**CP-SAT might choose:**
1. Peter → Shift A (R520)
2. Mary → Shift B (R600)
3. Peter → Shift C (R520)
4. Peter → Shift D... wait, can't work 3 shifts!

**Better solution:**
1. John → Shift A (R360)
2. Mary → Shift B (R600)
3. Peter → Shift C (R520)
4. Peter → Shift D (R680)

**Checking constraints:**
- Peter: Shift C ends 16:00, Shift D starts 20:00 = 4hrs rest ✗ **VIOLATION!**

**CP-SAT realizes this violates rest period, so it tries:**
1. Peter → Shift A (R520)
2. Mary → Shift B (R600)
3. John → Shift C (R360)
4. Peter → Shift D (R680)

**Checking:**
- Peter: Shift A ends 16:00 (Nov 15), Shift D starts 20:00 (Nov 16) = 28hrs rest ✓
- John: Shift C only, 8 hours ✓
- Mary: Shift B only, 8 hours ✓
- All constraints satisfied!

**Total Cost:** R2,160 (R160 more than Hungarian, but LEGAL and FAIR)

---

## 7. Common Issues and Solutions

### Issue 1: "Found 0 feasible pairs"

**Symptoms:**
```
INFO: Found 50 shifts to assign
INFO: Found 15 active employees
INFO: Generating feasible pairs...
INFO: Found 0 feasible pairs  ← PROBLEM!
ERROR: No feasible assignments could be generated
```

**Causes:**
1. **All employees lack required skills**
   - Shifts need "armed" guards, but all employees are "unarmed"
2. **All certifications expired**
   - All PSIRA certifications have expired
3. **Availability not marked**
   - No employees marked as available for these dates
4. **Distance too far**
   - All employees live too far from all sites

**Solutions:**
```sql
-- Check 1: Do employees have required skills?
SELECT e.employee_id, e.role, s.required_skill, COUNT(*) as matching_shifts
FROM employees e
CROSS JOIN shifts s
WHERE e.status = 'active'
  AND s.assigned_employee_id IS NULL
  AND e.role = s.required_skill
GROUP BY e.employee_id, e.role, s.required_skill;
-- Expected: At least some matches

-- Check 2: Are certifications valid?
SELECT employee_id, cert_type, expiry_date,
  CASE
    WHEN expiry_date < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'VALID'
  END as status
FROM certifications
ORDER BY expiry_date;
-- Expected: Some VALID certifications

-- Check 3: Is availability marked?
SELECT COUNT(*) as availability_records
FROM availability
WHERE date >= CURRENT_DATE
  AND available = true;
-- Expected: At least some records

-- Check 4: Enable testing mode
-- In config.py, set:
TESTING_MODE = True
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True
```

---

### Issue 2: "Solution is infeasible"

**Symptoms:**
```
Solving CP-SAT model...
❌ Problem is INFEASIBLE - no solution exists
```

**Causes:**
1. **Too many shifts, not enough employees**
   - 50 shifts but only 2 employees = impossible
2. **Constraints too strict**
   - Every shift requires 12hr rest, but shifts are only 8hrs apart
3. **No one can work weekends**
   - All weekend shifts, but no employees available weekends

**Solutions:**
```python
# Diagnostic query to check capacity
total_shift_hours = sum((s.end - s.start).hours for s in shifts)
total_employee_capacity = num_employees × 48 hours/week × num_weeks

if total_employee_capacity < total_shift_hours:
    print("❌ NOT ENOUGH EMPLOYEES!")
    print(f"Need: {total_shift_hours / 48 / num_weeks} employees")
    print(f"Have: {num_employees} employees")
```

**Fix:** Hire more employees or reduce shifts!

---

### Issue 3: "Roster generation succeeds but shifts not assigned in database"

**Symptoms:**
```
INFO: Roster generation complete: SUCCESS, 45 assignments
(but when you check database, shifts still have assigned_employee_id = NULL)
```

**Cause:** Dual tracking system out of sync.

**Solution:** Already fixed in `shift_service.py` (see BACKEND_MODEL_ANALYSIS.md Issue #1)

```python
# Now fixed: Creates both Shift.assigned_employee_id AND ShiftAssignment record
def assign_employee(db, shift_id, employee_id, roster_id=None):
    # Update shift (old system)
    db_shift.assigned_employee_id = employee_id

    # FIXED: Create ShiftAssignment (new system)
    assignment = ShiftAssignment(
        shift_id=shift_id,
        employee_id=employee_id,
        roster_id=roster_id
    )
    db.add(assignment)
    db.commit()
```

---

### Issue 4: "Some employees get all night shifts"

**Symptoms:**
- John: 5 night shifts
- Mary: 0 night shifts
- Peter: 0 night shifts

**Cause:** Hungarian algorithm doesn't balance fairness.

**Solution:** Use CP-SAT production optimizer instead!

```python
# In API call, use:
{
    "algorithm": "production"  # Instead of "hungarian"
}
```

CP-SAT balances night shifts fairly across all employees.

---

## 8. Configuration Settings

**File:** `backend/app/config.py`

### Testing Mode (Relaxed Constraints)
```python
TESTING_MODE = True
SKIP_CERTIFICATION_CHECK = True
SKIP_AVAILABILITY_CHECK = True
MAX_HOURS_WEEK = 60  # Relaxed from 48
MIN_REST_HOURS = 6   # Relaxed from 8
```

**Use when:** Testing roster generation with incomplete data.

### Production Mode (Strict BCEA Compliance)
```python
TESTING_MODE = False
SKIP_CERTIFICATION_CHECK = False
SKIP_AVAILABILITY_CHECK = False
MAX_HOURS_WEEK = 48  # BCEA limit
MIN_REST_HOURS = 8   # BCEA requirement
```

**Use when:** Generating real rosters for deployment.

---

## 9. Quick Reference

### Algorithm Selection Guide

**Use Hungarian if:**
- Small roster (< 100 shifts)
- Testing/development
- Need results in seconds
- Fairness not critical

**Use CP-SAT if:**
- Large roster (100+ shifts)
- Production deployment
- Need BCEA compliance
- Fairness important
- Multi-week rosters

### Constraint Summary

| Constraint | Rule | Configurable? |
|------------|------|---------------|
| Skill match | Must have required skill | Yes (SKIP_SKILL_MATCHING) |
| Certification | Must have valid PSIRA cert | Yes (SKIP_CERTIFICATION_CHECK) |
| Availability | Must be marked available | Yes (SKIP_AVAILABILITY_CHECK) |
| Weekly hours | Max 48 hours/week | Yes (MAX_HOURS_WEEK) |
| Rest period | Min 8 hours between shifts | Yes (MIN_REST_HOURS) |
| Consecutive days | Max 6 days in 7-day window | No (BCEA requirement) |
| Distance | Max 50km from home | Yes (MAX_DISTANCE_KM) |

---

## 10. Further Reading

- **Hungarian Algorithm:** [Wikipedia](https://en.wikipedia.org/wiki/Hungarian_algorithm)
- **CP-SAT Solver:** [Google OR-Tools](https://developers.google.com/optimization)
- **BCEA (South African Labor Law):** [Department of Labour](http://www.labour.gov.za/)
- **Assignment Problem:** [Wikipedia](https://en.wikipedia.org/wiki/Assignment_problem)

---

## 11. Glossary

**Assignment Problem:** Finding the best way to assign workers to tasks
**Constraint:** A rule that must be followed (e.g., "max 48 hours/week")
**Feasible:** An assignment that satisfies all constraints
**Optimal:** The best feasible assignment (lowest cost)
**Infeasible:** No solution exists that satisfies all constraints
**Objective Function:** What we're trying to minimize (usually cost)
**Decision Variable:** A variable the algorithm chooses (e.g., "assign John to Shift 1")
**Cost Matrix:** A table of costs for all employee-shift combinations
**BCEA:** Basic Conditions of Employment Act (South African labor law)
**PSIRA:** Private Security Industry Regulatory Authority (South African certification)

---

**End of Documentation**

For questions or issues, refer to:
- BACKEND_MODEL_ANALYSIS.md - Model documentation
- DEBUGGING_GUIDE.md - Testing and debugging
- README.md - Project setup
