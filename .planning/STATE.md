# RostraCore - Current State

## Project Reference

See: [.planning/PROJECT.md](.planning/PROJECT.md) (updated 2026-02-04)

**Core value:** Every person on every payroll must be verified, real, and working at the right location
**Current focus:** Phase 01 - Biometric Integration Foundation

## Current Phase

**Phase 01: Biometric Integration Foundation**

**Goal**: Multi-modal attendance verification system (hardware fingerprint, phone facial recognition, GPS-only).

**Status**: In Progress (1/5 plans complete) 🔄

**Plans:**
- [x] 01-01: Database models + geofence validation - ✅ Completed 2026-02-05
- [ ] 01-02: Enrollment service API with template encryption
- [ ] 01-03: Facial recognition service (FaceNet512)
- [ ] 01-04: Verification service with adaptive thresholds
- [ ] 01-05: Clock-in API with GPS validation

**Progress:** ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (12/45 plans = 27%)

## Recent Activity

**2026-02-05:**
- ✅ **Plan 01-01 completed**: Biometric database models + Alembic migration + geofence validation utility (62min)
  - Created BiometricTemplate, EnrollmentSession, VerificationAttempt, AttendanceRecord, SiteGeofence models
  - Migration with pgcrypto extension for encrypted template storage
  - Haversine geofence validation with GPS accuracy buffering
  - Fixed bug in previous migration (missing country_configs seed data)

**2026-02-04:**
- ✅ Comprehensive transformation plan created and approved (v3.0)
- ✅ 3 parallel Explore agents researched: Architecture, Biometric, Enterprise HR
- ✅ GSD directory structure initialized (.planning/ with PROJECT.md, ROADMAP.md, STATE.md)
- ✅ Plan covers 15 phases across 5 milestones (27-month timeline)
- ✅ Team roles assigned: Refilwe (HR), Prince (UI), Sizwe (Data/ML), John (Electronic), Steve (Dev)
- ✅ **Plan 00-01 completed**: Industry template engine with 10 business types (2h 17min)
- ✅ **Plan 00-02 completed**: Setup wizard UI with 5-step onboarding flow
- ✅ **Plan 00-03 completed**: Multi-level org hierarchy with adjacency list (18min)
- ✅ **Phase 0 COMPLETE**: Universal Foundation & Industry Templates milestone achieved
- ✅ **Plan 00.1-01 completed**: SQLite local database with tauri-plugin-sql (43min)
- ✅ **Plan 00.1-02 completed**: React Query offline-aware persistence setup (2h 19min)
- ✅ **Plan 00.1-03 completed**: Offline data hooks with SQLite fallback (9min)
- ✅ **Plan 00.1-04 completed**: Mutation queue and sync manager (9min)
- ✅ **Plan 00.1-05 completed**: Offline UI components (status banner, sync button, wrappers) (4min)
- ✅ **Phase 0.1 COMPLETE**: Desktop-First Architecture milestone achieved
- ✅ **Plan 00.2-01 completed**: Country config foundation with 5 JSON configs (ZA/US/GB/NG/KE), CountryService, currency.ts (2h 15min)
- ✅ **Plan 00.2-02 completed**: Internationalization framework with next-intl, 3 languages (en/af/zu), LanguageSelector component (45min)

## Next Steps

1. **Immediate (Next Session)**:
   - Continue Phase 01: Plan 01-02 (Enrollment service API)
   - Implement biometric enrollment workflow
   - Template encryption using pgcrypto
   - Quality score validation and grace period enforcement

2. **This Week**:
   - Complete Phase 01 biometric foundation (5 plans)
   - Enrollment service + facial recognition + verification + clock-in API
   - Test end-to-end biometric attendance flow
   - Validate geofence accuracy across multiple test sites

3. **This Month (Milestone v0.5)**:
   - Complete Phases 0, 0.1, 0.2, 01 (Foundation + Localization + Biometric)
   - Deploy biometric attendance system with multi-modal verification
   - Test phone camera facial recognition accuracy
   - Ghost worker detection foundation in place

## Blockers

None currently.

## Notes

**Decisions Made**:

| Phase  | Plan | Decision | Rationale |
|--------|------|----------|-----------|
| 00     | 01   | Use deepmerge for template resolution | Allows orgs to extend templates (add roles) vs just replace |
| 00     | 01   | Default existing orgs to 'security' template | Backward compatibility for existing deployments |
| 00     | 01   | SA labor law as universal default (BCEA) | RostraCore is SA-focused, 45h week/10h OT required |
| 00     | 02   | Draft persistence via setup_wizard_data JSON | Wizard state survives browser refresh, users can resume incomplete setups |
| 00     | 02   | Auto-login after wizard completion | Better UX - users go straight to dashboard with JWT token |
| 00     | 02   | Hierarchy setup optional in wizard | Full builder deferred, users can skip Step 3 and configure later |
| 00     | 02   | Industry preview shows first 3 roles | Informed selection without overwhelming UI |
| 00     | 03   | Adjacency list over nested sets | Simpler writes, sufficient for <10k nodes, can migrate to ltree if needed |
| 00     | 03   | Nullable hierarchy foreign keys | Backward compatible - existing users/employees get org-wide access by default |
| 00     | 03   | Soft delete with cascade | Preserves audit trail while removing nodes from active queries |
| 00.1   | 01   | Use sqlx directly instead of tauri-plugin-sql Pool API | v2 API changed, sqlx gives direct control over connection pooling |
| 00.1   | 01   | Store full JSON in data_json column | Preserves all API fields without requiring schema migrations when backend changes |
| 00.1   | 01   | Enable WAL mode in Migration 1 | Allows concurrent reads/writes, critical for background sync performance |
| 00.1   | 01   | INSERT OR REPLACE pattern for caching | Simpler than ON CONFLICT UPDATE, server_id UNIQUE constraint makes it safe |
| 00.1   | 01   | Fix frontendDist path to ../../frontend/out | Was ../frontend/out (incorrect), frontend is at root level from desktop/src-tauri/ |
| 00.1   | 03   | Use useSyncExternalStore for network detection | React 18+ standard for subscribing to external data sources (navigator.onLine) |
| 00.1   | 03   | Add isTauri() check to localDb client | Enables hooks to work in web browser for testing without crashing |
| 00.1   | 03   | Parse data_json field when loading from cache | SQLite stores full API response as JSON, needs parsing |
| 00.1   | 03   | Log '[Offline]' messages to console | Helps understand when app is using cached data vs live API |
| 00.1   | 04   | Install @tauri-apps/api for Tauri invoke() | Required to call Tauri commands from frontend, official API package |
| 00.1   | 04   | Use useSyncExternalStore for sync status | React 18+ built-in hook for external store subscription, cleaner than useState |
| 00.1   | 04   | 5-minute auto-sync interval as default | Balance between timely sync and avoiding excessive network requests |
| 00.1   | 04   | Queue mutations when offline, call API when online | Reduces latency when online, enables offline work with later sync |
| 00.1   | 05   | Banner hidden when online and idle | Avoids visual clutter when connection normal, only shows when user needs feedback |
| 00.1   | 05   | Payroll page fully blocked offline | Payroll processing requires server-side calculations, no value showing cached records |
| 00.1   | 05   | Employee list viewable offline | Leverages offline-first hooks, users can view cached data without add/edit |
| 00.2   | 01   | Country configs as JSON files | Enables adding new countries without code changes (just upload JSON) |
| 00.2   | 01   | Origin-country locale for currency | ZAR always displays as "R 1 234,56" (SA format), not user's locale |
| 00.2   | 01   | Numeric(12,2) for monetary amounts | Prevents floating-point rounding errors in payroll calculations |
| 00.2   | 01   | Intl.NumberFormat for formatting | Native browser API, no dependencies, handles all locales |
| 00.2   | 02   | next-intl "without routing" pattern | Locale from cookie/localStorage, no URL changes, works with static export |
| 00.2   | 02   | Cookie + localStorage dual storage | Cookie for SSR, localStorage for Tauri desktop fallback |
| 00.2   | 02   | router.refresh() for language switch | Instant switching without full page reload, preserves form state |
| 00.2   | 02   | Natural translations not machine-translated | Proper Afrikaans and isiZulu using SA workforce terminology |
| 01     | 01   | Numeric(10,7) for GPS coordinates | 7 decimal places = ~1.1cm precision per GPS standards |
| 01     | 01   | Default geofence radius 200m | 100m site + 2×50m GPS error buffer per research |
| 01     | 01   | Raise ValueError if GPS accuracy > 50m | Too imprecise for reliable geofence validation |
| 01     | 01   | String enums for status fields | Simpler migrations than SQLAlchemy Enum |
| 01     | 01   | UNIQUE constraint (employee_id, template_type) | One template per biometric type per employee |
| 01     | 01   | Composite index (employee_id, created_at) | Optimizes adaptive threshold queries |
| 01     | 01   | pgcrypto extension for encrypted templates | PostgreSQL native encryption for LargeBinary column |

**Decision Pending**:
- Which exchange rate API to use for multi-currency (Phase 0.2-04)? Options: Open Exchange Rates, CurrencyLayer, Fixer.io, Frankfurter

**Team Coordination**:
- Weekly sync meetings: Mondays 10:00 AM SAST
- Slack workspace: #rostracore-transformation
- GitHub: Main repository for all code, PRs, issues

**Research Completed**:
- ✅ South Africa National Treasury ghost worker crisis (R3.9B annually)
- ✅ Biometric technologies evaluation (fingerprint, facial, phone camera, RFID)
- ✅ Fortune 500 HRIS features analysis (200+ features)
- ✅ Current RostraCore architecture (25+ models, FastAPI, Next.js, PostgreSQL)
- ✅ Multi-tenant patterns and RBAC implementation

## Session Continuity

**Last session:** 2026-02-05 ~00:03 UTC
**Stopped at:** Completed 01-01-PLAN.md (Biometric database models + geofence validation)
**Resume file:** None
**Phase status:** Phase 01 In Progress (1/5 plans complete) - Ready for Plan 01-02 (Enrollment service)

---

*Last updated: 2026-02-05 after completing Plan 01-01*
