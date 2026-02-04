---
phase: 00-universal-foundation-industry-templates
plan: 02
subsystem: ui
tags: [nextjs, react, setup-wizard, onboarding, fastapi, pydantic]

# Dependency graph
requires:
  - phase: 00-01
    provides: IndustryTemplate model and TemplateEngine for listing available templates
provides:
  - Setup wizard UI with 5-step flow (Industry → Company → Hierarchy → Admin → Confirm)
  - Draft state persistence API (survives browser refresh)
  - Complete setup endpoint creating org + admin user atomically
  - Org code validation endpoint
  - Industry selection with visual cards showing role previews
affects: [00-03-multi-tenancy, onboarding-flows, registration-flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-step wizard pattern: Progress indicator + step components + draft persistence"
    - "Wizard API pattern: Draft save on each step, complete on final step"
    - "Atomic transaction pattern: Org + admin user created together (rollback on failure)"

key-files:
  created:
    - backend/app/api/endpoints/setup_wizard.py
    - frontend/src/app/setup-wizard/page.tsx
    - frontend/src/app/setup-wizard/progress.tsx
    - frontend/src/app/setup-wizard/steps/IndustrySelection.tsx
    - frontend/src/app/setup-wizard/steps/CompanyDetails.tsx
    - frontend/src/app/setup-wizard/steps/HierarchySetup.tsx
    - frontend/src/app/setup-wizard/steps/UserSetup.tsx
    - frontend/src/app/setup-wizard/steps/Confirmation.tsx
    - frontend/src/types/setupWizard.ts
    - frontend/src/services/setupWizardApi.ts
  modified:
    - backend/app/main.py

key-decisions:
  - "Use draft Organization records with approval_status='draft' for wizard state persistence"
  - "Store all step data in Organization.setup_wizard_data JSON column"
  - "Auto-login after setup completion via immediate JWT token generation"
  - "Hierarchy setup optional (skip_hierarchy flag) - full builder deferred to future iteration"
  - "Industry template preview shows first 3 roles on selection cards"

patterns-established:
  - "Wizard draft persistence: Create draft org on first save, update on subsequent steps"
  - "Org code validation: Real-time availability check with normalization (uppercase)"
  - "Setup completion: Atomic transaction creates org (active) + admin user (owner, company_admin)"
  - "Trial activation: 14-day trial auto-starts on completion (trial_start_date, trial_end_date)"

# Metrics
duration: 26min
completed: 2026-02-04
---

# Phase 00 Plan 02: Setup Wizard UI with Industry Selection Summary

**5-step setup wizard with visual industry cards, real-time validation, draft persistence, and atomic org creation completing in under 5 minutes**

## Performance

- **Duration:** 26 minutes
- **Started:** 2026-02-04T07:31:52Z
- **Completed:** 2026-02-04T07:58:24Z
- **Tasks:** 2/2 completed
- **Files modified:** 11

## Accomplishments

- Complete 5-step wizard UI with progress indicator and navigation
- Industry selection with visual cards displaying role previews from Plan 00-01 templates
- Draft state persistence surviving browser refresh (saved to database after each step)
- Atomic organization + admin user creation with immediate JWT login on completion
- Real-time org code validation checking availability and normalizing format

## Task Commits

Each task was committed atomically:

1. **Task 1: Create setup wizard API endpoints** - `fd74efa` (feat)
   - Setup wizard endpoints at /api/setup-wizard/*
   - Draft save endpoint persists wizard state to Organization.setup_wizard_data
   - Complete endpoint creates organization and admin user atomically
   - Templates endpoint returns all industry options with role previews
   - Org code validation endpoint checks uniqueness

2. **Task 2: Create setup wizard frontend components** - `7f9d39b` (feat)
   - 5-step wizard: Industry → Company → Hierarchy → Admin → Confirm
   - Industry selection with visual cards and role previews
   - Org code validation shows availability in real-time
   - Draft state saved after each step (survives browser refresh)
   - Wizard completes in under 5 minutes for simple setup
   - Progress indicator shows current step and completion

## Files Created/Modified

**Created:**
- `backend/app/api/endpoints/setup_wizard.py` - Setup wizard API with draft/resume/complete endpoints
- `frontend/src/app/setup-wizard/page.tsx` - Main wizard orchestrator with step navigation
- `frontend/src/app/setup-wizard/progress.tsx` - Visual progress indicator component
- `frontend/src/app/setup-wizard/steps/IndustrySelection.tsx` - Step 1: Visual industry cards with role previews
- `frontend/src/app/setup-wizard/steps/CompanyDetails.tsx` - Step 2: Company name, org code, billing email
- `frontend/src/app/setup-wizard/steps/HierarchySetup.tsx` - Step 3: Org structure (optional, skippable)
- `frontend/src/app/setup-wizard/steps/UserSetup.tsx` - Step 4: Admin account creation
- `frontend/src/app/setup-wizard/steps/Confirmation.tsx` - Step 5: Review and confirm
- `frontend/src/types/setupWizard.ts` - TypeScript types for wizard data
- `frontend/src/services/setupWizardApi.ts` - API service for wizard endpoints

**Modified:**
- `backend/app/main.py` - Added setup_wizard router (public, no auth required)

## Decisions Made

1. **Draft persistence via Organization.setup_wizard_data**
   - Rationale: Organization.setup_wizard_data column added in Plan 00-01 migration
   - Impact: Draft state survives browser refresh, users can resume incomplete setups
   - Implementation: Draft orgs marked with approval_status='draft', is_active=False

2. **Auto-login after completion**
   - Rationale: Better UX - users go straight to dashboard after setup
   - Impact: No separate login step required
   - Implementation: JWT token generated in complete endpoint response

3. **Hierarchy setup optional**
   - Rationale: Full hierarchy builder UI complex, defer to future iteration
   - Impact: Users can skip Step 3, configure hierarchy later in Settings
   - Implementation: skip_hierarchy flag, hierarchy_nodes captured but not yet persisted

4. **Industry template preview shows first 3 roles**
   - Rationale: Gives users quick sense of what each industry template includes
   - Impact: Industry selection more informed without overwhelming UI
   - Implementation: TemplateEngine.get_roles(template_id)[:3] in /templates endpoint

5. **Org code normalized to uppercase**
   - Rationale: Consistency and uniqueness constraint simplification
   - Impact: All org codes stored in uppercase regardless of user input
   - Implementation: Validation endpoint returns normalized code, frontend displays it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward with all dependencies from Plan 00-01 available.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 00-03 (Multi-level tenancy architecture):**
- ✅ Setup wizard creates organizations and admin users
- ✅ Organization.industry_template_id populated on creation
- ✅ Draft state mechanism working for resume flows
- ✅ Hierarchy setup UI placeholder exists (ready to wire up to hierarchy model)

**Blockers:** None

**Concerns:** Hierarchy builder UI deferred - Step 3 currently just has skip checkbox. Full hierarchy builder will need to integrate with OrgHierarchyNode model from Plan 00-03.

---
*Phase: 00-universal-foundation-industry-templates*
*Completed: 2026-02-04*
