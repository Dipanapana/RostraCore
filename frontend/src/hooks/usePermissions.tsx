"use client";

import { useAuth, User } from "@/context/AuthContext";

/**
 * Role hierarchy for RostraCore:
 *
 * SUPERADMIN (Platform Level)
 *   - Can manage ALL organizations
 *   - Can approve/reject organizations
 *   - Can view platform analytics
 *
 * OWNER (Organization Level)
 *   - Full access to organization
 *   - Can invite/manage users
 *   - Can see billing/subscription
 *
 * ADMIN / COMPANY_ADMIN
 *   - Can manage employees, clients, sites
 *   - Can generate rosters
 *   - Can process payroll
 *   - Cannot invite users or manage billing
 *
 * SCHEDULER
 *   - Can view employees, clients, sites
 *   - Can generate and publish rosters
 *   - Cannot access payroll or settings
 *
 * FINANCE
 *   - Can access payroll
 *   - Can generate invoices
 *   - Cannot modify roster or employees
 *
 * GUARD
 *   - Can view own schedule
 *   - Can update availability
 *   - Can view own payslips
 */

// Role definitions
export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'company_admin'
  | 'scheduler'
  | 'finance'
  | 'guard';

// Permissions returned by the hook
export interface Permissions {
  // User checks
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;

  // Feature access
  canManageUsers: boolean;
  canAccessPayroll: boolean;
  canGenerateRoster: boolean;
  canPublishRoster: boolean;
  canViewBilling: boolean;
  canManageOrganization: boolean;
  canManageEmployees: boolean;
  canManageClients: boolean;
  canManageSites: boolean;
  canManageShifts: boolean;
  canViewDashboard: boolean;
  canExportData: boolean;

  // Client-level access
  canSeeAllClients: boolean;
  accessibleClientIds: number[] | null;  // null = all clients
  canAccessClient: (clientId: number) => boolean;

  // Role checks
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

/**
 * Hook for checking user permissions throughout the application.
 *
 * Usage:
 * ```tsx
 * const { canAccessPayroll, canManageUsers, canAccessClient } = usePermissions();
 *
 * // Conditional rendering
 * {canAccessPayroll && <PayrollSection />}
 *
 * // Button disable
 * <button disabled={!canManageUsers}>Invite User</button>
 *
 * // Client-specific checks
 * {canAccessClient(clientId) && <ClientDetails />}
 * ```
 */
export function usePermissions(): Permissions {
  const { user, isAuthenticated } = useAuth();

  // Helper to check if user has a specific role (case-insensitive)
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const userRole = user.role?.toLowerCase();
    if (Array.isArray(role)) {
      return role.some(r => r.toLowerCase() === userRole);
    }
    return role.toLowerCase() === userRole;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  // User type checks
  const isSuperAdmin = user?.is_superadmin === true || hasRole('superadmin');
  const isOwner = user?.is_owner === true;
  const isAdmin = hasAnyRole(['admin', 'company_admin']) || isOwner;

  // Feature permissions based on roles
  const canManageUsers = isOwner || isSuperAdmin;

  const canAccessPayroll = isOwner || hasAnyRole(['admin', 'company_admin', 'finance']);

  const canGenerateRoster = isOwner || hasAnyRole(['admin', 'company_admin', 'scheduler']);

  const canPublishRoster = isOwner || hasAnyRole(['admin', 'company_admin', 'scheduler']);

  const canViewBilling = isOwner || isSuperAdmin;

  const canManageOrganization = isOwner || isSuperAdmin;

  const canManageEmployees = isOwner || hasAnyRole(['admin', 'company_admin']);

  const canManageClients = isOwner || hasAnyRole(['admin', 'company_admin']);

  const canManageSites = isOwner || hasAnyRole(['admin', 'company_admin', 'scheduler']);

  const canManageShifts = isOwner || hasAnyRole(['admin', 'company_admin', 'scheduler']);

  const canViewDashboard = isAuthenticated && !hasRole('guard');  // Guards have their own portal

  const canExportData = isOwner || hasAnyRole(['admin', 'company_admin', 'finance']);

  // Client-level access control
  const canSeeAllClients = isOwner || user?.managed_client_ids === null;

  const accessibleClientIds = user?.managed_client_ids ?? null;

  const canAccessClient = (clientId: number): boolean => {
    if (isSuperAdmin || isOwner) return true;
    if (user?.managed_client_ids === null) return true;  // null = all clients
    if (!user?.managed_client_ids || user.managed_client_ids.length === 0) return false;
    return user.managed_client_ids.includes(clientId);
  };

  return {
    // User checks
    isAuthenticated,
    isSuperAdmin,
    isOwner,
    isAdmin,

    // Feature access
    canManageUsers,
    canAccessPayroll,
    canGenerateRoster,
    canPublishRoster,
    canViewBilling,
    canManageOrganization,
    canManageEmployees,
    canManageClients,
    canManageSites,
    canManageShifts,
    canViewDashboard,
    canExportData,

    // Client-level access
    canSeeAllClients,
    accessibleClientIds,
    canAccessClient,

    // Role checks
    hasRole,
    hasAnyRole,
  };
}

/**
 * Higher-order component for route protection.
 * Redirects to appropriate page if user doesn't have required permission.
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: keyof Omit<Permissions, 'hasRole' | 'hasAnyRole' | 'canAccessClient' | 'accessibleClientIds'>
) {
  return function ProtectedComponent(props: P) {
    const permissions = usePermissions();

    if (!permissions[permission]) {
      // Could redirect or show access denied
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
