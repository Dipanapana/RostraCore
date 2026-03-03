# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Security companies generate optimized guard rosters respecting PSIRA compliance, availability, and client constraints — reducing manual scheduling from hours to minutes
**Current focus:** Phase 01.1 - Roster Downstream Integrity

## Current Position

Phase: 01.1-roster-downstream-integrity
Plan: 3 of TBD in current phase
Status: In progress
Last activity: 2026-03-03 — Plan 02 complete: N+1 query fix in revenue-vs-cost report (ROST-03), Roster record creation in /confirm endpoint (ROST-04/05/06).

Progress: [███░░░░░░░] 15%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 min
- Total execution time: 15 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security-hardening | 2 | 12 min | 6 min |
| 01.1-roster-downstream-integrity | 2 | 3 min | ~2 min |

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

### Pending Todos

None yet.

### Blockers/Concerns

- SEC-01 requires a full endpoint audit — ~95 backend endpoint files to check. Some may be complex to lock down without breaking existing clients.
- TEST-05 (>60% coverage) starts from a very low baseline (~5%). Phase 3 will be the most time-intensive phase.
- PAY-02 (SMS verification) requires choosing and integrating an external SMS provider — cost and SA-market availability need confirming before implementation.

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 01.1-02-PLAN.md (reports N+1 fix, confirm Roster record creation — ROST-03/04/05/06)
Resume file: None
