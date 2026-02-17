"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Clock,
  Banknote,
  Package,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Canonical user roles — matches backend UserRole enum exactly.
 * admin, company_admin, scheduler, guard, finance, superadmin
 */
export type UserRole =
  | "admin"
  | "company_admin"
  | "scheduler"
  | "guard"
  | "finance"
  | "superadmin";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that can see this item. Empty array = visible to all authenticated users. */
  roles: UserRole[];
}

// ---------------------------------------------------------------------------
// Navigation — role-based access matching the plan's permission matrix
//
// | Nav Item        | Admin | Company Admin | Scheduler | Finance | Guard | Superadmin |
// |-----------------|-------|---------------|-----------|---------|-------|------------|
// | Dashboard       |   Y   |      Y        |     Y     |    Y    |   Y   |     Y      |
// | People          |   Y   |      Y        |  Y (read) |    -    |   -   |     Y      |
// | Clients & Sites |   Y   |      Y        |     Y     |    -    |   -   |     Y      |
// | Schedule        |   Y   |      Y        |     Y     |    -    |   -   |     Y      |
// | Time & Leave    |   Y   |      Y        |     Y     |    -    | Y own |     Y      |
// | Payroll         |   Y   |      Y        |     -     |    Y    | Y own |     Y      |
// | Assets          |   Y   |      Y        |     Y     |    -    |   -   |     Y      |
// | Settings        |   Y   |      Y        |     -     |    -    |   -   |     Y      |
// ---------------------------------------------------------------------------

const ALL_ROLES: UserRole[] = ["admin", "company_admin", "scheduler", "finance", "guard", "superadmin"];

const ALL_NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    key: "people",
    label: "People",
    href: "/employees",
    icon: Users,
    roles: ["admin", "company_admin", "scheduler", "superadmin"],
  },
  {
    key: "clients",
    label: "Clients & Sites",
    href: "/clients",
    icon: Building2,
    roles: ["admin", "company_admin", "scheduler", "superadmin"],
  },
  {
    key: "schedule",
    label: "Schedule",
    href: "/roster",
    icon: CalendarClock,
    roles: ["admin", "company_admin", "scheduler", "superadmin"],
  },
  {
    key: "time-leave",
    label: "Time & Leave",
    href: "/leave",
    icon: Clock,
    roles: ["admin", "company_admin", "scheduler", "guard", "superadmin"],
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/payroll",
    icon: Banknote,
    roles: ["admin", "company_admin", "finance", "guard", "superadmin"],
  },
  {
    key: "assets",
    label: "Assets",
    href: "/assets",
    icon: Package,
    roles: ["admin", "company_admin", "scheduler", "superadmin"],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "company_admin", "superadmin"],
  },
];

const SUPERADMIN_NAV_ITEM: NavItem = {
  key: "platform",
  label: "Platform",
  href: "/superadmin",
  icon: Shield,
  roles: ["superadmin"],
};

// ---------------------------------------------------------------------------
// Role-based filtering
// ---------------------------------------------------------------------------

function getFilteredNav(role: string): NavItem[] {
  const normalizedRole = (role?.toLowerCase() ?? "guard") as UserRole;
  const isSuperadmin = normalizedRole === "superadmin";

  const filtered = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(normalizedRole)
  );

  if (isSuperadmin) {
    filtered.push(SUPERADMIN_NAV_ITEM);
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLAPSED_WIDTH = 64;   // px
const EXPANDED_WIDTH = 260;   // px
const STORAGE_KEY = "sidebar-collapsed";

// ---------------------------------------------------------------------------
// Tooltip component for collapsed icons
// ---------------------------------------------------------------------------

function NavTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
          whitespace-nowrap rounded-md bg-slate-800 border border-slate-700
          px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-xl
          opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
          transition-all duration-150 ease-out
        "
      >
        {label}
        {/* Arrow */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User initials helper
// ---------------------------------------------------------------------------

function getInitials(fullName?: string | null, username?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  return "U";
}

// ---------------------------------------------------------------------------
// Role badge label helper
// ---------------------------------------------------------------------------

function getRoleBadgeLabel(role?: string | null): string {
  if (!role) return "User";
  const map: Record<string, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    company_admin: "Company Admin",
    scheduler: "Scheduler",
    finance: "Finance",
    guard: "Guard",
  };
  return map[role.toLowerCase()] ?? role;
}

// ---------------------------------------------------------------------------
// Main Sidebar component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Desktop collapsed state — persisted to localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track whether we are on mobile (< 1024px)
  const [isMobile, setIsMobile] = useState(false);

  // Ref to detect first render (avoid SSR/hydration mismatch)
  const mounted = useRef(false);

  // Derive nav items from role
  const role = user?.role ?? "guard";
  const isSuperadmin =
    user?.is_superadmin === true || role?.toLowerCase() === "superadmin";
  const navItems = getFilteredNav(role);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    mounted.current = true;

    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile drawer when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  // Route groups: nav items that should also highlight for related pages
  const ROUTE_GROUPS: Record<string, string[]> = {
    "/employees": ["/employees", "/certifications", "/documents"],
    "/clients": ["/clients", "/sites"],
    "/roster": ["/roster", "/shifts", "/calendar", "/schedule"],
    "/leave": ["/leave", "/availability"],
    "/payroll": ["/payroll", "/billing"],
    "/settings": ["/settings"],
  };

  const isActive = (href: string): boolean => {
    if (href === "/dashboard") return pathname === "/dashboard";
    const group = ROUTE_GROUPS[href];
    if (group) {
      return group.some(
        (route) => pathname === route || pathname?.startsWith(route + "/")
      );
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  // -------------------------------------------------------------------------
  // Sub-components (defined inside to access closures cleanly)
  // -------------------------------------------------------------------------

  const NavLinkItem = ({
    item,
    collapsed,
  }: {
    item: NavItem;
    collapsed: boolean;
  }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const isSuperadminItem = item.key === "platform";

    const linkContent = (
      <Link
        href={item.href}
        onClick={handleNavClick}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
          min-h-[44px] lg:min-h-[40px]
          ${collapsed ? "justify-center" : ""}
          ${
            active
              ? "bg-slate-700/50 text-white border-l-2 border-blue-500"
              : isSuperadminItem
              ? "text-amber-300 hover:bg-amber-500/10 border-l-2 border-transparent"
              : "text-slate-300 hover:bg-slate-800 hover:text-white border-l-2 border-transparent"
          }
        `}
      >
        {/* Active left-border accent already set via border-l-2 on parent — icon */}
        <Icon
          className={`
            w-5 h-5 flex-shrink-0 transition-colors duration-150
            ${active ? "text-blue-400" : isSuperadminItem ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"}
          `}
        />

        {/* Label — hidden when collapsed (desktop) */}
        {!collapsed && (
          <span
            className={`
              text-sm font-medium truncate
              transition-opacity duration-200
              ${active ? "text-white" : isSuperadminItem ? "text-amber-300" : "text-slate-300"}
            `}
          >
            {item.label}
          </span>
        )}
      </Link>
    );

    // Wrap with tooltip when sidebar is collapsed (desktop only)
    if (collapsed && !isMobile) {
      return (
        <NavTooltip label={item.label}>
          {linkContent}
        </NavTooltip>
      );
    }

    return linkContent;
  };

  // -------------------------------------------------------------------------
  // Sidebar content (shared between desktop and mobile)
  // -------------------------------------------------------------------------

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* ----------------------------------------------------------------- */}
      {/* Brand / Logo area                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={`
          flex items-center h-16 px-4 border-b border-slate-800 flex-shrink-0
          ${collapsed ? "justify-center" : "justify-between"}
        `}
      >
        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label="RostraCore — go to dashboard"
        >
          {/* Circular "R" mark — always visible */}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-sm font-bold leading-none">R</span>
          </div>

          {/* Full brand name — hidden when collapsed */}
          {!collapsed && (
            <span className="text-white font-semibold text-base tracking-tight truncate">
              RostraCore
            </span>
          )}
        </Link>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Navigation items                                                    */}
      {/* ----------------------------------------------------------------- */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5"
        aria-label="Main navigation"
      >
        {/* Superadmin separator */}
        {isSuperadmin && (
          <>
            {navItems
              .filter((item) => item.key !== "platform")
              .map((item) => (
                <NavLinkItem key={item.key} item={item} collapsed={collapsed} />
              ))}

            {/* Divider before superadmin section */}
            <div className="my-3 mx-2">
              <div className="h-px bg-amber-500/20" />
              {!collapsed && (
                <p className="mt-2 mb-1 px-1 text-xs font-bold text-amber-500/70 uppercase tracking-widest">
                  Platform
                </p>
              )}
            </div>

            <NavLinkItem item={SUPERADMIN_NAV_ITEM} collapsed={collapsed} />
          </>
        )}

        {/* Non-superadmin: render all items normally */}
        {!isSuperadmin &&
          navItems.map((item) => (
            <NavLinkItem key={item.key} item={item} collapsed={collapsed} />
          ))}
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* User profile card                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-shrink-0 border-t border-slate-800">
        {/* Profile row */}
        <div
          className={`
            flex items-center gap-3 px-3 py-3
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {/* Avatar with initials */}
          <div
            className={`
              w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow
              ${isSuperadmin
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
              }
            `}
            aria-hidden="true"
          >
            <span className="text-white font-bold text-sm leading-none">
              {getInitials(user?.full_name, user?.username)}
            </span>
          </div>

          {/* Name + role — hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.full_name || user?.username || "User"}
              </p>
              <p
                className={`text-xs truncate leading-tight mt-0.5 ${
                  isSuperadmin ? "text-amber-400 font-medium" : "text-slate-400"
                }`}
              >
                {getRoleBadgeLabel(user?.role)}
              </p>
            </div>
          )}

          {/* Logout button — shown as icon-only when not collapsed, always show */}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="
                flex-shrink-0 p-1.5 text-slate-500 hover:text-red-400
                hover:bg-red-500/10 rounded-lg transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
              "
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Logout row when collapsed (full-width button with tooltip) */}
        {collapsed && !isMobile && (
          <NavTooltip label="Log out">
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="
                w-full flex items-center justify-center py-2.5 px-2
                text-slate-500 hover:text-red-400 hover:bg-red-500/10
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
              "
            >
              <LogOut className="w-5 h-5" />
            </button>
          </NavTooltip>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Collapse toggle button — desktop only                             */}
        {/* ---------------------------------------------------------------- */}
        {!isMobile && (
          <div className="border-t border-slate-800">
            <button
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`
                w-full flex items-center py-3 px-3 gap-2
                text-slate-500 hover:text-slate-200 hover:bg-slate-800
                transition-colors duration-150 text-xs font-medium
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                ${collapsed ? "justify-center" : "justify-between"}
              `}
            >
              {!collapsed && <span className="select-none">Collapse</span>}
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* -------------------------------------------------------------------
          Mobile hamburger button — fixed top-left, only on mobile
          ------------------------------------------------------------------- */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="
          lg:hidden fixed top-4 left-4 z-50
          p-2.5 bg-slate-900 rounded-xl shadow-lg
          border border-slate-700 text-slate-300
          hover:bg-slate-800 hover:text-white
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        "
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* -------------------------------------------------------------------
          Mobile overlay backdrop
          ------------------------------------------------------------------- */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* -------------------------------------------------------------------
          Mobile drawer sidebar
          ------------------------------------------------------------------- */}
      <aside
        aria-label="Navigation drawer"
        className={`
          lg:hidden fixed top-0 left-0 z-50 h-screen
          transition-transform duration-300 ease-out will-change-transform
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ width: `${EXPANDED_WIDTH}px` }}
      >
        <SidebarContent collapsed={false} />
      </aside>

      {/* -------------------------------------------------------------------
          Desktop sidebar — always visible, collapsible
          ------------------------------------------------------------------- */}
      <aside
        aria-label="Main navigation"
        className="
          hidden lg:flex flex-col
          fixed top-0 left-0 z-30 h-screen
          transition-[width] duration-300 ease-out will-change-[width]
        "
        style={{ width: isCollapsed ? `${COLLAPSED_WIDTH}px` : `${EXPANDED_WIDTH}px` }}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* -------------------------------------------------------------------
          Desktop spacer — pushes main content right of sidebar.
          Matches sidebar width with the same transition.
          ------------------------------------------------------------------- */}
      <div
        className="hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-out"
        style={{ width: isCollapsed ? `${COLLAPSED_WIDTH}px` : `${EXPANDED_WIDTH}px` }}
        aria-hidden="true"
      />
    </>
  );
}
