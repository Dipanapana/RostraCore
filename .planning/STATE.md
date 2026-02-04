# RostraCore - Current State

## Project Reference

See: [.planning/PROJECT.md](.planning/PROJECT.md) (updated 2026-02-04)

**Core value:** Every person on every payroll must be verified, real, and working at the right location
**Current focus:** Phase 0.1 - Desktop-First Architecture

## Current Phase

**Phase 0.1: Desktop-First Architecture**

**Goal**: Optimize frontend for Tauri desktop app with offline-first data persistence and native OS integration

**Status**: In Progress (1/5 plans complete)

**Plans:**
- [x] 00.1-01: SQLite local database with tauri-plugin-sql - ✅ Completed 2026-02-04
- [ ] 00.1-02: React Query offline-aware hooks with local fallback
- [ ] 00.1-03: Offline mutation queue and sync manager
- [ ] 00.1-04: Desktop UI adaptations and offline status banner
- [ ] 00.1-05: Testing offline scenarios and edge cases

**Progress:** ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (4/45 plans = 9%)

## Recent Activity

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

## Next Steps

1. **Immediate (Next Session)**:
   - Continue Phase 0.1: Desktop-First Architecture
   - Plan 00.1-02: React Query offline-aware hooks with local fallback
   - Plan 00.1-03: Offline mutation queue and sync manager
   - Test offline data caching with SQLite

2. **This Week**:
   - Complete Phase 0.1 (Desktop-First) and start Phase 0.2 (Localization)
   - Test desktop app offline functionality
   - Add multi-currency support (ZAR, USD, EUR)
   - Implement i18n for English, Afrikaans, Zulu

3. **This Month (Milestone v0.5)**:
   - Complete Phases 0, 0.1, 0.2 (Universal Foundation + Desktop-First + Localization)
   - Deploy desktop app with offline-first architecture
   - Implement phone camera facial recognition (TensorFlow.js)
   - Add multi-currency and multi-tax engine
   - Launch with 10+ industry templates

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

**Decision Pending**:
- Which exchange rate API to use for multi-currency (Phase 0.2)? Options: Open Exchange Rates, CurrencyLayer, Fixer.io
- Which i18n library for Next.js? Options: next-i18next, next-intl, lingui

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

**Last session:** 2026-02-04 11:13:58 UTC
**Stopped at:** Completed 00.1-01-PLAN.md (SQLite local database)
**Resume file:** None

---

*Last updated: 2026-02-04 after completing Plan 00.1-01*
