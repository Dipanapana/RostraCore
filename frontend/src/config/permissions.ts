/**
 * Role-based permissions configuration for RostraCore.
 *
 * Defines which navigation items and routes each user role can access.
 * The `UserRole` type is the canonical definition — re-exported here for
 * convenience so consumers can import everything from one place.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole =
  | 'admin'
  | 'company_admin'
  | 'scheduler'
  | 'finance'
  | 'guard'
  | 'superadmin'
  | 'client_viewer'

/**
 * A single top-level navigation item shown in the sidebar.
 *
 * `icon` is the Lucide icon *name* (string) so this config file stays
 * framework-agnostic and can be imported in middleware / server code without
 * pulling in React components.  The Sidebar component maps the name to the
 * actual icon component.
 */
export interface NavItem {
  /** Stable identifier used as React key and for active-state matching. */
  id: string
  /** Human-readable label displayed in the sidebar. */
  label: string
  /** Lucide icon name (e.g. "LayoutDashboard"). */
  icon: string
  /** The route this item links to. */
  href: string
  /** Roles that can see and access this item. */
  roles: UserRole[]
  /**
   * Optional sub-routes that belong to this navigation group.
   * Used by `canAccessRoute` to match deep paths back to their parent item.
   */
  subRoutes?: string[]
}

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

/**
 * The top-level navigation items for RostraCore (flat list for route matching).
 *
 * Access rules:
 *  - Dashboard   → all roles
 *  - People      → admin, company_admin, scheduler (read-only), superadmin
 *  - Clients & Sites → admin, company_admin, scheduler, superadmin
 *  - Schedule    → admin, company_admin, scheduler, superadmin
 *  - Time & Leave → admin, company_admin, scheduler, guard (own only), superadmin
 *  - Payroll     → admin, company_admin, finance, guard (own payslips), superadmin
 *  - Assets      → admin, company_admin, scheduler, superadmin
 *  - Settings    → admin, company_admin, superadmin
 *
 * NOTE: The sidebar now uses a grouped structure (see Sidebar.tsx).
 * This flat list is kept for route permission checks and middleware.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    href: '/dashboard',
    roles: ['admin', 'company_admin', 'scheduler', 'finance', 'guard', 'superadmin', 'client_viewer'],
  },
  {
    id: 'people',
    label: 'Employees',
    icon: 'Users',
    href: '/employees',
    roles: ['admin', 'company_admin', 'scheduler', 'superadmin'],
    subRoutes: [
      '/employees',
      '/employees/dashboard',
      '/certifications',
      '/documents',
    ],
  },
  {
    id: 'clients-sites',
    label: 'Clients & Sites',
    icon: 'Building2',
    href: '/clients',
    roles: ['admin', 'company_admin', 'scheduler', 'superadmin'],
    subRoutes: ['/clients', '/sites'],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: 'CalendarClock',
    href: '/roster',
    roles: ['admin', 'company_admin', 'scheduler', 'superadmin'],
    subRoutes: [
      '/roster',
      '/roster/assignments',
      '/roster/unfilled',
      '/roster/generate',
      '/shifts',
      '/calendar',
      '/schedule',
    ],
  },
  {
    id: 'time-leave',
    label: 'Time & Leave',
    icon: 'Clock',
    href: '/leave',
    roles: ['admin', 'company_admin', 'scheduler', 'guard', 'superadmin'],
    subRoutes: ['/leave', '/availability'],
  },
  {
    id: 'availability',
    label: 'Availability',
    icon: 'CalendarCheck',
    href: '/availability',
    roles: ['admin', 'company_admin', 'scheduler', 'guard', 'superadmin'],
    subRoutes: ['/availability'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: 'Banknote',
    href: '/payroll',
    roles: ['admin', 'company_admin', 'finance', 'guard', 'superadmin'],
    subRoutes: ['/payroll', '/billing/subscription'],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: 'FileText',
    href: '/billing/invoices',
    roles: ['admin', 'company_admin', 'finance', 'superadmin'],
    subRoutes: ['/billing/invoices'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'BarChart3',
    href: '/reports',
    roles: ['admin', 'company_admin', 'finance', 'superadmin'],
    subRoutes: ['/reports'],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'Package',
    href: '/assets',
    roles: ['admin', 'company_admin', 'scheduler', 'superadmin'],
    subRoutes: ['/assets'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    href: '/settings',
    roles: ['admin', 'company_admin', 'superadmin'],
    subRoutes: [
      '/settings',
      '/settings/users',
      '/settings/hourly-rates',
      '/settings/shift-patterns',
      '/settings/company-profile',
      '/settings/change-password',
    ],
  },
]

// ---------------------------------------------------------------------------
// Route → role mapping
// ---------------------------------------------------------------------------

/**
 * Maps route *prefixes* (or exact paths) to the roles permitted to access them.
 *
 * Matching strategy used by `canAccessRoute`:
 *  1. Exact match first.
 *  2. Prefix match — the longest matching prefix wins.
 *
 * Keys must start with `/`.  Wildcard semantics are expressed through
 * prefix matching in `canAccessRoute`; no glob syntax is used here so
 * the record stays plain and serialisable.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard — everyone
  '/dashboard': ['admin', 'company_admin', 'scheduler', 'finance', 'guard', 'superadmin', 'client_viewer'],

  // People / Employees
  '/employees': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/certifications': ['admin', 'company_admin', 'scheduler', 'superadmin'],

  // Clients & Sites
  '/clients': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/sites': ['admin', 'company_admin', 'scheduler', 'superadmin'],

  // Schedule
  '/roster': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/shifts': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/calendar': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/schedule': ['admin', 'company_admin', 'scheduler', 'superadmin'],

  // Time & Leave — guards can access their own records (enforced server-side)
  '/availability': ['admin', 'company_admin', 'scheduler', 'guard', 'superadmin'],
  '/leave': ['admin', 'company_admin', 'scheduler', 'guard', 'superadmin'],

  // Payroll — guards see own payslips only (enforced server-side)
  '/payroll': ['admin', 'company_admin', 'finance', 'guard', 'superadmin'],
  '/billing': ['admin', 'company_admin', 'finance', 'superadmin'],

  // Reports
  '/reports': ['admin', 'company_admin', 'finance', 'superadmin'],

  // Documents
  '/documents': ['admin', 'company_admin', 'guard', 'superadmin'],

  // Assets
  '/assets': ['admin', 'company_admin', 'scheduler', 'superadmin'],

  // Settings (change-password is accessible to all authenticated users)
  '/settings': ['admin', 'company_admin', 'superadmin'],
  '/settings/change-password': ['admin', 'company_admin', 'scheduler', 'finance', 'guard', 'superadmin'],

  // Client Requests
  '/client-requests': ['admin', 'company_admin', 'scheduler', 'superadmin', 'client_viewer'],

  // Roster Upload & Templates
  '/roster/upload': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/roster/templates': ['admin', 'company_admin', 'scheduler', 'superadmin'],

  // Operations
  '/maintenance': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/incidents': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/attendance': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/training': ['admin', 'company_admin', 'scheduler', 'superadmin'],
  '/fleet': ['admin', 'company_admin', 'superadmin'],

  // Superadmin only
  '/superadmin': ['superadmin'],
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns the navigation items visible to the given role.
 *
 * @example
 * const items = getNavForRole('guard')
 * // → [Dashboard, Time & Leave, Payroll]
 */
export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

/**
 * Returns `true` if the given role is permitted to access `path`.
 *
 * Matching order:
 *  1. Exact match in `ROUTE_PERMISSIONS`.
 *  2. Longest prefix match in `ROUTE_PERMISSIONS` (handles `/roster/assignments`, etc.).
 *  3. Superadmin bypasses all restrictions — always returns `true`.
 *
 * @param role  - The authenticated user's role.
 * @param path  - The pathname to check (e.g. `/roster/assignments`).
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  // Superadmin has unrestricted access
  if (role === 'superadmin') return true

  // Normalise path: strip trailing slash unless it's the root
  const normPath = path.length > 1 ? path.replace(/\/$/, '') : path

  // 1. Exact match
  if (Object.prototype.hasOwnProperty.call(ROUTE_PERMISSIONS, normPath)) {
    return ROUTE_PERMISSIONS[normPath].includes(role)
  }

  // 2. Longest prefix match
  const prefixes = Object.keys(ROUTE_PERMISSIONS)
    .filter((prefix) => normPath.startsWith(prefix + '/') || normPath === prefix)
    .sort((a, b) => b.length - a.length) // longest first

  if (prefixes.length > 0) {
    return ROUTE_PERMISSIONS[prefixes[0]].includes(role)
  }

  // No matching rule → deny by default
  return false
}
