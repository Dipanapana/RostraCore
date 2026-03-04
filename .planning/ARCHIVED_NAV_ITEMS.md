# Archived Navigation Items

> These sidebar items were hidden on 2026-03-04 as part of Phase 1.2 (Sidebar Cleanup).
> They are preserved here for restoration when the mobile app or analytics backends are ready.
> To restore: remove the key from `HIDDEN_NAV_KEYS` in `frontend/src/components/layout/Sidebar.tsx`

## Mobile-Dependent Items (require mobile app/hardware)

| Key | Label | Href | Icon | Roles | Permission | Reason |
|-----|-------|------|------|-------|------------|--------|
| `lone-worker` | Lone Worker | `/lone-worker` | UserSearch | MANAGEMENT_ROLES | lone_worker.view | Requires real-time GPS/panic button on mobile |
| `geofencing` | Geofencing | `/geofencing` | MapPin | MANAGEMENT_ROLES | geofencing.view | Requires GPS location services on mobile |
| `visitors` | Visitors | `/visitors` | UserCheck | MANAGEMENT_ROLES | visitors.view | Physical site visitor check-in, needs mobile/kiosk |
| `keys` | Key Holding | `/keys` | Key | MANAGEMENT_ROLES | keys.view | Physical key tracking, needs on-site interaction |
| `shift-handovers` | Shift Handovers | `/shift-handovers` | Repeat | MANAGEMENT_ROLES | shift_handovers.view | On-site handover process, needs mobile |
| `occurrence-book` | Occurrence Book | `/occurrence-book` | BookOpen | MANAGEMENT_ROLES | occurrence_book.view | Digital field OB, primarily mobile use |
| `assets` | Assets | `/assets` | Package | MANAGEMENT_ROLES | assets.view | Physical asset tracking, needs on-site scanning |

## Placeholder Analytics (no backend data/endpoints yet)

| Key | Label | Href | Icon | Roles | Permission |
|-----|-------|------|------|-------|------------|
| `hr-analytics` | HR Analytics | `/employees/hr-analytics` | BarChart3 | ADMIN_ROLES | hr_analytics.view |
| `turnover` | Turnover & Retention | `/employees/turnover` | TrendingDown | ADMIN_ROLES | employee_turnover.view |
| `performance-dashboard` | Performance | `/employees/performance` | Activity | ADMIN_ROLES | performance.view |
| `workforce-compliance` | Compliance | `/employees/compliance` | ShieldAlert | ADMIN_ROLES | employees.view |
| `availability-heatmap` | Avail. Heatmap | `/availability/heatmap` | Flame | ADMIN_ROLES | availability.view |
| `contract-renewals` | Contract Renewals | `/clients/renewals` | CalendarClock | MANAGEMENT_ROLES | clients.view |
| `client-satisfaction` | Satisfaction | `/clients/satisfaction` | Star | ADMIN_ROLES | clients.view |
| `site-risk` | Site Risk | `/sites/risk` | ShieldQuestion | ADMIN_ROLES | sites.view |
| `incident-analytics` | Incident Analytics | `/incidents/analytics` | PieChart | ADMIN_ROLES | incidents.view |
| `patrol-analytics` | Patrol Analytics | `/patrols/analytics` | Radar | ADMIN_ROLES | patrols.view |
| `shift-costs` | Shift Costs | `/shifts/costs` | Coins | FINANCE_ROLES | shift_costs.view |

## Placeholder Standalone Features (no backend integration yet)

| Key | Label | Href | Icon | Roles | Permission | Reason |
|-----|-------|------|------|-------|------------|--------|
| `emergency` | Emergency | `/emergency` | Siren | MANAGEMENT_ROLES | emergency.view | Dispatch system, needs mobile/radio integration |
| `messaging` | Messaging | `/messaging` | MessageSquare | ALL_ROLES | messaging.view | Internal messaging, no backend yet |
| `command-center` | Command Center | `/command-center` | Radio | ADMIN_ROLES | command_center.view | Monitoring center, needs integration |
| `portal` | Client Portal | `/portal` | Briefcase | ALL_ROLES | client_portal.view | Separate client-facing portal module |
| `ops-summary` | Ops Summary | `/ops-summary` | Zap | ADMIN_ROLES | ops_summary.view | Operations overview, no specific endpoint |

## Route Groups Also Hidden

These `ROUTE_GROUPS` entries correspond to hidden items and should be cleaned if routes are restored:
- `/clients/renewals`
- `/employees/hr-analytics`
- `/employees/turnover`
- `/employees/compliance`
- `/assets`

## Restoration Instructions

1. Open `frontend/src/components/layout/Sidebar.tsx`
2. Find the `HIDDEN_NAV_KEYS` Set near the top of the file
3. Remove the key(s) you want to restore from the Set
4. The items will immediately reappear in the sidebar (they are still defined in `NAV_ENTRIES`)
5. No other code changes needed — the filtering is automatic
