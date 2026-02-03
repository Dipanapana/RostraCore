---
phase: 00-universal-foundation-industry-templates
plan: 01
subsystem: database
tags: [sqlalchemy, alembic, postgres, json, templates, multi-industry, deepmerge]

# Dependency graph
requires:
  - phase: none
    provides: Fresh implementation
provides:
  - IndustryTemplate model with 10 pre-seeded templates (security, hospitality, retail, government, nonprofit, healthcare, manufacturing, education, logistics, professional)
  - Organization model extended with industry_template_id, template_overrides, setup_wizard_data
  - TemplateEngine for resolving industry configs with org customizations
  - Template JSON schema and 10 industry-specific default configurations
  - Database migration preserving backward compatibility (existing orgs → security template)
affects: [00-02-setup-wizard, 00-03-multi-tenancy, all-future-org-creation]

# Tech tracking
tech-stack:
  added: [deepmerge==1.1.1]
  patterns:
    - "Template engine pattern: industry defaults + org overrides merged with deepmerge"
    - "Multi-industry data model: template_id as FK, template_overrides JSON for customization"
    - "Migration pattern: nullable column → data migration → make non-nullable"

key-files:
  created:
    - backend/app/models/industry_template.py
    - backend/app/templates/engine.py
    - backend/app/templates/schemas/industry_v1.json
    - backend/app/templates/defaults/*.json (10 files)
    - backend/migrations/versions/963676eabe04_add_industry_templates.py
  modified:
    - backend/app/models/organization.py
    - backend/app/models/__init__.py
    - backend/requirements.txt

key-decisions:
  - "Use deepmerge for template resolution (enables extending vs replacing)"
  - "Default all existing orgs to 'security' template for backward compatibility"
  - "Store template_json as empty {} in migration, full templates loaded from JSON files by app"
  - "Add setup_wizard_data column now for Plan 00-02 wizard draft state"

patterns-established:
  - "Industry template resolution: TemplateEngine.resolve_template(template_id, org_overrides) → merged config"
  - "Template JSON structure: version, industry, roles, shift_patterns, compliance_rules, hierarchy_template, metrics"
  - "South African labor law defaults: BCEA 45h week, 10h overtime, 12h rest between shifts"

# Metrics
duration: 137min
completed: 2026-02-04
---

# Phase 00 Plan 01: Industry Template Engine & Database Schema Summary

**Industry template system with 10 pre-configured business types (security, hospitality, retail, etc.) using JSON templates merged with org-specific overrides via deepmerge**

## Performance

- **Duration:** 2h 17min (137 minutes)
- **Started:** 2026-02-04T01:38:56Z
- **Completed:** 2026-02-04T03:55:59Z
- **Tasks:** 3/3 completed
- **Files modified:** 16

## Accomplishments

- Created industry template database schema with IndustryTemplate model and Organization extensions
- Built template engine that merges industry defaults with organization customizations
- Implemented 10 industry-specific templates with roles, shifts, compliance rules, and metrics
- Database migration preserves backward compatibility (all existing orgs → 'security' template)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create IndustryTemplate model and extend Organization** - `e06de3d` (feat)
   - IndustryTemplate model with template_json, version, display_order, is_active
   - Organization extended with industry_template_id (FK), template_overrides (JSON)
   - Updated models __init__ and __all__

2. **Task 2: Create template JSON files for 10 industries** - `cd8f74e` (feat)
   - JSON schema for industry template validation (industry_v1.json)
   - 10 industry templates: security, hospitality, retail, government, nonprofit, healthcare, manufacturing, education, logistics, professional
   - Each template includes SA labor law defaults (BCEA: 45h week, 10h overtime)

3. **Task 3: Create template engine and Alembic migration** - `142d713` (feat)
   - TemplateEngine class with load, resolve, merge functionality
   - Added deepmerge dependency for deep merge
   - Alembic migration creates industry_templates table, seeds 10 records, extends organizations

## Files Created/Modified

**Created:**
- `backend/app/models/industry_template.py` - IndustryTemplate SQLAlchemy model
- `backend/app/templates/engine.py` - TemplateEngine for config resolution
- `backend/app/templates/schemas/industry_v1.json` - JSON schema for validation
- `backend/app/templates/defaults/security.json` - Security industry template (armed/unarmed guards, PSIRA)
- `backend/app/templates/defaults/hospitality.json` - Hospitality template (waiter, chef, bartender, manager)
- `backend/app/templates/defaults/retail.json` - Retail template (cashier, stock clerk, fuel attendant)
- `backend/app/templates/defaults/government.json` - Government template (administrator, clerk, department head)
- `backend/app/templates/defaults/nonprofit.json` - Non-profit template (volunteer, coordinator, field worker)
- `backend/app/templates/defaults/healthcare.json` - Healthcare template (nurse, doctor, paramedic)
- `backend/app/templates/defaults/manufacturing.json` - Manufacturing template (operator, technician, quality inspector)
- `backend/app/templates/defaults/education.json` - Education template (teacher, principal, librarian)
- `backend/app/templates/defaults/logistics.json` - Logistics template (driver, warehouse worker, dispatcher)
- `backend/app/templates/defaults/professional.json` - Professional services template (consultant, analyst, partner)
- `backend/migrations/versions/963676eabe04_add_industry_templates.py` - Database migration

**Modified:**
- `backend/app/models/organization.py` - Added industry_template_id (FK), template_overrides, relationship
- `backend/app/models/__init__.py` - Added IndustryTemplate import and __all__ entry
- `backend/requirements.txt` - Added deepmerge==1.1.1

## Decisions Made

1. **Use deepmerge for template merging**
   - Rationale: Allows organizations to extend templates (add roles) vs just replace them
   - Impact: More flexible customization model

2. **Default existing organizations to 'security' template**
   - Rationale: Preserves backward compatibility, all existing RostraCore deployments are security companies
   - Impact: No breaking changes to existing data

3. **Store empty {} in migration, full templates in JSON files**
   - Rationale: Separation of concerns - migration handles schema, app loads content
   - Impact: Template updates don't require migrations

4. **Add setup_wizard_data column in this migration**
   - Rationale: Plan 00-02 will need this for wizard draft state, add it now to avoid second migration
   - Impact: One fewer migration to run

5. **South African labor law as universal default**
   - Rationale: RostraCore is SA-focused, BCEA compliance required
   - Impact: All industries get 45h week, 10h overtime, 12h rest minimums

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected migration directory location**
- **Found during:** Task 3 (Alembic migration creation)
- **Issue:** Initial migration created in `backend/alembic/versions` but actual migrations are in `backend/migrations/versions`
- **Fix:** Used `alembic revision` to generate proper UUID-based migration, removed incorrect file
- **Files modified:** Deleted `backend/alembic/versions/019_add_industry_templates.py`, created `backend/migrations/versions/963676eabe04_add_industry_templates.py`
- **Verification:** `alembic current` shows correct revision path, migration applies successfully
- **Committed in:** 142d713 (part of Task 3 commit)

**2. [Rule 1 - Bug] Fixed is_active constraint violation in migration**
- **Found during:** Task 3 (Running migration)
- **Issue:** INSERT statement didn't include is_active column, violated NOT NULL constraint
- **Fix:** Added is_active=true to INSERT statement
- **Files modified:** backend/migrations/versions/963676eabe04_add_industry_templates.py
- **Verification:** Migration runs successfully, all 10 templates inserted
- **Committed in:** 142d713 (part of Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for migration to work. No scope creep.

## Issues Encountered

1. **Migration directory mismatch**
   - Problem: Project uses `migrations/versions` with UUID revisions, not `alembic/versions` with numbered revisions
   - Resolution: Generated new migration with `alembic revision` command to get proper UUID and down_revision linkage

2. **Database was one revision behind expected head**
   - Problem: After fixing migration, needed to downgrade and re-upgrade to apply fixed version
   - Resolution: `alembic downgrade -1` then `alembic upgrade head` successfully applied migration

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 00-02 (Setup Wizard UI):**
- ✅ Industry templates seeded in database
- ✅ TemplateEngine.list_available_templates() provides wizard options
- ✅ Organization.setup_wizard_data column ready for draft state storage
- ✅ Template resolution working with org_overrides parameter

**Blockers:** None

**Concerns:** None - implementation complete and verified

---
*Phase: 00-universal-foundation-industry-templates*
*Completed: 2026-02-04*
