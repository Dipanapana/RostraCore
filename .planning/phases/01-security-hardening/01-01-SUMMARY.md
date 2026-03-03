---
phase: 01-security-hardening
plan: 01
subsystem: auth
tags: [fastapi, jwt, authentication, security, payroll, settings]

# Dependency graph
requires: []
provides:
  - JWT authentication required on all constraint settings endpoints (GET/PUT/POST)
  - JWT authentication required on all 6 payroll deduction calculation endpoints
  - Admin-only access enforced on constraint write/reset operations
affects:
  - 02-security-hardening
  - any phase touching payroll or settings endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Depends(get_current_user) added to endpoint parameter list to require JWT for read access"
    - "Depends(is_admin) added to endpoint parameter list to require admin role for write/mutation access"

key-files:
  created: []
  modified:
    - backend/app/api/endpoints/settings.py
    - backend/app/api/endpoints/payroll_deductions.py

key-decisions:
  - "GET /constraints uses get_current_user (any authenticated user can read solver config)"
  - "PUT /constraints and POST /constraints/reset use is_admin (only admins can modify runtime config)"
  - "All 6 payroll deduction calculation endpoints use get_current_user (any auth user can compute tax)"
  - "/config and PUT /config in payroll_deductions.py left unchanged with require_finance_access"

patterns-established:
  - "Pattern: add current_user: User = Depends(get_current_user) as final parameter on unprotected FastAPI endpoints"
  - "Pattern: use is_admin for mutation endpoints that modify server-side runtime state"

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 1 Plan 01: Protect Unprotected Settings and Payroll Endpoints Summary

**Blocked unauthenticated access to 9 endpoints (3 constraint settings + 6 payroll tax calculations) by adding JWT Depends() guards, closing SEC-01 violations in settings.py and payroll_deductions.py**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-03T08:41:33Z
- **Completed:** 2026-03-03T08:46:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `Depends(get_current_user)` to GET /api/v1/settings/constraints — any authenticated user can read solver config
- Added `Depends(is_admin)` to PUT /api/v1/settings/constraints and POST /api/v1/settings/constraints/reset — admin-only write access
- Added `Depends(get_current_user)` to all 6 previously unprotected payroll deduction endpoints: /paye, /uif, /sdl, /net-pay, /cost-to-company, /tax-tables
- 114 existing tests pass with no regressions; 1 pre-existing optimizer test failure confirmed unrelated

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth to settings.py constraint endpoints** - `226b39b` (feat)
2. **Task 2: Add auth to unprotected payroll_deductions.py endpoints** - `96b7197` (feat)

## Files Created/Modified
- `backend/app/api/endpoints/settings.py` - Added Depends, get_current_user, is_admin, User imports; applied auth deps to all 3 constraint routes
- `backend/app/api/endpoints/payroll_deductions.py` - Added get_current_user to import; added User import; applied current_user dep to 6 calculation routes

## Decisions Made
- GET /constraints uses `get_current_user` (read-only, any role): reading solver config is non-destructive
- PUT and POST /constraints/reset use `is_admin`: modifying runtime configuration is privileged action
- Payroll calculation endpoints use `get_current_user` (not `require_finance_access`): tax math is read-only computation; finance-role restriction reserved for /config which reads/writes org-specific stored config
- Left /config and PUT /config unchanged — they already use `require_finance_access` which is stricter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in `tests/test_production_optimizer.py::TestOptimizationConfig::test_default_config` (asserts `time_limit_seconds == 120` but gets `300`). Confirmed pre-existing by stash test — unrelated to this plan's changes. Logged as deferred item.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- settings.py and payroll_deductions.py fully locked down with JWT auth
- Both files compile cleanly and app loads without errors
- Ready for Plan 02 which continues the SEC-01 endpoint audit

## Self-Check: PASSED

- FOUND: backend/app/api/endpoints/settings.py
- FOUND: backend/app/api/endpoints/payroll_deductions.py
- FOUND: .planning/phases/01-security-hardening/01-01-SUMMARY.md
- FOUND commit: 226b39b (Task 1)
- FOUND commit: 96b7197 (Task 2)

---
*Phase: 01-security-hardening*
*Completed: 2026-03-03*
