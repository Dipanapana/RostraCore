# Requirements: RostraCore

**Defined:** 2026-03-03
**Core Value:** Security companies can generate optimized guard rosters that respect PSIRA compliance, availability, and client constraints

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Security

- [ ] **SEC-01**: All API endpoints require authentication (no unauthenticated data access)
- [ ] **SEC-02**: Organization creation restricted to super admin role only
- [ ] **SEC-03**: JWT access token expiry set to 30 minutes with refresh token flow
- [ ] **SEC-04**: Password policy enforces uppercase, lowercase, number, and special character requirements
- [ ] **SEC-05**: CORS configuration restricts allowed origins, headers, and methods to production values
- [ ] **SEC-06**: No secrets or API keys stored in version-controlled files

### Testing

- [ ] **TEST-01**: Auth flow has integration tests (login, register, token refresh, password reset)
- [ ] **TEST-02**: Core CRUD endpoints have integration tests (employees, clients, sites, shifts)
- [ ] **TEST-03**: Roster generation and operations have integration tests
- [ ] **TEST-04**: Payment webhook processing has integration tests
- [ ] **TEST-05**: Test coverage reaches >60% of endpoint code

### CI/CD

- [ ] **CICD-01**: GitHub Actions runs pytest on every pull request
- [ ] **CICD-02**: GitHub Actions runs `next build` on every pull request
- [ ] **CICD-03**: Auto-deploy to Railway on merge to main
- [ ] **CICD-04**: Auto-deploy to Vercel on merge to main

### Payments

- [ ] **PAY-01**: Payment status endpoint returns actual payment status from database (not 501)
- [ ] **PAY-02**: SMS verification codes are sent to user phone numbers via external provider

### Frontend Type Safety

- [ ] **FTS-01**: All API response types use proper TypeScript interfaces (no `any` types)
- [ ] **FTS-02**: All data-loading pages wrapped in ErrorBoundary components
- [ ] **FTS-03**: All input forms have field-level validation with inline error messages

### Frontend Navigation

- [ ] **NAV-01**: All sidebar navigation links point to existing, functional pages
- [ ] **NAV-02**: Empty data states show meaningful "no data" messages with call-to-action
- [ ] **NAV-03**: Loading states show skeleton components during data fetches

### Accessibility

- [ ] **A11Y-01**: All icon buttons have descriptive aria-label attributes
- [ ] **A11Y-02**: All form labels connected to inputs with htmlFor/id pairing
- [ ] **A11Y-03**: Status badges use text/icon indicators alongside color (not color alone)
- [ ] **A11Y-04**: Skip-to-content navigation link present on all pages
- [ ] **A11Y-05**: Visible focus indicators on all interactive elements

### Infrastructure

- [ ] **INFRA-01**: Rate limiting uses Redis backend (persists across server restarts)
- [ ] **INFRA-02**: Dashboard budget values read from Organization model (not hardcoded)
- [ ] **INFRA-03**: Silent error handling replaced with proper 400 responses for invalid inputs

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Mobile

- **MOB-01**: Dedicated mobile auth flow with biometric support
- **MOB-02**: Push notification integration for shift assignments
- **MOB-03**: Offline mode for guard check-in when connectivity is poor

### SuperAdmin

- **SADM-01**: SuperAdmin analytics return real data (not placeholder zeros)
- **SADM-02**: Platform-wide usage dashboard for multi-org monitoring

### Advanced UX

- **UX-01**: Search fields debounce requests (prevent rapid-fire API calls)
- **UX-02**: Optimistic UI updates for mutation operations
- **UX-03**: Request/response caching for frequently accessed data

### Documentation

- **DOC-01**: CONTRIBUTING.md with setup instructions and PR process
- **DOC-02**: Architecture diagram showing system components and data flow
- **DOC-03**: API integration guide for third-party consumers
- **DOC-04**: Security policy document

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | Existing stub is placeholder; full mobile deferred to v2+ milestone |
| Real-time WebSocket notifications | Polling sufficient for current user count |
| Multi-language i18n | English-only for SA market initially |
| Custom report builder | Standard dashboards cover current needs |
| OAuth social login | Email/password sufficient for B2B security companies |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 3 | Pending |
| CICD-01 | Phase 2 | Pending |
| CICD-02 | Phase 2 | Pending |
| CICD-03 | Phase 2 | Pending |
| CICD-04 | Phase 2 | Pending |
| PAY-01 | Phase 5 | Pending |
| PAY-02 | Phase 5 | Pending |
| FTS-01 | Phase 6 | Pending |
| FTS-02 | Phase 6 | Pending |
| FTS-03 | Phase 6 | Pending |
| NAV-01 | Phase 7 | Pending |
| NAV-02 | Phase 7 | Pending |
| NAV-03 | Phase 7 | Pending |
| A11Y-01 | Phase 8 | Pending |
| A11Y-02 | Phase 8 | Pending |
| A11Y-03 | Phase 8 | Pending |
| A11Y-04 | Phase 8 | Pending |
| A11Y-05 | Phase 8 | Pending |
| INFRA-01 | Phase 4 | Pending |
| INFRA-02 | Phase 4 | Pending |
| INFRA-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 — traceability updated after roadmap creation*
