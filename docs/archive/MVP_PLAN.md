# RostraCore MVP Plan - FINAL

**Date:** November 17, 2025
**Status:** 🟢 **APPROVED - Ready for Implementation**
**Business Model:** SaaS Platform for Security Companies
**Updated:** All 11 clarification questions answered and incorporated

---

## 📋 Planning Session Summary

### Question 1: Business Model
**Answer:** **A - SaaS Platform**
- Multiple security companies sign up and pay subscriptions
- Each company manages their own guards, clients, sites
- Platform owner (you) oversees all organizations via SuperAdmin
- Revenue from subscription fees (PayFast)

### Question 2: Organization → Client Relationship
**Answer:** **A - Exclusive Clients**
- Each client (municipality) belongs to ONE organization
- Clients table has `org_id`
- No client sharing between organizations

### Question 3: Client → Site Relationship
**Answer:** **A - Client Has Many Sites**
- One client has multiple guard posts/locations
- Sites table has `client_id`
- Sites belong to one client only

### Question 4: Employee → Organization Relationship
**Answer:** **A - Employee Belongs to ONE Organization**
- Guards are employed by one security company
- Employees table has `org_id` (required, non-nullable)
- Each organization has their own pool of guards

### Question 5: Employee → Client Assignment
**Answer:** **A - Dedicated Guards (Primary Assignment)**
- Guards can be primarily assigned to a specific client
- `assigned_client_id` is optional/nullable
- It's a preference, not a hard constraint
- Guards remain flexible for other clients if needed

### Question 6: Employee → Site Relationship
**Answer:** **A - No Site Assignment**
- Guards assigned at client level only
- Can work at any of that client's sites
- No `assigned_site_id` needed

### Question 7: Employee → Shift Relationship
**Answer:** **B - Multiple Employees Per Shift**
- One shift can have multiple guards assigned
- Need junction table: `shift_assignments`
- Site has minimum staff requirements

### Question 8: Shift Assignment Implementation
**Answer:** **B - Create New Assignment Structure**
- Remove `assigned_employee_id` from shifts table
- Use clean `shift_assignments` junction table
- Better design for many-to-many

### Question 9: Shift Staffing Requirements
**Answer:** **B - Each Shift Specifies Requirements**
- Shift has `required_staff` field
- Different shifts can need different numbers of guards
- Maximum flexibility

### Question 10: Payroll Scope
**Answer:** **A - Basic Payroll Calculation**
- Calculate hours worked × hourly rate
- Generate payroll reports
- Organizations handle actual payments manually
- No payment processing in MVP

### Question 11: Payment Flows
**Answer:** **A - Organizations Pay Platform (Subscription)**
- Security companies pay YOU monthly subscriptions
- Using PayFast (South African payment gateway)
- No client invoicing in system (handled externally)

### Question 12: Subscription Plans
**Answer:** **A - Based on Number of Guards (PayFast)**
- Tiers based on guard count limits
- Example: Free (10 guards), Basic (50 guards), Pro (200 guards), Enterprise (unlimited)
- PayFast integration for payments

### Question 13: SuperAdmin Features
**Answer:** **A, B, C (E for later)**
- A: Organization management (view, approve, suspend)
- B: Subscription management (payments, upgrades)
- C: Platform analytics (revenue, active orgs, stats)
- E: System settings (LATER)

### Question 14: Employee Availability
**Answer:** **A - Block Out Unavailable Times**
- Guards mark when they are NOT available
- Assume available unless blocked out
- Roster generator respects unavailability

### Question 15: Features to Remove
**Answer:**
- **YES** - Remove all marketplace features
- **YES** - Remove advanced features (add later when stable)
- **YES** - Remove unused tables (check first)

---

## 🔍 Additional Clarifications (11 Questions Answered)

After the initial planning session, 11 critical gaps were identified and clarified:

### 1. Payroll Calculation Method
**Decision:** **A - Pay Based on Assigned Shifts**
- Calculate hours from assigned shifts (start_time to end_time)
- No attendance tracking needed for MVP
- Simpler implementation, prevents payroll complexity
- **Result:** Remove `attendance` table (confirmed)

### 2. Shift Templates for Recurring Shifts
**Decision:** **A - KEEP Shift Templates**
- Essential for recurring shifts (e.g., Mon-Fri 6am-2pm every week)
- Auto-generate shifts from templates
- Reduces manual work significantly
- **Result:** **KEEP** `shift_templates` table (moved from "remove" to "keep")

### 3. Guard Limit Enforcement
**Decision:**
- **When:** Check limit when creating new employee
- **Count:** Include inactive employees in the count
- **Action:** Hard block (cannot exceed plan limit)

**Enforcement Rules:**
- Basic Plan (50 guards) = Can have max 50 total employees (active + inactive)
- When trying to create 51st employee → Show error: "Upgrade plan to add more guards"
- No grace period, no soft warnings
- Forces upgrade to add more employees

### 4. Organization Registration Workflow
**Decision:** **C - Trial Period (14 Days)**

**Registration Flow:**
1. Security company fills registration form
2. Account created with status = "Trial"
3. Immediately active - can use all features
4. Trial expires after 14 days
5. Must subscribe to continue OR get SuperAdmin approval for extension
6. If no subscription → Account suspended (read-only mode)

**Trial Benefits:**
- Organizations can test the system
- Full access to evaluate features
- No payment required upfront
- SuperAdmin can monitor trial signups

### 5. Client (Municipality) Name Verification
**Decision:** **Allow Duplicates**

**Policy:**
- Multiple organizations CAN add clients with the same name
- Example: Two different security companies can both have "City of Johannesburg" as a client
- Each org manages their own client records independently
- No verification or "claiming" process
- Simplest approach for MVP

**Rationale:** Each security company might service different divisions/departments of the same municipality.

### 6. User Roles Within Organizations
**Decision:** **Single Admin Role for MVP**

**MVP Roles:**
- **SuperAdmin** - Platform owner (you)
- **OrgAdmin** - Organization administrator (full access within their org)

**Future Roles (Post-MVP):**
- Scheduler (shifts only)
- Finance (payroll, billing)
- Viewer (read-only)

**Rationale:** Most small-medium security companies have 1-2 admins. Complex role systems can be added later.

### 7. Shift Assignment Status Workflow
**Decision:** **Pending Review (Not Immediately Confirmed)**

**Workflow:**
1. **Roster generates** → Assigns guards to shifts → Status = **"Pending"**
2. **Org admin reviews** → Checks assignments → Approves or modifies
3. **Admin confirms** → Status changes to **"Confirmed"**
4. **Shift starts** → Guards expected to show up

**Shift Assignment Statuses:**
- `pending` - Auto-assigned by roster, awaiting confirmation
- `confirmed` - Reviewed and approved by admin
- `cancelled` - Assignment removed (guard no longer assigned)
- `completed` - Shift finished

**Benefits:** Admin oversight before finalizing roster. Prevents auto-roster mistakes.

### 8. Certification Requirements for Shifts
**Decision:** **Soft Preference (Warn Admin)**

**Matching Logic:**
- Shifts CAN specify required certification (e.g., PSIRA Grade A)
- Roster generator PREFERS guards with matching certification
- If no matching guards available → Assigns anyone, shows WARNING
- Admin reviews warnings during roster confirmation

**Warning Messages:**
- ⚠️ "Guard John Mabena assigned to shift requiring Grade A cert, but has Grade B"
- ⚠️ "Guard Peter Smith's PSIRA cert expires in 5 days"

**Benefits:** Flexibility for emergencies while maintaining compliance awareness.

### 9. Billable Hours Tracking (Client Invoicing)
**Decision:** **YES - Track Billable Hours**

**Implementation:**
- System calculates total hours worked per client per period
- Generate billable hours report for org admin
- Org creates invoice manually in external system
- NO payment processing in RostraCore (handled externally)

**Report Format:**
```
Client: City of Johannesburg Municipality
Period: November 2025
Total Hours: 520 hours
Rate: R150/hour (from site.billing_rate)
Billable Amount: R78,000
```

**Benefits:** Orgs know exactly what to bill clients. Essential business feature.

### 10. Data Retention & Subscription Cancellation
**Decision:** **90-Day Retention + Data Export**

**Cancellation Policy:**
1. **Org cancels subscription** → Status changes to "Cancelled"
2. **Read-only access for 90 days:**
   - Can view all data (employees, shifts, clients, etc.)
   - Can export data (CSV, Excel)
   - Cannot create, edit, or delete anything
   - Cannot generate new rosters
3. **After 90 days:**
   - Data soft-deleted (marked as deleted, not physically removed)
   - Account fully disabled
4. **Reactivation within 90 days:**
   - Can re-subscribe
   - Full access restored immediately

**Data Export Features:**
- Export employees list
- Export shift history
- Export payroll records
- Export client/site data
- All exports in CSV format

### 11. SuperAdmin User Creation
**Decision:** **Special Registration (Secret Token)**

**Bootstrap Method:**
1. **Special registration URL:** `/superadmin/register?token=SECRET_TOKEN`
2. **Secret token** stored in `.env` file: `SUPERADMIN_REGISTRATION_TOKEN=xyz123`
3. **Only you know the token** → Secure superadmin creation
4. **First superadmin created** via special URL
5. **Subsequent superadmins** created by existing superadmin

**Security:**
- Token not exposed in code
- Token required to access registration page
- Invalid token → 403 Forbidden
- After first superadmin created, URL can be disabled

**Alternative for Production:** After first superadmin created, disable special registration endpoint entirely.

---

## 🏗️ Entity Relationship Diagram

```
┌─────────────────┐
│  SUPERADMIN     │ (You - Platform Owner)
│  (User)         │
└────────┬────────┘
         │ manages
         ↓
┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATIONS                        │
│  - org_id (PK)                                         │
│  - org_name                                            │
│  - contact details                                     │
└───┬─────────────┬────────────┬─────────────┬──────────┘
    │             │            │             │
    │ has many   │ has many  │ has many   │ has one
    ↓             ↓            ↓             ↓
┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────────┐
│  USERS  │  │ EMPLOYEES│  │ CLIENTS│  │ SUBSCRIPTION │
│ (Admins)│  │ (Guards) │  │ (Munic)│  │              │
└─────────┘  └────┬─────┘  └───┬────┘  └──────────────┘
                  │            │
       optional   │            │ has many
       assigned   │            ↓
       to client  │        ┌────────┐
                  │        │ SITES  │
                  │        │        │
                  │        └───┬────┘
                  │            │ has many
                  │            ↓
                  │        ┌────────────┐
                  │        │  SHIFTS    │
                  │        │ - required_│
                  │        │   staff: 3 │
                  │        └──────┬─────┘
                  │               │
                  │               │ many-to-many
                  │               ↓
                  │        ┌──────────────────┐
                  └───────→│ SHIFT_ASSIGNMENTS│←─ MANY GUARDS
                           │ - shift_id       │   PER SHIFT
                           │ - employee_id    │
                           └──────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ CERTIFICATIONS│────→│  EMPLOYEES   │←────│   AVAILABILITY   │
│ (PSIRA)      │     │              │     │ (Block out times)│
└──────────────┘     └──────────────┘     └──────────────────┘

┌──────────────────┐
│ SUBSCRIPTION_PLAN│
│ - Free (10)      │
│ - Basic (50)     │
│ - Pro (200)      │
│ - Enterprise (∞) │
└──────────────────┘
```

---

## 📊 Database Tables - KEEP vs REMOVE

### ✅ TABLES TO KEEP (14 Core Tables)

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | `users` | Authentication accounts | user_id, username, email, org_id, role |
| 2 | `organizations` | Security companies (tenants) | org_id, org_name, contact_email, status (trial/active/cancelled) |
| 3 | `employees` | Security guards | employee_id, org_id, assigned_client_id, status (active/inactive) |
| 4 | `certifications` | PSIRA certifications | cert_id, employee_id, cert_type, expiry_date |
| 5 | `clients` | Municipalities | client_id, org_id, client_name |
| 6 | `sites` | Guard posts/locations | site_id, client_id, address, gps, billing_rate |
| 7 | `shifts` | Work shifts | shift_id, site_id, start_time, end_time, **required_staff**, status |
| 8 | `shift_assignments` | Guards assigned to shifts | assignment_id, shift_id, employee_id, status (pending/confirmed/cancelled) |
| 9 | `shift_templates` | Recurring shift patterns | template_id, site_id, day_of_week, start_time, end_time, required_staff |
| 10 | `availability` | Guard availability blocks | avail_id, employee_id, date, start_time, end_time, available=FALSE |
| 11 | `payroll` | Basic payroll calculations | payroll_id, employee_id, period, total_hours, gross_pay |
| 12 | `subscription_plans` | Pricing tiers | plan_id, plan_name, max_guards, price_monthly |
| 13 | `subscriptions` | Org subscriptions | subscription_id, org_id, plan_id, status, payment_status |
| 14 | `alembic_version` | Migration tracking | version_num |

**Total: 14 tables** (added `shift_templates` based on clarification #2)

### 🗑️ TABLES TO REMOVE

**Marketplace Features (Not Needed):**
- ❌ `guard_applicants` - Recruitment/hiring
- ❌ `job_applications` - Guard applications
- ❌ `job_postings` - Job listings
- ❌ `guard_ratings` - Guard reviews
- ❌ `cv_generations` - CV builder
- ❌ `marketplace_commissions` - Commission tracking
- ❌ `marketplace_settings` - Marketplace config

**Advanced Features (Add Later):**
- ❌ `attendance` - Clock in/out tracking (Clarification #1: Using shift-based payroll instead)
- ❌ `incident_reports` - Incident logging
- ❌ `daily_occurrence_book` - OB book
- ❌ `ob_entries` - OB entries
- ❌ `leave_requests` - Leave management
- ❌ `expenses` - Expense tracking
- ❌ `analytics` - Advanced analytics

**Unused/Duplicate Tables:**
- ❌ `shift_groups` - Not needed (using shift_templates instead)
- ❌ `skills_matrix` - Not needed for MVP
- ❌ `rules_config` - Not needed for MVP
- ❌ `superadmin_users` - Duplicate (using users table with role field)

**Total: ~21 tables to remove** (shift_templates moved to KEEP list)

---

## 🔌 API Endpoints - KEEP vs REMOVE

### ✅ ENDPOINTS TO KEEP

**Authentication:**
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/register`
- `POST /auth/verify-email`

**Organizations:**
- `GET /organizations/` (superadmin only)
- `GET /organizations/{id}` (superadmin only)
- `POST /organizations/` (new registration)
- `PUT /organizations/{id}` (org admin)
- `DELETE /organizations/{id}` (superadmin only)

**Users (within org):**
- `GET /organization-users/` (org users)
- `POST /organization-users/` (add user to org)
- `PUT /organization-users/{id}`
- `DELETE /organization-users/{id}`

**Employees:**
- `GET /employees/` (filtered by org_id)
- `POST /employees/`
- `GET /employees/{id}`
- `PUT /employees/{id}`
- `DELETE /employees/{id}`
- `POST /employees/import-excel`

**Certifications:**
- `GET /certifications/`
- `POST /certifications/`
- `GET /certifications/{id}`
- `PUT /certifications/{id}`
- `DELETE /certifications/{id}`
- `GET /certifications/expiring` (dashboard)

**Clients:**
- `GET /clients/` (filtered by org_id)
- `POST /clients/`
- `GET /clients/{id}`
- `PUT /clients/{id}`
- `DELETE /clients/{id}`

**Sites:**
- `GET /sites/` (filtered by org_id through clients)
- `POST /sites/`
- `GET /sites/{id}`
- `PUT /sites/{id}`
- `DELETE /sites/{id}`

**Shifts:**
- `GET /shifts/` (filtered by org_id through sites)
- `POST /shifts/` (with required_staff)
- `GET /shifts/{id}`
- `PUT /shifts/{id}`
- `DELETE /shifts/{id}`
- `POST /shifts/bulk-create`

**Shift Assignments:**
- `GET /shifts/{id}/assignments`
- `POST /shifts/{id}/assign` (assign guard to shift)
- `DELETE /shifts/{id}/assignments/{employee_id}` (remove assignment)
- `GET /employees/{id}/shifts` (get guard's shifts)

**Availability:**
- `GET /availability/` (employee availability)
- `POST /availability/` (block out time)
- `PUT /availability/{id}`
- `DELETE /availability/{id}`
- `GET /availability/calendar/{employee_id}`

**Roster:**
- `POST /roster/generate` (with org_id filtering)
- `POST /roster/confirm`
- `GET /roster/unfilled-shifts`

**Payroll:**
- `GET /payroll/` (basic calculations)
- `POST /payroll/calculate` (for period, based on assigned shifts)
- `GET /payroll/{id}`
- `GET /payroll/employee/{employee_id}`
- `GET /payroll/billable-hours/{client_id}` (billable hours report - NEW)

**Subscriptions (Org Admin):**
- `GET /subscriptions/current` (org's subscription)
- `POST /subscriptions/upgrade`
- `POST /subscriptions/downgrade`
- `GET /subscription-plans/` (available plans)

**Subscriptions (SuperAdmin):**
- `GET /subscriptions/` (all org subscriptions)
- `PUT /subscriptions/{id}` (manual update)
- `GET /subscriptions/overdue` (payment issues)

**Dashboard:**
- `GET /dashboard/metrics` (filtered by org_id)
- `GET /dashboard/upcoming-shifts`
- `GET /dashboard/employee-utilization`
- `GET /dashboard/cost-trends`

**SuperAdmin:**
- `GET /superadmin/analytics` (platform-wide stats)
- `GET /superadmin/organizations` (all orgs)
- `PUT /superadmin/organizations/{id}/status` (approve/suspend)
- `GET /superadmin/revenue` (subscription revenue)

**Total: ~70 endpoints**

### 🗑️ ENDPOINT FILES TO DELETE

```
app/api/endpoints/analytics.py
app/api/endpoints/attendance.py
app/api/endpoints/cv_generator.py
app/api/endpoints/daily_reports.py
app/api/endpoints/employee_permissions.py
app/api/endpoints/employee_portal.py
app/api/endpoints/expenses.py
app/api/endpoints/exports.py (maybe keep for reports?)
app/api/endpoints/guard_ratings.py
app/api/endpoints/incident_reports.py
app/api/endpoints/jobs.py
app/api/endpoints/leave_requests.py
app/api/endpoints/marketplace_applications.py
app/api/endpoints/marketplace_guards.py
app/api/endpoints/marketplace_jobs.py
app/api/endpoints/marketplace_revenue.py
app/api/endpoints/marketplace_settings.py
app/api/endpoints/predictions.py
app/api/endpoints/shift_groups.py
```

**Total: ~19 files to delete**

---

## 🖥️ Frontend Pages - KEEP vs REMOVE

### ✅ PAGES TO KEEP

**Public:**
- `/` - Landing page
- `/login` - Login
- `/register` - Registration
- `/verify-email` - Email verification
- `/pricing` - Subscription plans (public view)

**Organization Dashboard:**
- `/dashboard` - Main dashboard
- `/employees` - Employee management
- `/clients` - Client management
- `/sites` - Site management
- `/shifts` - Shift management
- `/certifications` - Certification tracking
- `/roster` - Roster generation
- `/availability` - Employee availability
- `/payroll` - Basic payroll reports
- `/organizations` - Org settings (own org)

**SuperAdmin:**
- `/superadmin` - SuperAdmin dashboard
- `/superadmin/organizations` - Manage all orgs
- `/superadmin/subscriptions` - Subscription management
- `/superadmin/analytics` - Platform analytics
- `/superadmin/subscription-plans` - Manage plans

**Total: ~19 pages**

### 🗑️ PAGES TO DELETE

```
admin/analytics-debug/
admin/data-insights/
admin/employee-permissions/
admin/leave-approvals/
admin/marketplace-pricing/
admin/onboarding/
attendance/
dashboards/executive/
dashboards/financial/
dashboards/operations/
dashboards/people/
employee/daily-report/
employee/dashboard/
employee/incidents/
employee/leave/
employee/login/
employee/profile/
expenses/
marketplace/cv-templates/
marketplace/
test-dashboard/
landing/ (if duplicate)
```

**Total: ~22 pages to delete**

---

## 📐 Key Business Rules (From Clarifications)

### Subscription & Guard Limits
- **Guard limit enforcement:** Check when creating new employee
- **Count:** Active + inactive employees (all employees count)
- **Action:** Hard block (cannot create employee if over limit)
- **Error message:** "Upgrade your plan to add more guards. Current plan allows X guards."
- **No grace period** - strict enforcement

### Organization Lifecycle
- **Registration:** Immediate activation with 14-day trial
- **Trial status:** Full access to all features
- **Post-trial:** Must subscribe or get SuperAdmin extension
- **Cancellation:** 90-day read-only period + data export
- **After 90 days:** Account disabled, data soft-deleted

### Client Management
- **Duplicate names allowed:** Multiple orgs can have same client name
- **No verification:** Organizations self-manage clients
- **Reason:** Same municipality may have different divisions serviced by different companies

### Shift Assignment Workflow
- **Roster generation:** Creates assignments with status = "pending"
- **Admin review:** Reviews and modifies assignments
- **Confirmation:** Changes status to "confirmed"
- **Cannot skip review:** Admin must explicitly confirm roster

### Certification Matching
- **Soft preference:** Roster prefers guards with matching certs
- **Flexibility:** Can assign guards without matching cert if needed
- **Warnings:** Show warnings for cert mismatches and expirations
- **Admin decides:** Admin reviews warnings and confirms or modifies

### Payroll Calculation
- **Method:** Based on assigned shifts (start_time to end_time)
- **No attendance tracking:** Assumes guard worked full shift
- **Hours:** Sum of shift durations for the period
- **Payment:** Calculated but not processed (manual payment by org)

### Billable Hours
- **Calculation:** Total hours per client per period
- **Rate source:** Site's billing_rate field
- **Report format:** Client name, period, hours, rate, total amount
- **Invoicing:** Org creates invoice externally (not in system)

### User Roles (MVP)
- **SuperAdmin:** Platform owner (you) - full access to everything
- **OrgAdmin:** Organization administrator - full access within their org
- **Future:** Scheduler, Finance, Viewer roles (post-MVP)

---

## 🔧 Key Implementation Changes Needed

### 1. Shift Assignment Redesign (CRITICAL)

**Current Structure:**
```sql
shifts table:
  - shift_id
  - site_id
  - assigned_employee_id  ← REMOVE THIS
  - start_time
  - end_time
```

**New Structure:**
```sql
shifts table:
  - shift_id
  - site_id
  - start_time
  - end_time
  - required_staff  ← ADD THIS (how many guards needed)
  - status

shift_assignments table:
  - assignment_id (PK)
  - shift_id (FK)
  - employee_id (FK)
  - assigned_at
  - status (pending/confirmed/cancelled)
  - UNIQUE(shift_id, employee_id)  ← Prevent duplicate assignments
```

**Migration Steps:**
1. Add `required_staff` column to shifts
2. Create new `shift_assignments` table
3. Migrate existing data: if shift has `assigned_employee_id`, create assignment row
4. Drop `assigned_employee_id` column from shifts
5. Update all queries and roster generator

### 2. Multi-Tenancy (org_id) - Already Started

**Status:** Migration created but not run

**Remaining Work:**
- Run migration on Windows: `alembic upgrade head`
- Test org_id filtering in all endpoints
- Update roster generator to filter employees by org_id
- Update frontend to show org context

### 3. Subscription & Payment Integration

**PayFast Integration Needed:**
- Create subscription signup flow
- PayFast webhook handlers
- Payment verification
- Subscription status updates
- Guard limit enforcement

### 4. SuperAdmin Portal

**New Features to Build:**
- SuperAdmin login/auth
- Organization approval workflow
- Platform-wide analytics dashboard
- Subscription management interface
- Revenue tracking

### 5. Guard Limit Enforcement (NEW)

**Implementation:**
```python
# In employee creation endpoint
async def create_employee(...):
    # 1. Get current org's subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == current_user.org_id
    ).first()

    # 2. Get subscription plan limits
    plan = subscription.plan
    max_guards = plan.max_guards  # e.g., 50 for Basic plan

    # 3. Count current employees (active + inactive)
    current_count = db.query(Employee).filter(
        Employee.org_id == current_user.org_id
    ).count()

    # 4. Check limit
    if current_count >= max_guards:
        raise HTTPException(
            status_code=403,
            detail=f"Upgrade your plan to add more guards. Current plan allows {max_guards} guards."
        )

    # 5. Create employee if within limit
    ...
```

### 6. Billable Hours Tracking (NEW)

**Implementation:**
```python
# New endpoint: GET /payroll/billable-hours/{client_id}?period=2025-11
async def get_billable_hours(client_id: int, period: str):
    # 1. Get all sites for this client
    sites = db.query(Site).filter(Site.client_id == client_id).all()

    # 2. Get all shifts for these sites in the period
    shifts = db.query(Shift).join(ShiftAssignment).filter(
        Shift.site_id.in_([s.site_id for s in sites]),
        Shift.start_time.between(period_start, period_end),
        ShiftAssignment.status == 'confirmed'
    ).all()

    # 3. Calculate total hours
    total_hours = sum([
        (shift.end_time - shift.start_time).total_seconds() / 3600
        for shift in shifts
    ])

    # 4. Get billing rate from sites (weighted average or per-site)
    # 5. Return report
    return {
        "client_name": client.client_name,
        "period": period,
        "total_hours": total_hours,
        "billing_rate": avg_rate,
        "total_amount": total_hours * avg_rate,
        "breakdown_by_site": [...]
    }
```

### 7. Trial Period & Data Retention (NEW)

**Organizations Table Updates:**
```sql
ALTER TABLE organizations ADD COLUMN status VARCHAR(20);  -- 'trial', 'active', 'cancelled'
ALTER TABLE organizations ADD COLUMN trial_expires_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN cancelled_at TIMESTAMP;
```

**Trial Period Logic:**
- On registration: `status='trial'`, `trial_expires_at = now() + 14 days`
- Daily cron job checks for expired trials
- If expired and no subscription → `status='read_only'`
- After 90 days → `status='disabled'`

**Data Export Feature:**
```python
# New endpoint: GET /organizations/export-data
async def export_organization_data():
    # Export all org data to CSV/Excel
    - Employees
    - Shifts & assignments
    - Clients & sites
    - Payroll records
    - Certifications
```

### 8. SuperAdmin Registration (NEW)

**Special Registration Endpoint:**
```python
# POST /superadmin/register?token=<SECRET>
@router.post("/superadmin/register")
async def register_superadmin(
    token: str,
    user_data: UserCreate,
    settings: Settings = Depends(get_settings)
):
    # 1. Verify secret token
    if token != settings.SUPERADMIN_REGISTRATION_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")

    # 2. Create user with role='superadmin'
    user = User(**user_data.dict(), role='superadmin', org_id=None)
    db.add(user)
    db.commit()

    return {"message": "SuperAdmin created successfully"}
```

### 9. Database Cleanup

**Remove unused tables** (21 tables)
**Remove unused models** (matching files)
**Create down migrations**

---

## 📅 Phased Implementation Plan

### Phase 1: Cleanup & Stabilization (Week 1)
**Goal:** Remove all unnecessary features, stabilize core system

**Tasks:**
1. ✅ Complete planning session (DONE)
2. ✅ Answer 11 clarification questions (DONE)
3. Create backup branch: `archive/removed-features`
4. Remove backend files (18 endpoint files, 21 model files)
5. Update `main.py` and `__init__.py` imports
6. Remove frontend pages (22 pages)
7. Update navigation menus
8. Create database down migrations for 21 tables
9. **KEEP** shift_templates (moved from remove list)
10. Test core features still work
11. Commit: "chore: Remove marketplace and advanced features"

**Deliverable:** Clean, minimal MVP codebase (14 core tables)

### Phase 2: Shift Assignment Redesign (Week 2)
**Goal:** Support multiple guards per shift

**Tasks:**
1. Create migration: add `required_staff` to shifts
2. Create new `shift_assignments` table structure
3. Migrate existing data from `assigned_employee_id`
4. Remove `assigned_employee_id` column
5. Update ShiftService for new structure
6. Update roster generator algorithm
7. Update shift endpoints (assign/unassign guards)
8. Update frontend shift management UI
9. Test shift assignment workflow
10. Commit: "feat: Support multiple guards per shift"

**Deliverable:** Multi-guard shift assignment working

### Phase 3: Complete Multi-Tenancy (Week 2-3)
**Goal:** Full organization isolation

**Tasks:**
1. Run existing migration: `alembic upgrade head`
2. Add org_id to all necessary endpoints
3. Update roster generator with org filtering
4. Test data isolation between orgs
5. Update frontend to show org context
6. Add org switcher (if user in multiple orgs)
7. Test with multiple test organizations
8. Commit: "feat: Complete multi-tenancy implementation"

**Deliverable:** Organizations fully isolated

### Phase 4: Subscription System (Week 3-4)
**Goal:** Organizations can subscribe and pay, with trials and limits

**Tasks:**
1. **Organization Lifecycle:**
   - Add status, trial_expires_at, cancelled_at to organizations table
   - Implement trial period (14 days on registration)
   - Create daily cron job for trial expiration checks
   - Implement read-only mode for cancelled subscriptions
   - Create data export endpoint

2. **Subscription Plans:**
   - Finalize subscription_plans table (with max_guards field)
   - Seed default plans: Free (10), Basic (50), Pro (200), Enterprise (unlimited)
   - Create subscription signup flow (frontend)

3. **PayFast Integration:**
   - Integrate PayFast payment gateway
   - Create webhook endpoint for PayFast payment notifications
   - Implement subscription status updates based on payments
   - Test payment flow end-to-end

4. **Guard Limit Enforcement:**
   - Add limit check to employee creation endpoint
   - Count all employees (active + inactive)
   - Hard block with error message when limit exceeded
   - Create upgrade prompts in UI

5. **Subscription Management:**
   - Create upgrade/downgrade flows
   - Handle subscription changes (immediate vs next billing cycle)
   - Implement downgrade grace period if needed
   - Test all subscription state transitions

6. Commit: "feat: Add PayFast subscriptions with trials and guard limits"

**Deliverable:** Full subscription lifecycle working

### Phase 5: SuperAdmin Portal (Week 4-5)
**Goal:** Platform owner can manage everything

**Tasks:**
1. **SuperAdmin Authentication:**
   - Create special registration endpoint with secret token
   - Add SUPERADMIN_REGISTRATION_TOKEN to .env
   - Implement role-based access control (superadmin vs orgadmin)
   - Create superadmin login flow

2. **Organization Management:**
   - Build organization list dashboard (all orgs)
   - View organization details (guards, clients, sites, usage)
   - Approve/suspend organizations
   - Extend trial periods manually
   - Force subscription changes if needed

3. **Subscription Management:**
   - View all subscriptions (active, trial, cancelled, overdue)
   - See payment status and history
   - Manually update subscription status (for support)
   - Handle failed payments
   - Generate subscription reports

4. **Platform Analytics:**
   - Total revenue (monthly, yearly)
   - Number of active organizations
   - Platform-wide statistics (total guards, shifts, sites)
   - Growth metrics (new signups, churn rate)
   - Trial conversion rates

5. **Frontend:**
   - Build SuperAdmin dashboard UI
   - Organization management interface
   - Subscription management interface
   - Analytics charts and graphs

6. Test superadmin workflows
7. Commit: "feat: Add SuperAdmin portal with special registration"

**Deliverable:** SuperAdmin can oversee platform

### Phase 6: Basic Payroll & Billing (Week 5)
**Goal:** Calculate guard pay and client billable hours

**Tasks:**
1. **Payroll Calculation (Guard Pay):**
   - Create payroll calculation service (based on assigned shifts)
   - Calculate hours from shift start_time to end_time
   - Multiply hours by employee hourly_rate
   - Generate payroll report per employee per period
   - Add payroll endpoints (GET /payroll/calculate)
   - Create payroll UI (view reports, export CSV)

2. **Billable Hours Tracking (Client Invoicing):**
   - Create billable hours calculation service
   - Calculate total hours per client per period
   - Use site.billing_rate for calculations
   - Generate billable hours report with breakdown by site
   - Add billable hours endpoint (GET /payroll/billable-hours/{client_id})
   - Create billing report UI (view and export)

3. **Testing:**
   - Test payroll calculations with various shift scenarios
   - Test billable hours with multiple sites per client
   - Verify calculations match expected results
   - Test export functionality

4. Commit: "feat: Add payroll calculations and billable hours tracking"

**Deliverable:** Payroll reports + billable hours reports generated

### Phase 7: Polish & Testing (Week 6)
**Goal:** Production-ready MVP

**Tasks:**
1. Comprehensive testing all features
2. Fix bugs found during testing
3. Performance optimization
4. Update documentation
5. Create user guide
6. Deployment preparation
7. Security audit
8. Final testing

**Deliverable:** Production-ready RostraCore MVP

---

## ✅ Success Criteria

### MVP is complete when:

**Core Features:**
- [ ] Organizations can register with 14-day trial
- [ ] Organizations can subscribe via PayFast
- [ ] Org admins can manage employees (within plan limits)
- [ ] Org admins can manage clients (duplicate names allowed)
- [ ] Org admins can manage sites (with billing_rate)
- [ ] Org admins can create shifts (with required_staff)
- [ ] Org admins can create shift templates (recurring shifts)
- [ ] System can assign multiple guards to one shift
- [ ] Shift assignments have pending/confirmed workflow
- [ ] Guards can mark unavailable times
- [ ] Roster generator works with multi-tenancy and cert preferences
- [ ] Certifications tracked with expiry warnings
- [ ] Basic payroll calculations work (shift-based, no attendance)
- [ ] Billable hours tracking per client per period
- [ ] Dashboard shows org-specific metrics

**Subscription Features:**
- [ ] Trial period (14 days) on registration
- [ ] Guard limits enforced (check on employee creation)
- [ ] Hard block when limit exceeded with upgrade prompt
- [ ] Inactive employees counted toward limit
- [ ] PayFast payment integration working
- [ ] Subscription status updates from payments
- [ ] Upgrade/downgrade flows functional
- [ ] 90-day read-only period after cancellation
- [ ] Data export feature available

**SuperAdmin Features:**
- [ ] SuperAdmin registration via special token
- [ ] SuperAdmin can view all organizations
- [ ] SuperAdmin can approve/suspend organizations
- [ ] SuperAdmin can extend trial periods
- [ ] SuperAdmin can view all subscriptions
- [ ] SuperAdmin can see platform analytics
- [ ] SuperAdmin can see revenue metrics
- [ ] SuperAdmin can manually update subscriptions

**Technical:**
- [ ] All data isolated by org_id
- [ ] Role-based access (superadmin vs orgadmin)
- [ ] No security vulnerabilities
- [ ] Fast page loads (<2 seconds)
- [ ] Mobile responsive
- [ ] Certification soft matching with warnings
- [ ] Daily cron job for trial expirations

---

## 🎯 MVP Scope Summary

**What's IN the MVP:**
- ✅ Multi-tenant SaaS platform
- ✅ Organization management
- ✅ Employee management (with org_id)
- ✅ Client management (with org_id)
- ✅ Site management (with client_id)
- ✅ Shift management (with required_staff)
- ✅ Multi-guard shift assignments
- ✅ PSIRA certification tracking
- ✅ Employee availability (block-out)
- ✅ Roster generation (org-filtered)
- ✅ Basic payroll calculation
- ✅ Subscription plans (guard-based tiers)
- ✅ PayFast payment integration
- ✅ SuperAdmin portal (org, subscription, analytics)
- ✅ Dashboard (org-specific)
- ✅ Authentication & authorization

**What's OUT of MVP (Add Later):**
- ❌ All marketplace features
- ❌ Attendance tracking
- ❌ Incident reports
- ❌ Daily occurrence book
- ❌ Leave requests
- ❌ Expense management
- ❌ Advanced analytics
- ❌ Employee portal
- ❌ Mobile app

---

## 📦 Database Schema Summary

```
Core Entities (14 tables):
├── users (authentication, role: superadmin/orgadmin)
├── organizations (tenants, status: trial/active/cancelled, trial_expires_at, cancelled_at)
├── subscription_plans (pricing tiers, max_guards limit)
├── subscriptions (org subscriptions, payment_status)
├── employees (org_id required, optional assigned_client_id, status: active/inactive)
├── certifications (employee certs, expiry tracking)
├── clients (org_id, duplicate names allowed)
├── sites (client_id, billing_rate for invoicing)
├── shifts (site_id, required_staff, status)
├── shift_assignments (shift_id, employee_id, status: pending/confirmed/cancelled) ← NEW
├── shift_templates (recurring shift patterns) ← KEPT
├── availability (employee unavailable times, available=FALSE)
├── payroll (shift-based calculations, no attendance tracking)
└── alembic_version (migrations)
```

**Key Relationships:**
- Organization → has many → Employees, Clients, Users
- Organization → has one → Subscription
- Client → has many → Sites
- Site → has many → Shifts, Shift Templates
- Shift → has many → Shift Assignments (employees)
- Employee → has many → Certifications, Availability records
- Employee → optionally assigned to → Client
- Subscription → belongs to → Subscription Plan (enforces max_guards limit)

---

## 🚀 Next Steps

1. **Get final approval** on this MVP plan
2. **Create git branches:**
   - `cleanup/remove-features` - For cleanup work
   - `archive/removed-features` - Archive deleted code
   - `feature/multi-guard-shifts` - Shift redesign
   - `feature/subscriptions` - PayFast integration
   - `feature/superadmin` - SuperAdmin portal

3. **Start Phase 1:** Cleanup and stabilization
4. **Weekly check-ins** to review progress
5. **Adjust timeline** as needed based on complexity

---

**Ready to proceed with Phase 1?**
