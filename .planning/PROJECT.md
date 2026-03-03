# RostraCore

## What This Is

RostraCore is a workforce management platform for South African private security companies. It handles guard rostering with OR-Tools CP-SAT optimization, client/site management, attendance tracking, payroll processing, incident reporting, and compliance monitoring. Built with FastAPI + Next.js, deployed on Railway (backend) and Vercel (frontend).

## Core Value

Security companies can generate optimized guard rosters that respect PSIRA compliance, employee availability, skill requirements, and client SLA constraints — reducing manual scheduling from hours to minutes.

## Requirements

### Validated

- ✓ JWT authentication with login/logout/password reset — existing
- ✓ Multi-tenant organization support with role-based access — existing
- ✓ Employee CRUD with PSIRA grade tracking — existing
- ✓ Client and site management with guard requirements — existing
- ✓ Shift pattern creation and assignment — existing
- ✓ CP-SAT roster optimization with soft coverage constraints — existing
- ✓ Partitioned roster optimization (by province) for scale — existing
- ✓ Constraint resolution with hierarchical priority system — existing
- ✓ Roster drag-and-drop editing with @dnd-kit — existing
- ✓ Gap insights analysis (blocker categories per unfilled shift) — existing
- ✓ Attendance check-in/check-out tracking — existing
- ✓ Payroll calculation with premiums and overtime — existing
- ✓ Incident reporting and management — existing
- ✓ Dashboard views (executive, operations, financial, guard) — existing
- ✓ Yoco payment gateway integration — existing
- ✓ Sentry error monitoring — existing

### Active

- [ ] Fix unauthenticated/under-authorized endpoints (dashboard auth done, more remain)
- [ ] Add CI/CD pipeline (GitHub Actions for tests + deployment)
- [ ] Increase test coverage from ~5% to >60% of endpoints
- [ ] Complete payment status endpoint (currently 501)
- [ ] Implement SMS verification for phone numbers
- [ ] Fix broken frontend navigation links (8-10 stubs)
- [ ] Add TypeScript type safety (replace 38+ `any` types)
- [ ] Add form validation across all input forms
- [ ] Wrap pages in ErrorBoundary components
- [ ] Add empty state components for data-less pages
- [ ] Improve accessibility (aria labels, focus indicators, skip navigation)
- [ ] Harden infrastructure (Redis rate limiting, CORS restrictions, password policy)
- [ ] Add project documentation (CONTRIBUTING.md, API guide, architecture diagram)

### Out of Scope

- Native mobile app with offline support — existing `mobile/` stub is placeholder, full mobile deferred
- Real-time WebSocket notifications — current polling approach sufficient for v1
- Multi-language i18n — English-only for SA market initially
- Custom report builder — standard dashboards sufficient for now

## Context

- **Market**: South African private security industry (PSIRA-regulated)
- **Users**: Security company admins managing 50-200+ guards across multiple client sites
- **Dev account**: tirelo@gmail.com, org_id=18 (Magareng Municipality), 60 employees, 8 clients
- **Codebase**: ~95 backend endpoint files, 72 models, 125+ frontend pages, 50+ components
- **Audit**: Comprehensive gap audit identified 27 issues across security, testing, frontend, and infrastructure
- **Phase A fixes applied**: Dashboard auth (4 endpoints), superadmin org creation check, JWT expiry reduction (480→30 min), test endpoint removal

## Constraints

- **Stack**: FastAPI (Python) + Next.js (TypeScript) + PostgreSQL — established, no migration
- **Hosting**: Railway (backend) + Vercel (frontend) — cost-effective for current scale
- **Solver**: Google OR-Tools CP-SAT — only viable free MILP solver for this problem size
- **Compliance**: PSIRA regulations require grade tracking and valid registration verification
- **Budget**: Bootstrap/self-funded — minimize external service costs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Soft shift coverage constraints | Hard `==` constraints cause INFEASIBLE with 180+ employees | ✓ Good |
| Coverage bonus (200,000 per assignment) in objective | Ensures solver maximizes fill-rate without hard constraints | ✓ Good |
| Partitioned optimizer (by province) | Scales beyond single-province roster generation | ✓ Good |
| JWT expiry reduced 480→30 min | Security hardening — 8-hour tokens too risky | ✓ Good |
| Dashboard endpoints secured with auth | CRITICAL security gap — leaked financials to unauthenticated requests | ✓ Good |
| Superadmin check on org creation | Any authenticated user could create orgs — privilege escalation risk | ✓ Good |

---
*Last updated: 2026-03-03 after gap audit and Phase A security fixes*
