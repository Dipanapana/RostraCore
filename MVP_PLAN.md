# RostraCore MVP Plan - FINAL

**Date:** November 14, 2025
**Status:** 🟢 **APPROVED - Ready for Implementation**
**Business Model:** SaaS Platform for Security Companies

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

### ✅ TABLES TO KEEP (13 Core Tables)

| # | Table | Purpose | Key Fields |
|---|-------|---------|------------|
| 1 | `users` | Authentication accounts | user_id, username, email, org_id, role |
| 2 | `organizations` | Security companies (tenants) | org_id, org_name, contact_email |
| 3 | `employees` | Security guards | employee_id, org_id, assigned_client_id |
| 4 | `certifications` | PSIRA certifications | cert_id, employee_id, cert_type, expiry_date |
| 5 | `clients` | Municipalities | client_id, org_id, client_name |
| 6 | `sites` | Guard posts/locations | site_id, client_id, address, gps |
| 7 | `shifts` | Work shifts | shift_id, site_id, start_time, end_time, **required_staff** |
| 8 | `shift_assignments` | Guards assigned to shifts | assignment_id, shift_id, employee_id, status |
| 9 | `availability` | Guard availability blocks | avail_id, employee_id, date, start_time, end_time, available=FALSE |
| 10 | `payroll` | Basic payroll calculations | payroll_id, employee_id, period, total_hours, gross_pay |
| 11 | `subscription_plans` | Pricing tiers | plan_id, plan_name, max_guards, price_monthly |
| 12 | `subscriptions` | Org subscriptions | subscription_id, org_id, plan_id, status, payment_status |
| 13 | `alembic_version` | Migration tracking | version_num |

**Total: 13 tables**

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
- ❌ `attendance` - Clock in/out tracking
- ❌ `incident_reports` - Incident logging
- ❌ `daily_occurrence_book` - OB book
- ❌ `ob_entries` - OB entries
- ❌ `leave_requests` - Leave management
- ❌ `expenses` - Expense tracking
- ❌ `analytics` - Advanced analytics

**Possibly Unused/Duplicate:**
- ❌ `shift_groups` - (Check if used)
- ❌ `shift_templates` - (Check if used)
- ❌ `skills_matrix` - (Check if used)
- ❌ `rules_config` - (Check if used)
- ❌ `superadmin_users` - (May be duplicate of users table)

**Total: ~22 tables to remove**

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
- `POST /payroll/calculate` (for period)
- `GET /payroll/{id}`
- `GET /payroll/employee/{employee_id}`

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

### 5. Database Cleanup

**Remove unused tables** (22 tables)
**Remove unused models** (matching files)
**Create down migrations**

---

## 📅 Phased Implementation Plan

### Phase 1: Cleanup & Stabilization (Week 1)
**Goal:** Remove all unnecessary features, stabilize core system

**Tasks:**
1. ✅ Complete planning session (DONE)
2. Create backup branch: `archive/removed-features`
3. Remove backend files (19 endpoint files, 22 model files)
4. Update `main.py` and `__init__.py` imports
5. Remove frontend pages (22 pages)
6. Update navigation menus
7. Create database down migrations for 22 tables
8. Test core features still work
9. Commit: "chore: Remove marketplace and advanced features"

**Deliverable:** Clean, minimal MVP codebase

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
**Goal:** Organizations can subscribe and pay

**Tasks:**
1. Finalize subscription_plans table
2. Create subscription signup flow (frontend)
3. Integrate PayFast payment gateway
4. Create webhook endpoint for PayFast
5. Implement subscription status checks
6. Enforce guard limits based on plan
7. Create upgrade/downgrade flows
8. Test payment flow end-to-end
9. Commit: "feat: Add PayFast subscription system"

**Deliverable:** Working subscription payments

### Phase 5: SuperAdmin Portal (Week 4-5)
**Goal:** Platform owner can manage everything

**Tasks:**
1. Create superadmin authentication
2. Build organization management dashboard
3. Build subscription management interface
4. Create platform analytics dashboard
5. Add organization approval workflow
6. Add revenue tracking
7. Test superadmin workflows
8. Commit: "feat: Add SuperAdmin portal"

**Deliverable:** SuperAdmin can oversee platform

### Phase 6: Basic Payroll (Week 5)
**Goal:** Calculate guard pay for periods

**Tasks:**
1. Create payroll calculation service
2. Build payroll report generation
3. Add payroll endpoints
4. Create payroll UI (view reports)
5. Test payroll calculations
6. Commit: "feat: Add basic payroll calculations"

**Deliverable:** Payroll reports generated

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
- [x] Organizations can register
- [x] Organizations can subscribe (PayFast)
- [x] Org admins can manage employees
- [x] Org admins can manage clients
- [x] Org admins can manage sites
- [x] Org admins can create shifts (with required_staff)
- [x] System can assign multiple guards to one shift
- [x] Guards can mark unavailable times
- [x] Roster generator works with multi-tenancy
- [x] Certifications tracked with expiry warnings
- [x] Basic payroll calculations work
- [x] Dashboard shows org-specific metrics

**SuperAdmin Features:**
- [x] SuperAdmin can view all organizations
- [x] SuperAdmin can approve/suspend organizations
- [x] SuperAdmin can view all subscriptions
- [x] SuperAdmin can see platform analytics
- [x] SuperAdmin can see revenue metrics

**Technical:**
- [x] All data isolated by org_id
- [x] No security vulnerabilities
- [x] Fast page loads (<2 seconds)
- [x] Mobile responsive
- [x] PayFast payments working
- [x] Guard limits enforced per plan

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
Core Entities (13 tables):
├── users (authentication)
├── organizations (tenants)
├── subscription_plans (pricing tiers)
├── subscriptions (org subscriptions)
├── employees (org_id, optional assigned_client_id)
├── certifications (employee certs)
├── clients (org_id)
├── sites (client_id)
├── shifts (site_id, required_staff)
├── shift_assignments (shift_id, employee_id) ← NEW
├── availability (employee blocks)
├── payroll (basic calculations)
└── alembic_version (migrations)
```

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
