# RostraCore Simplification Plan

**Date:** November 14, 2025
**Status:** 🔴 **PLANNING PHASE**
**Goal:** Strip down to core features only, remove all unnecessary complexity

---

## 🎯 Core Features to KEEP

Based on your requirements, we're keeping ONLY these features:

1. **Employee Management** - Create, edit, view security guards
2. **Certification Management** - Track PSIRA certs, expiry dates
3. **Client Management** - Manage municipalities/clients
4. **Site Management** - Manage guard posts/locations
5. **Shift Management** - Create and assign shifts
6. **Roster Generation** - Auto-assign guards to shifts
7. **Basic Dashboard** - View key metrics
8. **Authentication** - Login/logout
9. **Organization (Multi-tenancy)** - Each security company isolated

---

## 📊 DATABASE CLEANUP

### Tables to KEEP ✅

| Table | Purpose | Priority |
|-------|---------|----------|
| `users` | Authentication accounts | CRITICAL |
| `organizations` | Multi-tenancy | CRITICAL |
| `employees` | Security guards | CRITICAL |
| `certifications` | PSIRA certs | CRITICAL |
| `clients` | Municipalities | CRITICAL |
| `sites` | Guard posts | CRITICAL |
| `shifts` | Work shifts | CRITICAL |
| `availability` | Guard availability (for roster) | HIGH |
| `alembic_version` | Migration tracking | SYSTEM |

**Total: 9 tables**

### Tables to REMOVE 🗑️

| Table | Reason |
|-------|--------|
| `analytics` | Extra feature - not core |
| `attendance` | Can add later when stable |
| `daily_occurrence_book` | Extra feature |
| `ob_entries` | Extra feature |
| `expenses` | Can add later |
| `guard_applicants` | Marketplace feature |
| `guard_ratings` | Marketplace feature |
| `job_applications` | Marketplace feature |
| `job_postings` | Marketplace feature |
| `marketplace_commissions` | Marketplace feature |
| `marketplace_settings` | Marketplace feature |
| `subscription_plans` | Marketplace feature |
| `bulk_hiring_packages` | Marketplace feature |
| `premium_job_postings` | Marketplace feature |
| `incident_reports` | Can add later |
| `leave_requests` | Can add later |
| `payroll` | Can add later |
| `roster_assignments` | Possible duplicate |
| `shift_assignments` | Possible duplicate |
| `shift_groups` | Extra feature |
| `shift_templates` | Can add later |
| `skills_matrix` | Extra feature |
| `rules_config` | Extra complexity |
| `superadmin_users` | Might be duplicate of users |
| `cv_generations` | Marketplace feature |

**Total: ~25 tables to remove**

---

## 🔌 API CLEANUP

### Endpoints to KEEP ✅

**Core APIs:**
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/register` - Register new account
- `GET /employees/` - List employees
- `POST /employees/` - Create employee
- `GET /employees/{id}` - Get employee
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Delete employee
- `GET /certifications/` - List certifications
- `POST /certifications/` - Add certification
- `PUT /certifications/{id}` - Update certification
- `DELETE /certifications/{id}` - Delete certification
- `GET /clients/` - List clients
- `POST /clients/` - Create client
- `GET /clients/{id}` - Get client
- `PUT /clients/{id}` - Update client
- `DELETE /clients/{id}` - Delete client
- `GET /sites/` - List sites
- `POST /sites/` - Create site
- `GET /sites/{id}` - Get site
- `PUT /sites/{id}` - Update site
- `DELETE /sites/{id}` - Delete site
- `GET /shifts/` - List shifts
- `POST /shifts/` - Create shift
- `PUT /shifts/{id}` - Update shift
- `DELETE /shifts/{id}` - Delete shift
- `POST /roster/generate` - Generate roster
- `POST /roster/confirm` - Confirm roster
- `GET /dashboard/metrics` - Dashboard metrics
- `GET /availability/` - List availability
- `POST /availability/` - Set availability

**Total: ~30 core endpoints**

### Endpoint Files to DELETE 🗑️

```
app/api/endpoints/analytics.py
app/api/endpoints/attendance.py
app/api/endpoints/cv_generator.py
app/api/endpoints/daily_reports.py
app/api/endpoints/dashboards.py (duplicate)
app/api/endpoints/employee_permissions.py
app/api/endpoints/employee_portal.py
app/api/endpoints/expenses.py
app/api/endpoints/exports.py
app/api/endpoints/guard_ratings.py
app/api/endpoints/incident_reports.py
app/api/endpoints/jobs.py
app/api/endpoints/leave_requests.py
app/api/endpoints/marketplace_applications.py
app/api/endpoints/marketplace_guards.py
app/api/endpoints/marketplace_jobs.py
app/api/endpoints/marketplace_revenue.py
app/api/endpoints/marketplace_settings.py
app/api/endpoints/organization_approval.py
app/api/endpoints/organization_subscriptions.py
app/api/endpoints/organization_users.py
app/api/endpoints/payments.py
app/api/endpoints/payroll.py
app/api/endpoints/predictions.py
app/api/endpoints/shift_groups.py
app/api/endpoints/subscription_plans.py
app/api/endpoints/subscriptions.py
app/api/endpoints/superadmin_analytics.py
app/api/endpoints/superadmin_auth.py
```

**Total: ~28 files to delete**

---

## 🖥️ FRONTEND CLEANUP

### Pages to KEEP ✅

**Core UI:**
- `/login` - Login page
- `/register` - Registration
- `/dashboard` - Main dashboard
- `/employees` - Employee list
- `/clients` - Client list
- `/sites` - Site list
- `/shifts` - Shift management
- `/certifications` - Certification management
- `/roster` - Roster generation
- `/availability` - Guard availability
- `/organizations` - Organization management

**Total: 11 pages**

### Pages to DELETE 🗑️

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
dashboards/page.tsx (old dashboard)
employee/daily-report/
employee/dashboard/
employee/incidents/
employee/leave/
employee/login/
employee/profile/
expenses/
landing/
marketplace/cv-templates/
marketplace/
payroll/
pricing/
superadmin/
superadmin/subscription-plans/
test-dashboard/
```

**Total: ~25+ pages to delete**

---

## 🗂️ MODEL FILES CLEANUP

### Files to KEEP ✅

```
app/models/__init__.py
app/models/employee.py
app/models/certification.py
app/models/client.py
app/models/site.py
app/models/shift.py
app/models/roster.py
app/models/user.py
app/models/organization.py
app/models/availability.py
app/models/schemas.py
```

**Total: 10 files**

### Files to DELETE 🗑️

```
app/models/analytics.py
app/models/attendance.py
app/models/auth_schemas.py (maybe merge into schemas.py)
app/models/cv_generation.py
app/models/daily_occurrence_book.py
app/models/expense.py
app/models/guard_applicant.py
app/models/guard_rating.py
app/models/incident_report.py
app/models/job_application.py
app/models/job_posting.py
app/models/leave_request.py
app/models/marketplace_commission.py
app/models/marketplace_settings.py
app/models/ob_entry.py
app/models/payroll.py
app/models/rules_config.py
app/models/shift_assignment.py (check for duplicates first)
app/models/shift_group.py
app/models/shift_template.py
app/models/skills_matrix.py
app/models/subscription_plan.py
app/models/superadmin_user.py
```

**Total: ~23 files to delete**

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Analysis & Backup ✅
- [x] Analyze current state
- [ ] Backup current database
- [ ] Create git branch for cleanup

### Phase 2: Backend Cleanup
1. **Remove API endpoints** (delete files listed above)
2. **Remove model files** (delete files listed above)
3. **Update main.py** to remove deleted endpoint imports
4. **Update __init__.py** files to remove deleted model imports
5. **Remove service files** for deleted features

### Phase 3: Database Migration
1. **Create down migrations** to drop unnecessary tables
2. **Test migration on development database**
3. **Document rollback procedure**

### Phase 4: Frontend Cleanup
1. **Delete unnecessary pages** (listed above)
2. **Update navigation** to remove deleted pages
3. **Simplify dashboard** to show only core metrics
4. **Remove unused components**

### Phase 5: Testing
1. **Test core features:**
   - Employee CRUD
   - Client CRUD
   - Site CRUD
   - Shift CRUD
   - Certification CRUD
   - Roster generation
   - Dashboard metrics
2. **Verify no broken imports**
3. **Test authentication flow**

### Phase 6: Cleanup & Documentation
1. **Remove unused dependencies** from requirements.txt
2. **Update README** to reflect simplified architecture
3. **Document core API endpoints**
4. **Create simple user guide**

---

## 🎯 Expected Results

### Before Cleanup:
- **Tables:** ~35 tables
- **API Endpoints:** ~50+ endpoints
- **UI Pages:** ~40 pages
- **Model Files:** ~35 files
- **Status:** Bloated, breaking, hard to maintain

### After Cleanup:
- **Tables:** 9 core tables
- **API Endpoints:** ~30 endpoints
- **UI Pages:** 11 pages
- **Model Files:** 10 files
- **Status:** Lean, stable, maintainable

---

## ⚠️ RISKS & MITIGATION

| Risk | Mitigation |
|------|------------|
| Accidental deletion of needed code | Create backup branch before starting |
| Database corruption | Backup database before migrations |
| Broken imports | Test thoroughly after each deletion |
| Missing functionality | Keep deleted code in archive branch |

---

## 📦 Archive Strategy

**Don't permanently delete everything!**

1. Create archive branch: `archive/marketplace-features`
2. Move deleted code to archive branch
3. Keep archive for potential future use
4. Main branch only has core features

---

## 🚀 Next Steps

1. **Get your approval on this plan**
2. **Create database backup**
3. **Create git branches:**
   - `cleanup/backend` - Backend cleanup work
   - `cleanup/frontend` - Frontend cleanup work
   - `archive/removed-features` - Archive deleted code
4. **Start with backend cleanup** (safest to start here)
5. **Test after each major deletion**
6. **Document as we go**

---

## 💡 NOTES

- Multi-tenancy (org_id) work should be **paused** until after cleanup
- Focus on **stability first**, features later
- Test frequently to catch breaks early
- Keep it simple - add features gradually AFTER this is stable

---

**Ready to proceed?** Let me know and I'll start with Phase 2 (Backend Cleanup).
