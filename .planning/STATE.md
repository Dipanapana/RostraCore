# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Security companies generate optimized guard rosters respecting PSIRA compliance, availability, and client constraints — reducing manual scheduling from hours to minutes
**Current focus:** Phase 2 - CI/CD Pipeline (next up)

## Current Position

Phase: 2-cicd-pipeline
Plan: 0 of TBD in current phase
Status: Phases 1–1.7 ALL COMPLETE. Milestone 1 production-ready overhaul done.
Last activity: 2026-03-04 — E2E flow verified: EasyRoster import→roster generation→payroll→invoicing→dashboards all working.

Progress: [██████████] 100% (Milestone 1 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 4 min
- Total execution time: 40 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security-hardening | 2 | 12 min | 6 min |
| 01.1-roster-downstream-integrity | 2 | 3 min | ~2 min |
| 01.2-sidebar-cleanup | 1 | 3 min | 3 min |
| 01.3-easyroster-import | 1 | 5 min | 5 min |
| 01.4-roles-permissions-audit | 1 | 3 min | 3 min |
| 01.5-dashboard-financial-ui | 1 | 2 min | 2 min |
| 01.6-desktop-application | 1 | 5 min | 5 min |
| 01.7-e2e-roster-magic-flow | 1 | 10 min | 10 min |

**Recent Trend:**
- Last 5 plans: 5 min, 7 min, 3 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase A]: Dashboard endpoints secured (4 endpoints now require auth — leaked financials to unauthenticated requests)
- [Phase A]: Superadmin check added to org creation (prevented privilege escalation)
- [Phase A]: JWT expiry reduced from 480 to 30 minutes (hardened session security)
- [Phase A]: Test endpoint removed (no debug endpoints in production)
- [01-01]: GET /constraints uses get_current_user (any authenticated user can read solver config)
- [01-01]: PUT /constraints and POST /constraints/reset use is_admin (write access requires admin role)
- [01-01]: Payroll calculation endpoints use get_current_user — tax math is read-only; /config uses stricter require_finance_access
- [Phase 01-security-hardening]: PASSWORD_MIN_LENGTH not changed — existing value (12) is appropriate; four-class regex validation added on top
- [Phase 01-security-hardening]: CORS restricted from wildcard ['*'] to explicit method and header allowlists to reduce attack surface
- [Phase 01-security-hardening]: SEC-06: backend/.env confirmed gitignored; .env.example completed with REDIS_URL, YOCO, Twilio placeholder vars
- [Phase 01.1-01]: Dashboard fill-rate and cost metrics now use ShiftAssignment join (status != cancelled) instead of non-existent Shift.assigned_employee_id and Shift.cost fields
- [Phase 01.1-01]: No Attendance model exists — attendance tracking uses ShiftAssignment.checked_in/check_in_time throughout dashboards
- [Phase 01.1-01]: PayrollSummary columns are period_start and gross_pay (not pay_period_start/total_pay/regular_pay/overtime_pay)
- [01.1-02]: revenue-vs-cost uses joinedload(shift).joinedload(site).joinedload(client) — no per-assignment queries inside loop
- [01.1-02]: confirm_roster creates Roster record, flushes for roster_id, links each ShiftAssignment; db.commit() once after loop for atomicity
- [01.1-02]: Roster status set to "draft" on confirmation; lifecycle progresses via separate publish flow
- [01.1-02]: roster_code format R{YYYY-MM}-{6-char-hex} for collision-free unique codes
- [01.2]: 23 nav items hidden via HIDDEN_NAV_KEYS Set (not deleted). Archive in .planning/ARCHIVED_NAV_ITEMS.md. Restoration = remove key from Set.
- [01.3]: employee_number added to Employee model (nullable, indexed). EasyRoster 36-column format supported via ExcelImportService.import_from_easyroster(). Endpoint: POST /api/v1/employees/import-easyroster
- [01.4]: Full audit complete — 94+ endpoint files have auth. No critical gaps found. test_data.py and logout endpoint are acceptable as-is.
- [01.5]: All dashboards (executive, operations, financial, people-analytics) + payroll + invoicing + reports already production-ready with real data, charts, filters, and PDF/Excel exports
- [01.6]: Tauri v2 desktop app initialized. Builds .msi + .nsis for Windows. Points to Vercel frontend (prod) or localhost:3000 (dev). Needs Windows SDK for final build.
- [01.7]: E2E verified: EasyRoster import (60 employees, all fields correct), roster generation (optimal, 240 assignments), all 5 dashboards return 200, payroll (R604K gross for 60 employees), invoicing (Shoprite R172K), PDF report exports working.
- [01.7]: Fixed operations dashboard: Availability.available (not is_available), cert expiry_date is date not datetime (use .date() for comparison)

### Pending Todos

- Install Windows SDK for Tauri desktop build (rc.exe needed for .msi generation)
- Deploy latest backend to Railway (includes EasyRoster import, operations dashboard fixes)
- Run Alembic migration add_employee_number_001 on production DB

### Blockers/Concerns

- SEC-01 RESOLVED: Full endpoint audit complete — 94+ files protected, no critical gaps
- TEST-05 (>60% coverage) starts from a very low baseline (~5%). Phase 3 will be the most time-intensive phase.
- PAY-02 (SMS verification) requires choosing and integrating an external SMS provider — cost and SA-market availability need confirming before implementation.
- Desktop build requires Windows SDK (rc.exe) for .msi packaging — install Visual Studio Build Tools

## Session Continuity

Last session: 2026-03-04
Stopped at: All Phases 1–1.7 COMPLETE. Ready for Phase 2 (CI/CD Pipeline).
Resume file: None
