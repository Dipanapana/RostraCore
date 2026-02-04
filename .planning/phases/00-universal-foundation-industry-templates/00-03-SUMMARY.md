---
phase: 00-universal-foundation
plan: 03
subsystem: database
tags: [postgresql, sqlalchemy, alembic, adjacency-list, multi-tenancy, hierarchy]

# Dependency graph
requires:
  - phase: 00-01
    provides: Industry template system and Organization model foundation
provides:
  - Multi-level organizational hierarchy using adjacency list pattern
  - Hierarchy-scoped user access control
  - Employee assignment to location/department nodes
  - Hierarchy traversal service with descendants/ancestors methods
  - CRUD API endpoints for hierarchy management
affects: [00-02, Phase-2-HR, Phase-3-Scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adjacency list pattern for hierarchical data"
    - "Breadth-first traversal for descendants"
    - "Nullable foreign keys for backward compatibility"
    - "Soft-delete with is_active flag"

key-files:
  created:
    - backend/app/models/org_hierarchy.py
    - backend/app/services/hierarchy_service.py
    - backend/app/api/endpoints/org_hierarchy.py
    - backend/migrations/versions/ed06cb8ddff0_add_org_hierarchy.py
  modified:
    - backend/app/models/user.py
    - backend/app/models/employee.py
    - backend/app/models/__init__.py
    - backend/app/main.py

key-decisions:
  - "Used adjacency list over nested sets for simplicity and write performance"
  - "All hierarchy fields nullable for backward compatibility"
  - "Org-wide access default (NULL assigned_node_id) for existing users"
  - "Soft delete cascades to descendants"

patterns-established:
  - "HierarchyService pattern: static methods for traversal operations"
  - "Access control helper: can_user_access_node returns boolean"
  - "Tree building: Recursive subtree construction for nested JSON"
  - "Composite indexes: org_id + parent_id for efficient queries"

# Metrics
duration: 18min
completed: 2026-02-04
---

# Phase 00 Plan 03: Multi-level Tenancy Architecture Summary

**Adjacency list hierarchy model with user scoping, employee assignment, and BFS traversal service supporting organization → division → location → department structures**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-04T00:02:09Z
- **Completed:** 2026-02-04T00:20:16Z
- **Tasks:** 3
- **Files modified:** 8
- **Commits:** 2 (Task 2 was committed previously in 00-02)

## Accomplishments

- OrgHierarchyNode model with 6-level type hierarchy (organization/division/region/location/department/team)
- User.assigned_node_id enables scoped access (managers only see their branch)
- Employee.node_id enables location/department assignment
- HierarchyService with get_descendants, get_ancestors, get_tree, can_user_access_node
- Full CRUD API at /api/hierarchy with tree view, flat list, and move operations
- Database migration creates tables with composite indexes for query performance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OrgHierarchyNode model and extend User/Employee** - `dfb64b7` (feat)
   - OrgHierarchyNode with adjacency list (parent_id foreign key)
   - HierarchyNodeType enum with 6 node types
   - User.assigned_node_id for hierarchy-scoped access
   - Employee.node_id for location/department assignment
   - All fields nullable for backward compatibility

2. **Task 2: Create hierarchy service and API endpoints** - `7f9d39b` (feat - committed in 00-02)
   - HierarchyService with BFS traversal for descendants
   - Access control helpers (can_user_access_node, get_accessible_node_ids)
   - Node management (create_node, move_node with cycle detection)
   - API router with /tree, /flat, CRUD, /move, /descendants endpoints
   - Router registration in main.py

3. **Task 3: Create Alembic migration for hierarchy tables** - `2f736d9` (feat)
   - Migration ed06cb8ddff0 creates org_hierarchy_nodes table
   - Adds assigned_node_id column to users table
   - Adds node_id column to employees table
   - Creates composite indexes for org_id+parent_id and org_id+node_type
   - All fields nullable with SET NULL on delete

## Files Created/Modified

- `backend/app/models/org_hierarchy.py` - OrgHierarchyNode model with adjacency list pattern, helper methods (get_path, get_depth, get_ancestors)
- `backend/app/services/hierarchy_service.py` - Hierarchy traversal service with BFS descendants, ancestor walking, tree building, access control
- `backend/app/api/endpoints/org_hierarchy.py` - CRUD API endpoints for hierarchy management with nested tree and flat list views
- `backend/migrations/versions/ed06cb8ddff0_add_org_hierarchy.py` - Database migration creating org_hierarchy_nodes table and foreign keys
- `backend/app/models/user.py` - Added assigned_node_id for hierarchy-scoped access
- `backend/app/models/employee.py` - Added node_id for location/department assignment
- `backend/app/models/__init__.py` - Exported OrgHierarchyNode and HierarchyNodeType
- `backend/app/main.py` - Registered org_hierarchy router

## Decisions Made

1. **Adjacency list over nested sets:** Chosen for simplicity and write performance. Nested sets would optimize reads but complicate inserts/moves. For hierarchies <10,000 nodes, adjacency list is sufficient. Can migrate to ltree extension if needed.

2. **Nullable foreign keys everywhere:** All hierarchy columns (assigned_node_id, node_id, parent_id) are nullable. Existing users/employees without hierarchy assignment continue working (org-wide access). No breaking changes.

3. **Soft delete with cascade:** Deleting a node sets is_active=False on node and all descendants. Preserves data for audit trail while removing from active queries.

4. **BFS traversal implementation:** Used iterative breadth-first search instead of recursive CTEs for descendant queries. More portable across database engines, easier to debug.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Migration directory confusion:** Initially created migration in `backend/alembic/versions/` but alembic.ini points to `backend/migrations/`. Moved migration file to correct location and generated proper revision ID (`ed06cb8ddff0`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 0 completion:**
- Multi-level hierarchy model complete
- Setup wizard (Plan 00-02) can now collect hierarchy during onboarding
- Employee assignment to hierarchy nodes enables department-based reporting
- User scoping enables departmental admin roles

**Foundation for future phases:**
- Phase 2 (HR): Employee assignment to departments for organizational charts
- Phase 3 (Scheduling): Shift assignment filtered by user's accessible locations
- Phase 5 (Reporting): Aggregated metrics by division/region/location hierarchy

**No blockers** - all 3 plans in Phase 0 now complete.

---
*Phase: 00-universal-foundation*
*Completed: 2026-02-04*
