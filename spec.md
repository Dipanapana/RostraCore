Perfect — yes, absolutely.
You can 100% build a **powerful auto-rostering engine without any AI** by using **deterministic algorithms** (constraint logic, permutations, and optimization heuristics).

Let’s break this down in two parts exactly as you asked:

---

## 🧩 PART 1: Data Model — Entities & Relationships

### 1️⃣ Core Entities

| Table               | Description                      | Key Fields                                                                                                                                                                              |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **employees**       | All guards/staff                 | `employee_id PK`, `first_name`, `last_name`, `id_number`, `role` (armed/unarmed/supervisor), `hourly_rate`, `max_hours_week`, `cert_level`, `home_location`, `status` (active/inactive) |
| **sites**           | Client locations                 | `site_id PK`, `client_name`, `address`, `gps_lat`, `gps_lng`, `shift_pattern` (day/night/12 hr), `required_skill`, `billing_rate`, `min_staff`, `notes`                                 |
| **shifts**          | Planned work periods             | `shift_id PK`, `site_id FK`, `start_time`, `end_time`, `required_skill`, `assigned_employee_id FK`, `status` (planned/confirmed/completed), `created_by`, `is_overtime bool`            |
| **availability**    | Guard availability blocks        | `avail_id PK`, `employee_id FK`, `date`, `start_time`, `end_time`, `available bool`                                                                                                     |
| **certifications**  | Training & licences              | `cert_id PK`, `employee_id FK`, `cert_type`, `issue_date`, `expiry_date`, `verified bool`                                                                                               |
| **expenses**        | Variable or recurring cost items | `expense_id PK`, `employee_id FK nullable`, `site_id FK nullable`, `type` (fuel, meal, allowance, uniform, vehicle), `amount`, `date_incurred`, `approved bool`                         |
| **attendance**      | Actual clock-in/out              | `attend_id PK`, `shift_id FK`, `employee_id FK`, `clock_in`, `clock_out`, `variance_minutes`, `notes`                                                                                   |
| **payroll_summary** | Weekly / monthly totals          | `payroll_id PK`, `employee_id FK`, `period_start`, `period_end`, `total_hours`, `overtime_hours`, `gross_pay`, `expenses_total`, `net_pay`                                              |

### 2️⃣ Relationships (simplified ER-style)

```
employees 1—* shifts
employees 1—* certifications
employees 1—* availability
employees 1—* expenses
sites 1—* shifts
sites 1—* expenses
shifts 1—1 attendance
employees 1—* payroll_summary
```

### 3️⃣ Derived / helper tables

| Table               | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| **rules_config**    | Stores global rostering constraints (max hours, min rest, OT threshold, etc.) |
| **shift_templates** | Reusable 7-day or 4-week patterns per site                                    |
| **skills_matrix**   | Links employees to multiple skill tags (armed response, driver, dog handler)  |

---

## ⚙️ PART 2: One-Page Product Spec (Algorithmic Auto-Rostering MVP)

### 🚀 Product Name

**RostraCore v1 — Algorithmic Roster & Budget Engine**

### 🎯 Objective

Generate legally compliant, cost-optimized weekly/monthly security rosters using deterministic algorithms (no AI), while enforcing rest periods, certification validity, and client coverage requirements.

### 💼 User Roles

* **Admin / Scheduler:** creates sites, adds guards, runs auto-roster, prints reports.
* **Guard:** views assigned shifts (read-only for MVP).
* **Finance:** reviews budget vs actual cost.

### 🧠 Algorithmic Approach

1. **Constraint Definition**

   * Each shift = {site, start, end, required_skill}.
   * Each guard = {availability, skills, cert_valid, hours_worked, distance, rate}.
2. **Generation Phase**

   * List all feasible (employee, shift) pairs that satisfy:

     * Skill match
     * Cert not expired
     * Availability window
     * Within weekly hour limit
     * Min rest ≥ 8–12 h since last shift
3. **Optimization Phase**

   * Treat as **Assignment Problem** (Hungarian Algorithm / integer linear programming) to minimize cost or distance.
   * For smaller sets (< 50 guards × 300 shifts):

     * Run permutation heuristic (try multiple random starts → choose lowest cost).
   * Add budget cap constraint (sum(hourly_rate × hours) ≤ weekly_budget).
4. **Validation & Simulation**

   * Check no employee > max hours/week.
   * Check coverage per site/day ≥ required_staff.
   * Compute projected pay & overtime.
5. **Output**

   * Final `shifts` table with `assigned_employee_id` filled.
   * Printable PDF / CSV roster and budget summary.

### 🧮 Core Formulas

```
cost_shift = hourly_rate × hours
weekly_hours_emp = Σ hours_assigned
overtime = max(0, weekly_hours_emp - max_hours_week)
overtime_cost = overtime × rate × OT_multiplier
total_budget = Σ(cost_shift + overtime_cost)
```

### 🧱 Tech Stack (MVP)

* **Backend:** PostgreSQL + Python (FastAPI or Flask).
* **Algorithm lib:** NumPy / SciPy (optimize.linear_sum_assignment) or PuLP (ILP).
* **Frontend:** React / Next.js simple UI for Admin.
* **PDF Reports:** ReportLab / jsPDF.
* **Auth:** JWT or Firebase Auth.

### 📊 Outputs / Reports

* Roster calendar view.
* Weekly budget vs limit.
* Hours per guard.
* Unfilled shift alerts.
* Certification expiry report.

### 🔒 Constraints to Enforce (MVP set)

| Type          | Example                           |
| ------------- | --------------------------------- |
| Time          | ≥ 8 h rest between shifts         |
| Weekly hours  | ≤ 48 h                            |
| Skills        | armed shift → armed cert required |
| Certification | expiry > shift date               |
| Distance      | home→site ≤ X km (optional)       |
| Budget        | total ≤ weekly client budget      |

### 🗓️ MVP Scope

* Single company multi-site rostering.
* No AI calls.
* Manual trigger for auto-generate.
* Editable after generation.

### 🔮 Future Upgrades

* Predictive demand / AI integration.
* Mobile app for clock-in & incident logging.
* Dynamic pricing & shift marketplace.
* Client portal for live visibility.

