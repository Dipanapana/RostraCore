---
phase: 01-security-hardening
verified: 2026-03-03T10:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "A non-superadmin user cannot create a new organization — the API returns 403"
    status: failed
    reason: "organizations.py create_organization references UserRole.SUPER_ADMIN which does not exist in the UserRole enum (correct name is UserRole.SUPERADMIN). At runtime, any POST to /api/v1/organizations/ raises AttributeError → 500 Internal Server Error, not 403."
    artifacts:
      - path: "backend/app/api/endpoints/organizations.py"
        issue: "Line 134: `if current_user.role != UserRole.SUPER_ADMIN:` — SUPER_ADMIN is not a valid UserRole member. AttributeError at runtime."
    missing:
      - "Change `UserRole.SUPER_ADMIN` to `UserRole.SUPERADMIN` on line 134 of organizations.py"
---

# Phase 01: Security Hardening Verification Report

**Phase Goal:** Every API endpoint is authenticated, secrets are out of version control, and the platform meets baseline security standards
**Verified:** 2026-03-03T10:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A request to any backend endpoint without a valid JWT token returns 401 (no data leaks to unauthenticated callers) | VERIFIED | `settings.py` all 3 routes use `Depends(get_current_user)` or `Depends(is_admin)`. `payroll_deductions.py` all 6 calc routes use `Depends(get_current_user)`. Auth router endpoints (login, register, etc.) remain public as designed. |
| 2 | A non-superadmin user cannot create a new organization — the API returns 403 | FAILED | `organizations.py` line 134 references `UserRole.SUPER_ADMIN` which does not exist in the enum (`UserRole.SUPERADMIN` is the correct name). Python raises `AttributeError` at runtime → 500, not 403. Confirmed via `python -c "from app.models.user import UserRole; print(UserRole.SUPER_ADMIN)"` → `AttributeError`. |
| 3 | JWT access tokens expire in 30 minutes and a refresh token flow exists for seamless re-authentication | VERIFIED | `config.py` line 33: `ACCESS_TOKEN_EXPIRE_MINUTES: int = 30`. `security.py` has full `create_refresh_token`, `validate_refresh_token`, `revoke_refresh_token` implementations backed by `RefreshToken` DB model. `auth.py` has `/refresh` endpoint that issues new access token from valid refresh token cookie. |
| 4 | A password that lacks uppercase, lowercase, number, or special character is rejected with a descriptive error message | VERIFIED | `password_validator.py` implements four distinct `re.search` checks, each returning a specific message. `auth.py` calls `validate_password_strength` in both `/register` (line 75) and `/reset-password` (line 829). |
| 5 | CORS headers in production only allow the Vercel frontend origin — other origins are blocked | VERIFIED | `main.py` lines 91-92: explicit `allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]` and `allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Cookie"]`. `config.py` `ALLOWED_ORIGINS` defaults include `https://rostra-core.vercel.app` and `https://rostracore.com`. No `["*"]` present. |

**Score:** 4/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/api/endpoints/settings.py` | Protected constraint settings endpoints | VERIFIED | All 3 routes have `Depends(get_current_user)` or `Depends(is_admin)`. File compiles cleanly. |
| `backend/app/api/endpoints/payroll_deductions.py` | Protected tax calculation endpoints | VERIFIED | All 6 calculation routes have `current_user: User = Depends(get_current_user)`. `/config` routes retain `require_finance_access`. |
| `backend/app/auth/password_validator.py` | Password strength enforcement (uppercase, lowercase, number, special char) | VERIFIED | `import re` present. Four regex checks with distinct error messages. `get_password_requirements()` returns all four boolean flags. |
| `backend/app/main.py` | Restricted CORS configuration | VERIFIED | `allow_methods` and `allow_headers` are explicit lists. No wildcard `["*"]`. |
| `backend/.env.example` | Documented required env vars with placeholder values | VERIFIED | Contains `SECRET_KEY=`, `YOCO_SECRET_KEY=`, `YOCO_WEBHOOK_SECRET=`, `TWILIO_ACCOUNT_SID=`, `TWILIO_AUTH_TOKEN=`, `SENDGRID_API_KEY=`, `DATABASE_URL=`, `REDIS_URL=`. All placeholder values. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `settings.py` | `app.auth.security.get_current_user` | `Depends(get_current_user)` on GET /constraints | WIRED | Line 27: `current_user: User = Depends(get_current_user)` |
| `settings.py` | `app.auth.security.is_admin` | `Depends(is_admin)` on PUT and POST /constraints/reset | WIRED | Lines 45, 78: `current_user: User = Depends(is_admin)` |
| `payroll_deductions.py` | `app.auth.security.get_current_user` | `Depends(get_current_user)` on 6 routes | WIRED | Lines 73, 108, 133, 158, 191, 214: all six calculation endpoints |
| `password_validator.py` | `auth.py /register` | `validate_password_strength` called before user creation | WIRED | `auth.py` line 75: `is_valid, error_message = validate_password_strength(user_data.password)` |
| `password_validator.py` | `auth.py /reset-password` | `validate_password_strength` called before password reset | WIRED | `auth.py` line 829: `is_valid, error_message = validate_password_strength(request.new_password)` |
| `main.py` | `CORSMiddleware` | explicit `allow_methods` and `allow_headers` | WIRED | Lines 91-92: explicit lists, no `["*"]` |
| `organizations.py` | `UserRole.SUPERADMIN` check | `current_user.role != UserRole.SUPER_ADMIN` | BROKEN | `UserRole.SUPER_ADMIN` does not exist. Enum member is `SUPERADMIN`. AttributeError at runtime. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 01-01-PLAN.md | All API endpoints require authentication | VERIFIED | settings.py and payroll_deductions.py protected. Auth endpoints intentionally public. |
| SEC-02 | Pre-GSD (Phase A) | Organization creation restricted to super admin role only | BLOCKED | `organizations.py` line 134 uses `UserRole.SUPER_ADMIN` (non-existent enum member). Check fails with AttributeError at runtime — 500 instead of 403. |
| SEC-03 | Pre-GSD (Phase A) | JWT access token expiry 30 minutes + refresh token flow | VERIFIED | `ACCESS_TOKEN_EXPIRE_MINUTES=30` in config.py. Full refresh token implementation in security.py and auth.py `/refresh` endpoint. |
| SEC-04 | 01-02-PLAN.md | Password policy enforces four character classes | VERIFIED | password_validator.py has four regex checks with descriptive messages. Called in /register and /reset-password. |
| SEC-05 | 01-02-PLAN.md | CORS restricts origins, headers, and methods | VERIFIED | main.py uses explicit lists for all three. allow_origins uses `settings.ALLOWED_ORIGINS`. |
| SEC-06 | 01-02-PLAN.md | No secrets or API keys in version control | VERIFIED | `git check-ignore -v backend/.env` shows line 27 covers it. `SECRET_KEY` default in config.py is a non-secret placeholder string. No real credentials found in tracked files. |

**Note on SEC-01:** The planner audited 95 endpoint files and identified only settings.py and payroll_deductions.py as unprotected. Those two files are now protected. The phase scope explicitly excludes verifying all 95 files — that audit was done pre-GSD. SEC-01 is treated as verified within this phase's scope.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/api/endpoints/organizations.py` | 134 | `UserRole.SUPER_ADMIN` (non-existent enum attribute) | BLOCKER | Any POST to `/api/v1/organizations/` raises `AttributeError` → 500 at runtime. The SEC-02 check is entirely non-functional. |

---

## Human Verification Required

None — all critical checks were verifiable programmatically. The enum mismatch was confirmed via direct Python execution.

---

## Gaps Summary

One gap blocks goal achievement for Success Criterion 2 (SEC-02):

**SEC-02 — Superadmin org creation check is broken at runtime.**

`backend/app/api/endpoints/organizations.py` line 134 checks:
```python
if current_user.role != UserRole.SUPER_ADMIN:
```

The `UserRole` enum (defined in `backend/app/models/user.py`) does not have a `SUPER_ADMIN` member. The correct name is `SUPERADMIN`. Python raises `AttributeError: type object 'UserRole' has no attribute 'SUPER_ADMIN'` when this line is reached, causing a 500 Internal Server Error on any `POST /api/v1/organizations/` request, regardless of the caller's role.

**Fix required:** Change line 134 from `UserRole.SUPER_ADMIN` to `UserRole.SUPERADMIN`.

This is noted as "done in Phase A (before GSD)" but the implementation has a bug. The intent is correct; the code execution is not.

All four other success criteria are fully implemented and wired:
- SEC-01: settings.py and payroll_deductions.py endpoints protected with JWT Depends guards
- SEC-03: 30-minute access token expiry configured; full refresh token flow implemented
- SEC-04: Four-class password validator wired into /register and /reset-password
- SEC-05: CORS methods and headers restricted from wildcard to explicit allowlists
- SEC-06: backend/.env gitignored; .env.example has all required placeholder vars; no real secrets in tracked files

---

_Verified: 2026-03-03T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
