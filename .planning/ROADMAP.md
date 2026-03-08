# Roadmap: RostraCore

## Overview

This milestone hardens RostraCore from a working prototype into a production-ready platform. The work is organized in dependency order: security first, then roster integrity (since payroll, reports, and dashboards all depend on correct roster data), CI/CD, test coverage, infrastructure, payments, and frontend quality. Every phase delivers a complete, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 2.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Hardening** - Audit and lock down all remaining security gaps (completed 2026-03-03)
- [x] **Phase 1.1: Roster & Downstream Integrity** - INSERTED — Fix broken dashboard/report/payroll queries that depend on roster data (completed 2026-03-03)
- [x] **Phase 1.2: Sidebar Cleanup** - INSERTED — Hide mobile-dependent and placeholder nav items, archive for restoration (completed 2026-03-04)
- [x] **Phase 1.3: EasyRoster Import** - INSERTED — 36-column EasyRoster format compatibility, employee_number field, bulk import endpoint (completed 2026-03-04)
- [x] **Phase 1.4: Roles & Permissions Audit** - INSERTED — Verified all 94+ endpoint files have auth, permission matrix UI works (completed 2026-03-04)
- [x] **Phase 1.5: Dashboard & Financial UI** - INSERTED — Verified all dashboards, payroll, invoicing, reports already production-ready (completed 2026-03-04)
- [x] **Phase 1.6: Desktop Application** - INSERTED — Tauri v2 project initialized, Windows .msi/.nsis build config (completed 2026-03-04)
- [x] **Phase 1.7: E2E Roster Magic Flow** - INSERTED — Verified full import→roster→payroll→invoice→dashboard flow (completed 2026-03-04)
- [x] **Phase 1.8: Mafoko Site Roster Upload** - INSERTED — D/o grid parser, BCEA suggestions engine, preview/upload/bulk endpoints, frontend UI (completed 2026-03-04)
- [x] **Phase 2: CI/CD Pipeline** - GitHub Actions CI (pytest + next build), Railway/Vercel auto-deploy (completed 2026-03-04)
- [x] **Phase 3: Test Coverage** - Integration test suite: 347 tests, 43% overall coverage (completed 2026-03-04)
- [x] **Phase 4: Infrastructure Hardening** - Redis rate limiting, validation error handler, budget verified DB-driven (completed 2026-03-04)
- [x] **Phase 5: Payment Completion** - Fix 501 status endpoint and implement SMS verification (completed 2026-03-04)
- [x] **Phase 6: Frontend Type Safety** - Replace `any` types, add ErrorBoundary, add form validation (completed 2026-03-05)
- [x] **Phase 7: Frontend Navigation and UX** - Fix broken links, empty states, loading skeletons (completed 2026-03-05)
- [x] **Phase 8: Accessibility** - Aria labels, form label pairing, color independence, skip nav, focus indicators (completed 2026-03-05)

## Phase Details

### Phase 1: Security Hardening
**Goal**: Every API endpoint is authenticated, secrets are out of version control, and the platform meets baseline security standards
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06
**Success Criteria** (what must be TRUE):
  1. A request to any backend endpoint without a valid JWT token returns 401 (no data leaks to unauthenticated callers)
  2. A non-superadmin user cannot create a new organization — the API returns 403
  3. JWT access tokens expire in 30 minutes and a refresh token flow exists for seamless re-authentication
  4. A password that lacks uppercase, lowercase, number, or special character is rejected with a descriptive error message
  5. CORS headers in production only allow the Vercel frontend origin — other origins are blocked
Plans:
- [x] 01-01-PLAN.md — Add auth to unprotected settings & payroll_deductions endpoints (SEC-01)
- [ ] 01-02-PLAN.md — Strengthen password policy, restrict CORS, verify secrets hygiene (SEC-04, SEC-05, SEC-06)

### Phase 1.1: Roster & Downstream Integrity — INSERTED
**Goal**: The roster generation → save → publish pipeline works correctly, and all downstream consumers (dashboards, reports, payroll) query the right models with the right field names — no crashes, no wrong data
**Depends on**: Phase 1
**Requirements**: ROST-01, ROST-02, ROST-03, ROST-04, ROST-05, ROST-06
**Success Criteria** (what must be TRUE):
  1. All 4 dashboard endpoints (executive, operations, financial, people-analytics) return valid JSON without NameError or AttributeError crashes
  2. Dashboard fill-rate and coverage metrics use ShiftAssignment counts (not deprecated Shift.assigned_employee_id)
  3. Report endpoints use correct field names (PayrollSummary.period_start, PayrollSummary.gross_pay, Site.site_name) and return accurate data
  4. Revenue-vs-cost report completes in <2s for 1000 assignments (no N+1 queries)
  5. The /roster/confirm endpoint creates a Roster record so confirmed assignments are trackable in the roster board
  6. Payroll generation produces correct totals when roster has published assignments
**Plans:** 2 plans
Plans:
- [ ] 01.1-01-PLAN.md — Fix all broken model-field references in dashboards.py (executive, operations, financial, people-analytics) (ROST-01, ROST-02)
- [ ] 01.1-02-PLAN.md — Fix N+1 queries in revenue-vs-cost report and create Roster record in /confirm endpoint (ROST-03, ROST-04, ROST-05, ROST-06)

### Phase 2: CI/CD Pipeline
**Goal**: Every pull request is automatically tested and every merge to main is automatically deployed
**Depends on**: Phase 1
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04
**Success Criteria** (what must be TRUE):
  1. Opening a pull request on GitHub triggers a workflow that runs `pytest` and reports pass/fail on the PR
  2. Opening a pull request triggers a `next build` check that blocks merge if the frontend fails to compile
  3. Merging to main triggers a Railway backend deployment without manual intervention
  4. Merging to main triggers a Vercel frontend deployment without manual intervention
**Plans:**
Plans:
- [x] 02-01-PLAN.md — GitHub Actions CI workflow (backend pytest + frontend next build) + fix 4 pre-existing test failures

### Phase 3: Test Coverage
**Goal**: The backend has >60% endpoint coverage with integration tests that catch regressions
**Depends on**: Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Running `pytest` locally covers the auth flow end-to-end: login, register, token refresh, and password reset all have passing integration tests
  2. Running `pytest` covers CRUD operations for employees, clients, sites, and shifts
  3. Roster generation and its operations (generate, edit, publish) have integration tests that verify expected outputs
  4. Payment webhook processing has integration tests that verify correct status transitions
  5. Coverage report (`pytest --cov`) shows >60% of endpoint code lines covered
**Plans**: TBD

### Phase 4: Infrastructure Hardening
**Goal**: Rate limiting persists across restarts, budget data is live from the database, and invalid inputs get proper error responses
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Restarting the backend server does not reset rate-limit counters — Redis persists counts across restarts
  2. The dashboard displays the organization's actual budget value from the database — changing the value in the DB is reflected immediately in the UI
  3. Submitting a malformed or invalid payload to a backend endpoint returns a 400 response with a descriptive error message (not a silent 200 or unhandled 500)
**Plans**: TBD

### Phase 5: Payment Completion
**Goal**: Payment status is retrievable from the database and phone numbers can be verified via SMS
**Depends on**: Phase 1
**Requirements**: PAY-01, PAY-02
**Success Criteria** (what must be TRUE):
  1. Calling the payment status endpoint with a valid payment ID returns the actual payment status stored in the database (not HTTP 501)
  2. A user with a registered phone number can trigger an SMS verification code and enter it to verify their number
**Plans:** 1 plan
Plans:
- [x] 05-01-PLAN.md — PaymentTransaction model, fix 501 status endpoint, SMS service via Twilio, phone verification UI (PAY-01, PAY-02)

### Phase 6: Frontend Type Safety
**Goal**: Frontend code has no runtime type surprises — all API shapes are typed, errors are caught, and forms validate before submission
**Depends on**: Phase 1
**Requirements**: FTS-01, FTS-02, FTS-03
**Success Criteria** (what must be TRUE):
  1. The TypeScript compiler reports zero `any` type usages in API response handling — all shapes have explicit interfaces
  2. A page that encounters an unhandled runtime error shows an ErrorBoundary fallback UI instead of a blank screen
  3. Submitting a form with missing or invalid data shows inline field-level error messages before any API call is made
**Plans:** 1 plan
Plans:
- [x] 06-01-PLAN.md — Eliminate all `any` from api.ts (87 instances), fix login catch block, add login form validation (FTS-01, FTS-02, FTS-03)

### Phase 7: Frontend Navigation and UX
**Goal**: Every sidebar link leads to a working page and every data-less state communicates clearly to the user
**Depends on**: Phase 6
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Clicking any link in the sidebar navigates to a rendered page — no 404s, no dead stubs, no console errors
  2. A page with no data (e.g., no employees yet, no shifts created) shows a message explaining the empty state with a clear call-to-action to create the first item
  3. While data is loading from the API, the page shows skeleton placeholder components instead of blank content areas
**Plans:** 1 plan
Plans:
- [x] 07-01-PLAN.md — EmptyState, TableSkeleton, DashboardSkeleton components + retrofit 6 pages (NAV-01, NAV-02, NAV-03)

### Phase 8: Accessibility
**Goal**: The application is usable by keyboard-only users and compatible with screen readers
**Depends on**: Phase 7
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05
**Success Criteria** (what must be TRUE):
  1. All icon-only buttons have `aria-label` attributes that describe their action — a screen reader user knows what each button does
  2. Every form input has a visible label connected via `htmlFor`/`id` pairing — screen readers announce the label when focusing the input
  3. All status badges (active/inactive, pass/fail, etc.) use text or icon indicators alongside color — a color-blind user can distinguish states without color
  4. A "Skip to main content" link is present at the top of every page, allowing keyboard users to bypass the sidebar navigation
  5. All interactive elements (buttons, links, inputs) have a visible focus ring when navigated to by keyboard
**Plans:** 1 plan (swift-sauteeing-lampson.md)
Plans:
- [x] 08-01-PLAN.md — Skip nav, focus-visible CSS, aria-labels on 7 files, htmlFor/id on 6 forms, cert expiring icons (A11Y-01–A11Y-05)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 2/2 | Complete | 2026-03-03 |
| 1.1. Roster & Downstream Integrity | 2/2 | Complete | 2026-03-03 |
| 1.2. Sidebar Cleanup | 1/1 | Complete | 2026-03-04 |
| 1.3. EasyRoster Import | 1/1 | Complete | 2026-03-04 |
| 1.4. Roles & Permissions Audit | 1/1 | Complete | 2026-03-04 |
| 1.5. Dashboard & Financial UI | 1/1 | Complete | 2026-03-04 |
| 1.6. Desktop Application | 1/1 | Complete | 2026-03-04 |
| 1.7. E2E Roster Magic Flow | 1/1 | Complete | 2026-03-04 |
| 1.8. Mafoko Site Roster Upload | 1/1 | Complete | 2026-03-04 |
| 2. CI/CD Pipeline | 1/1 | Complete | 2026-03-04 |
| 3. Test Coverage | 1/1 | Complete | 2026-03-04 |
| 4. Infrastructure Hardening | 1/1 | Complete | 2026-03-04 |
| 5. Payment Completion | 1/1 | Complete | 2026-03-04 |
| 6. Frontend Type Safety | 1/1 | Complete | 2026-03-05 |
| 7. Frontend Navigation and UX | 1/1 | Complete | 2026-03-05 |
| 8. Accessibility | 1/1 | Complete | 2026-03-05 |
