"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Clock,
  Banknote,
  FileText,
  BarChart3,
  Package,
  Settings,
  Shield,
  Siren,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Award,
  CalendarCheck,
  MapPin,
  Wallet,
  UserCog,
  Building,
  Gauge,
  Wrench,
  AlertTriangle,
  AlertCircle,
  Route,
  Calculator,
  ShieldCheck,
  Scale,
  ShieldBan,
  Activity,
  TrendingDown,
  ShieldAlert,
  CalendarDays,
  ArrowLeftRight,
  ClipboardCheck,
  UserCheck,
  UserSearch,
  Key,
  Radio,
  Bell,
  BookOpen,
  GraduationCap,
  DollarSign,
  Car,
  ClipboardList,
  Gavel,
  Megaphone,
  Hammer,
  Target,
  History,
  Timer,
  FileBarChart,
  TrendingUp,
  CalendarRange,
  Phone,
  Download,
  HeartPulse,
  Receipt,
  FileCheck,
  Repeat,
  PieChart,
  ShieldQuestion,
  Radar,
  Grid3X3,
  Flame,
  Star,
  Coins,
  Map,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole =
  | "admin"
  | "company_admin"
  | "scheduler"
  | "guard"
  | "finance"
  | "superadmin";

interface NavChild {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

interface NavGroup {
  kind: "group";
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavChild[];
  section: "main" | "system" | "platform";
}

interface NavStandalone {
  kind: "standalone";
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
  section: "main" | "system" | "platform";
}

type NavEntry = NavGroup | NavStandalone;

// ---------------------------------------------------------------------------
// Navigation structure — grouped with role-based children
// ---------------------------------------------------------------------------

const ALL_ROLES: UserRole[] = [
  "admin",
  "company_admin",
  "scheduler",
  "finance",
  "guard",
  "superadmin",
];

const MANAGEMENT_ROLES: UserRole[] = [
  "admin",
  "company_admin",
  "scheduler",
  "superadmin",
];

const FINANCE_ROLES: UserRole[] = [
  "admin",
  "company_admin",
  "finance",
  "superadmin",
];

const ADMIN_ROLES: UserRole[] = ["admin", "company_admin", "superadmin"];

const NAV_ENTRIES: NavEntry[] = [
  // ── MAIN ──────────────────────────────────────────────
  {
    kind: "standalone",
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    roles: ALL_ROLES,
    section: "main",
  },
  {
    kind: "standalone",
    key: "ops-summary",
    label: "Ops Summary",
    icon: Zap,
    href: "/ops-summary",
    roles: ADMIN_ROLES,
    section: "main",
  },
  {
    kind: "standalone",
    key: "emergency",
    label: "Emergency",
    icon: Siren,
    href: "/emergency",
    roles: MANAGEMENT_ROLES,
    section: "main",
  },
  {
    kind: "standalone",
    key: "lone-worker",
    label: "Lone Worker",
    icon: UserSearch,
    href: "/lone-worker",
    roles: MANAGEMENT_ROLES,
    section: "main",
  },
  {
    kind: "standalone",
    key: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    href: "/messaging",
    roles: ALL_ROLES,
    section: "main",
  },
  {
    kind: "group",
    key: "workforce",
    label: "Workforce",
    icon: Users,
    section: "main",
    children: [
      {
        key: "employees",
        label: "Employees",
        href: "/employees",
        icon: Users,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "certifications",
        label: "Certifications",
        href: "/certifications",
        icon: Award,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "cert-alerts",
        label: "Cert Alerts",
        href: "/cert-alerts",
        icon: Bell,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "training",
        label: "Training",
        href: "/training",
        icon: GraduationCap,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "skills-matrix",
        label: "Skills Matrix",
        href: "/employees/skills-matrix",
        icon: Grid3X3,
        roles: ADMIN_ROLES,
      },
      {
        key: "disciplinary",
        label: "Disciplinary",
        href: "/disciplinary",
        icon: Gavel,
        roles: ADMIN_ROLES,
      },
      {
        key: "emergency-contacts",
        label: "Emergency Contacts",
        href: "/emergency-contacts",
        icon: Phone,
        roles: ADMIN_ROLES,
      },
      {
        key: "iod",
        label: "Injury on Duty",
        href: "/iod",
        icon: HeartPulse,
        roles: ADMIN_ROLES,
      },
      {
        key: "guard-grades",
        label: "Guard Grades",
        href: "/employees/grades",
        icon: Shield,
        roles: ADMIN_ROLES,
      },
      {
        key: "deployments",
        label: "Deployments",
        href: "/deployments",
        icon: History,
        roles: ADMIN_ROLES,
      },
      {
        key: "deployment-map",
        label: "Deployment Map",
        href: "/deployments/map",
        icon: Map,
        roles: ADMIN_ROLES,
      },
      {
        key: "schedule",
        label: "Schedule",
        href: "/roster",
        icon: CalendarClock,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "posting-alerts",
        label: "Posting Alerts",
        href: "/roster/alerts",
        icon: AlertTriangle,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "exceptions",
        label: "Exception Log",
        href: "/roster/exceptions",
        icon: AlertCircle,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "coverage",
        label: "Coverage Calendar",
        href: "/roster/coverage",
        icon: CalendarDays,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "shift-swaps",
        label: "Shift Swaps",
        href: "/roster/swaps",
        icon: ArrowLeftRight,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "spare-pool",
        label: "Spare Pool",
        href: "/roster/spare-pool",
        icon: ShieldCheck,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "compliance",
        label: "BCEA Compliance",
        href: "/roster/compliance",
        icon: Scale,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "guard-restrictions",
        label: "Guard Restrictions",
        href: "/employees/restrictions",
        icon: ShieldBan,
        roles: ADMIN_ROLES,
      },
      {
        key: "hr-analytics",
        label: "HR Analytics",
        href: "/employees/hr-analytics",
        icon: BarChart3,
        roles: ADMIN_ROLES,
      },
      {
        key: "turnover",
        label: "Turnover & Retention",
        href: "/employees/turnover",
        icon: TrendingDown,
        roles: ADMIN_ROLES,
      },
      {
        key: "performance-dashboard",
        label: "Performance",
        href: "/employees/performance",
        icon: Activity,
        roles: ADMIN_ROLES,
      },
      {
        key: "workforce-compliance",
        label: "Compliance",
        href: "/employees/compliance",
        icon: ShieldAlert,
        roles: ADMIN_ROLES,
      },
      {
        key: "time-leave",
        label: "Time & Leave",
        href: "/leave",
        icon: Clock,
        roles: [
          "admin",
          "company_admin",
          "scheduler",
          "guard",
          "superadmin",
        ],
      },
      {
        key: "overtime",
        label: "Overtime",
        href: "/overtime",
        icon: Timer,
        roles: ADMIN_ROLES,
      },
      {
        key: "attendance",
        label: "Attendance",
        href: "/attendance",
        icon: Gauge,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "attendance-analytics",
        label: "Attendance Analytics",
        href: "/attendance/analytics",
        icon: Activity,
        roles: ADMIN_ROLES,
      },
      {
        key: "availability",
        label: "Availability",
        href: "/availability",
        icon: CalendarCheck,
        roles: [
          "admin",
          "company_admin",
          "scheduler",
          "guard",
          "superadmin",
        ],
      },
      {
        key: "availability-heatmap",
        label: "Avail. Heatmap",
        href: "/availability/heatmap",
        icon: Flame,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    kind: "group",
    key: "operations",
    label: "Operations",
    icon: Building2,
    section: "main",
    children: [
      {
        key: "clients",
        label: "Clients & Sites",
        href: "/clients",
        icon: Building,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "contract-renewals",
        label: "Contract Renewals",
        href: "/clients/renewals",
        icon: CalendarClock,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "client-satisfaction",
        label: "Satisfaction",
        href: "/clients/satisfaction",
        icon: Star,
        roles: ADMIN_ROLES,
      },
      {
        key: "sites",
        label: "Sites",
        href: "/sites",
        icon: MapPin,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "site-risk",
        label: "Site Risk",
        href: "/sites/risk",
        icon: ShieldQuestion,
        roles: ADMIN_ROLES,
      },
      {
        key: "patrols",
        label: "Patrols",
        href: "/patrols",
        icon: Route,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "patrol-analytics",
        label: "Patrol Analytics",
        href: "/patrols/analytics",
        icon: Radar,
        roles: ADMIN_ROLES,
      },
      {
        key: "inspections",
        label: "Inspections",
        href: "/inspections",
        icon: ClipboardCheck,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "incidents",
        label: "Incidents",
        href: "/incidents",
        icon: AlertTriangle,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "incident-analytics",
        label: "Incident Analytics",
        href: "/incidents/analytics",
        icon: PieChart,
        roles: ADMIN_ROLES,
      },
      {
        key: "assets",
        label: "Assets",
        href: "/assets",
        icon: Package,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "geofencing",
        label: "Geofencing",
        href: "/geofencing",
        icon: MapPin,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "visitors",
        label: "Visitors",
        href: "/visitors",
        icon: UserCheck,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "keys",
        label: "Key Holding",
        href: "/keys",
        icon: Key,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "comm-log",
        label: "Comms Log",
        href: "/comm-log",
        icon: Radio,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "shift-handovers",
        label: "Shift Handovers",
        href: "/shift-handovers",
        icon: Repeat,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "occurrence-book",
        label: "Occurrence Book",
        href: "/occurrence-book",
        icon: BookOpen,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "documents",
        label: "Documents",
        href: "/documents",
        icon: FileText,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "fleet",
        label: "Fleet",
        href: "/fleet",
        icon: Car,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "daily-activity",
        label: "Daily Activity",
        href: "/daily-activity",
        icon: ClipboardList,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "announcements",
        label: "Announcements",
        href: "/announcements",
        icon: Megaphone,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "maintenance",
        label: "Maintenance",
        href: "/maintenance",
        icon: Hammer,
        roles: MANAGEMENT_ROLES,
      },
      {
        key: "contract-compliance",
        label: "Contract Compliance",
        href: "/contract-compliance",
        icon: FileCheck,
        roles: ADMIN_ROLES,
      },
      {
        key: "sla-compliance",
        label: "SLA Compliance",
        href: "/sla-compliance",
        icon: Target,
        roles: ADMIN_ROLES,
      },
      {
        key: "client-reports",
        label: "Client Reports",
        href: "/client-reports",
        icon: FileBarChart,
        roles: ADMIN_ROLES,
      },
      {
        key: "workforce-forecast",
        label: "Forecasting",
        href: "/workforce-forecast",
        icon: TrendingUp,
        roles: ADMIN_ROLES,
      },
      {
        key: "compliance-calendar",
        label: "Compliance Cal",
        href: "/compliance-calendar",
        icon: CalendarRange,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    kind: "group",
    key: "finance",
    label: "Finance",
    icon: Wallet,
    section: "main",
    children: [
      {
        key: "payroll",
        label: "Payroll",
        href: "/payroll",
        icon: Banknote,
        roles: [
          "admin",
          "company_admin",
          "finance",
          "guard",
          "superadmin",
        ],
      },
      {
        key: "invoices",
        label: "Invoices",
        href: "/billing/invoices",
        icon: FileText,
        roles: FINANCE_ROLES,
      },
      {
        key: "reports",
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: FINANCE_ROLES,
      },
      {
        key: "cost-forecast",
        label: "Cost Forecast",
        href: "/roster/forecast",
        icon: Calculator,
        roles: FINANCE_ROLES,
      },
      {
        key: "contract-values",
        label: "Contract Values",
        href: "/contract-values",
        icon: DollarSign,
        roles: FINANCE_ROLES,
      },
      {
        key: "payroll-export",
        label: "Payroll Export",
        href: "/payroll/exports",
        icon: Download,
        roles: FINANCE_ROLES,
      },
      {
        key: "budgets",
        label: "Budgets",
        href: "/budgets",
        icon: Wallet,
        roles: FINANCE_ROLES,
      },
      {
        key: "site-profitability",
        label: "Site Profitability",
        href: "/site-profitability",
        icon: TrendingUp,
        roles: FINANCE_ROLES,
      },
      {
        key: "payroll-reports",
        label: "Payroll Reports",
        href: "/payroll/reports",
        icon: Receipt,
        roles: FINANCE_ROLES,
      },
      {
        key: "shift-costs",
        label: "Shift Costs",
        href: "/shifts/costs",
        icon: Coins,
        roles: FINANCE_ROLES,
      },
      {
        key: "revenue",
        label: "Revenue",
        href: "/revenue",
        icon: TrendingUp,
        roles: FINANCE_ROLES,
      },
    ],
  },

  // ── SYSTEM ────────────────────────────────────────────
  {
    kind: "group",
    key: "settings",
    label: "Settings",
    icon: Settings,
    section: "system",
    children: [
      {
        key: "settings-general",
        label: "General",
        href: "/settings",
        icon: Settings,
        roles: ADMIN_ROLES,
      },
      {
        key: "settings-users",
        label: "Users",
        href: "/settings/users",
        icon: UserCog,
        roles: ADMIN_ROLES,
      },
      {
        key: "settings-company",
        label: "Company Profile",
        href: "/settings/company-profile",
        icon: Building,
        roles: ADMIN_ROLES,
      },
      {
        key: "settings-rates",
        label: "Hourly Rates",
        href: "/settings/hourly-rates",
        icon: Gauge,
        roles: ADMIN_ROLES,
      },
      {
        key: "settings-patterns",
        label: "Shift Patterns",
        href: "/settings/shift-patterns",
        icon: Wrench,
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ── PLATFORM (superadmin only) ────────────────────────
  {
    kind: "standalone",
    key: "platform",
    label: "Platform Admin",
    icon: Shield,
    href: "/superadmin",
    roles: ["superadmin"],
    section: "platform",
  },
];

// ---------------------------------------------------------------------------
// Route-matching helpers
// ---------------------------------------------------------------------------

const ROUTE_GROUPS: Record<string, string[]> = {
  "/employees": ["/employees", "/certifications", "/documents"],
  "/employees/grades": ["/employees/grades"],
  "/certifications": ["/certifications"],
  "/clients": ["/clients", "/sites"],
  "/clients/renewals": ["/clients/renewals"],
  "/employees/restrictions": ["/employees/restrictions"],
  "/employees/hr-analytics": ["/employees/hr-analytics"],
  "/employees/turnover": ["/employees/turnover"],
  "/employees/compliance": ["/employees/compliance"],
  "/attendance/analytics": ["/attendance/analytics"],
  "/sites": ["/sites"],
  "/roster": ["/roster", "/shifts", "/calendar", "/schedule"],
  "/roster/alerts": ["/roster/alerts"],
  "/roster/exceptions": ["/roster/exceptions"],
  "/roster/spare-pool": ["/roster/spare-pool"],
  "/roster/compliance": ["/roster/compliance"],
  "/roster/forecast": ["/roster/forecast"],
  "/roster/coverage": ["/roster/coverage"],
  "/leave": ["/leave"],
  "/availability": ["/availability"],
  "/payroll": ["/payroll", "/billing/subscription"],
  "/billing/invoices": ["/billing/invoices"],
  "/reports": ["/reports"],
  "/assets": ["/assets"],
  "/settings": ["/settings"],
  "/superadmin": ["/superadmin"],
};

function isRouteActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";

  // Exact match for settings sub-pages
  if (href.startsWith("/settings/")) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  const group = ROUTE_GROUPS[href];
  if (group) {
    return group.some(
      (route) => pathname === route || pathname?.startsWith(route + "/")
    );
  }
  return pathname === href || pathname?.startsWith(href + "/");
}

function isGroupActive(children: NavChild[], pathname: string): boolean {
  return children.some((child) => isRouteActive(child.href, pathname));
}

// ---------------------------------------------------------------------------
// Role-based filtering
// ---------------------------------------------------------------------------

function getVisibleChildren(
  children: NavChild[],
  role: UserRole
): NavChild[] {
  return children.filter((child) => child.roles.includes(role));
}

function getVisibleEntries(role: UserRole): NavEntry[] {
  return NAV_ENTRIES.filter((entry) => {
    if (entry.kind === "standalone") {
      return entry.roles.includes(role);
    }
    // Group is visible if at least one child is visible
    return getVisibleChildren(entry.children, role).length > 0;
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_GROUPS_KEY = "sidebar-groups";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(
  fullName?: string | null,
  username?: string | null
): string {
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
// Sub-components
// ---------------------------------------------------------------------------

/** Tooltip for collapsed standalone items */
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
          whitespace-nowrap rounded-md bg-gray-800 border border-gray-700
          px-2.5 py-1.5 text-xs font-medium text-white shadow-xl
          opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
          transition-all duration-150 ease-out
        "
      >
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
      </div>
    </div>
  );
}

/** Floating popover for collapsed group items — shows children on hover */
function NavPopover({
  entry,
  children: visibleChildren,
  pathname,
  onNavigate,
}: {
  entry: NavGroup;
  children: NavChild[];
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = entry.icon;
  const active = isGroupActive(visibleChildren, pathname);

  return (
    <div className="relative group/popover">
      {/* Icon button */}
      <div
        className={`
          flex items-center justify-center px-3 py-2.5 rounded-lg cursor-pointer
          transition-colors duration-150
          ${
            active
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }
        `}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            active ? "text-blue-500" : "text-gray-400"
          }`}
        />
      </div>

      {/* Floating popover */}
      <div
        className="
          invisible opacity-0 group-hover/popover:visible group-hover/popover:opacity-100
          absolute left-full top-0 ml-2 z-50
          min-w-[180px] py-1.5 rounded-xl
          bg-white border border-gray-200 shadow-xl
          transition-all duration-150 ease-out
        "
      >
        {/* Group header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {entry.label}
          </span>
        </div>

        {/* Children links */}
        {visibleChildren.map((child) => {
          const childActive = isRouteActive(child.href, pathname);
          const ChildIcon = child.icon;
          return (
            <Link
              key={child.key}
              href={child.href}
              onClick={onNavigate}
              className={`
                flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md
                text-sm transition-colors duration-100
                ${
                  childActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              <ChildIcon
                className={`w-4 h-4 flex-shrink-0 ${
                  childActive ? "text-blue-500" : "text-gray-400"
                }`}
              />
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Section label — hidden when collapsed */
function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className="my-2 mx-3 h-px bg-gray-200" />;
  }
  return (
    <div className="mt-6 mb-2 px-3">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Desktop collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mounted = useRef(false);

  // Derive nav items from role
  const role = (user?.role ?? "guard") as UserRole;
  const isSuperadmin =
    user?.is_superadmin === true || role?.toLowerCase() === "superadmin";
  const visibleEntries = getVisibleEntries(role);

  // ── Effects ────────────────────────────────────────────

  useEffect(() => {
    mounted.current = true;
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setMobileOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Persist expanded groups
  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  // Auto-expand group when navigating to a child route
  useEffect(() => {
    for (const entry of NAV_ENTRIES) {
      if (entry.kind === "group") {
        const visChildren = getVisibleChildren(entry.children, role);
        if (isGroupActive(visChildren, pathname)) {
          setExpandedGroups((prev) => {
            if (prev[entry.key]) return prev;
            return { ...prev, [entry.key]: true };
          });
        }
      }
    }
  }, [pathname, role]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ── Handlers ───────────────────────────────────────────

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  // ── Render helpers ─────────────────────────────────────

  const renderStandalone = (
    entry: NavStandalone,
    collapsed: boolean
  ) => {
    const active = isRouteActive(entry.href, pathname);
    const Icon = entry.icon;
    const isPlatform = entry.key === "platform";

    const link = (
      <Link
        href={entry.href}
        onClick={handleNavClick}
        aria-label={entry.label}
        aria-current={active ? "page" : undefined}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${collapsed ? "justify-center" : ""}
          ${
            active
              ? "bg-blue-50 text-blue-700 font-medium"
              : isPlatform
              ? "text-amber-700 hover:bg-amber-50"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }
        `}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            active
              ? "text-blue-500"
              : isPlatform
              ? "text-amber-500"
              : "text-gray-400"
          }`}
        />
        {!collapsed && (
          <span
            className={`text-sm font-medium truncate ${
              active
                ? "text-blue-700"
                : isPlatform
                ? "text-amber-700"
                : "text-gray-600"
            }`}
          >
            {entry.label}
          </span>
        )}
      </Link>
    );

    if (collapsed && !isMobile) {
      return (
        <NavTooltip key={entry.key} label={entry.label}>
          {link}
        </NavTooltip>
      );
    }

    return <div key={entry.key}>{link}</div>;
  };

  const renderGroup = (entry: NavGroup, collapsed: boolean) => {
    const visChildren = getVisibleChildren(entry.children, role);
    if (visChildren.length === 0) return null;

    const active = isGroupActive(visChildren, pathname);
    const expanded = expandedGroups[entry.key] ?? false;
    const Icon = entry.icon;

    // Collapsed mode: show popover on hover
    if (collapsed && !isMobile) {
      return (
        <NavPopover
          key={entry.key}
          entry={entry}
          children={visChildren}
          pathname={pathname}
          onNavigate={handleNavClick}
        />
      );
    }

    // Expanded mode: show inline children
    return (
      <div key={entry.key}>
        {/* Group header — clickable to toggle */}
        <button
          onClick={() => toggleGroup(entry.key)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            transition-colors duration-150 ease-out text-left
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${
              active && !expanded
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }
          `}
        >
          <Icon
            className={`w-5 h-5 flex-shrink-0 ${
              active ? "text-blue-500" : "text-gray-400"
            }`}
          />
          <span
            className={`flex-1 text-sm font-medium truncate ${
              active && !expanded ? "text-blue-700" : active ? "text-gray-900" : "text-gray-600"
            }`}
          >
            {entry.label}
          </span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
              expanded ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>

        {/* Children — animated expand */}
        <div
          className={`
            overflow-hidden transition-all duration-200 ease-out
            ${expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <div className="ml-4 pl-3 border-l border-gray-200 mt-0.5 mb-1 space-y-0.5">
            {visChildren.map((child) => {
              const childActive = isRouteActive(child.href, pathname);
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.key}
                  href={child.href}
                  onClick={handleNavClick}
                  aria-current={childActive ? "page" : undefined}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg
                    text-sm transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${
                      childActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <ChildIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      childActive ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── SidebarContent ─────────────────────────────────────

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => {
    // Group entries by section
    const mainEntries = visibleEntries.filter((e) => e.section === "main");
    const systemEntries = visibleEntries.filter(
      (e) => e.section === "system"
    );
    const platformEntries = visibleEntries.filter(
      (e) => e.section === "platform"
    );

    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        {/* Brand / Logo */}
        <div
          className={`
            flex items-center h-16 px-4 border-b border-gray-100 flex-shrink-0
            ${collapsed ? "justify-center" : "justify-between"}
          `}
        >
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="RostraCore — go to dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-sm font-bold leading-none">
                R
              </span>
            </div>
            {!collapsed && (
              <span className="text-gray-900 font-semibold text-base tracking-tight truncate">
                RostraCore
              </span>
            )}
          </Link>

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2"
          aria-label="Main navigation"
        >
          {/* MAIN section */}
          {mainEntries.length > 0 && (
            <>
              <SectionLabel label="Main" collapsed={collapsed} />
              <div className="space-y-0.5">
                {mainEntries.map((entry) =>
                  entry.kind === "standalone"
                    ? renderStandalone(entry, collapsed)
                    : renderGroup(entry, collapsed)
                )}
              </div>
            </>
          )}

          {/* SYSTEM section */}
          {systemEntries.length > 0 && (
            <>
              <SectionLabel label="System" collapsed={collapsed} />
              <div className="space-y-0.5">
                {systemEntries.map((entry) =>
                  entry.kind === "standalone"
                    ? renderStandalone(entry, collapsed)
                    : renderGroup(entry, collapsed)
                )}
              </div>
            </>
          )}

          {/* PLATFORM section (superadmin only) */}
          {platformEntries.length > 0 && (
            <>
              {!collapsed ? (
                <div className="mt-6 mb-2 px-3">
                  <div className="h-px bg-amber-200 mb-2" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    Platform
                  </span>
                </div>
              ) : (
                <div className="my-2 mx-3 h-px bg-amber-200" />
              )}
              <div className="space-y-0.5">
                {platformEntries.map((entry) =>
                  entry.kind === "standalone"
                    ? renderStandalone(entry, collapsed)
                    : renderGroup(entry, collapsed)
                )}
              </div>
            </>
          )}
        </nav>

        {/* User profile card */}
        <div className="flex-shrink-0 border-t border-gray-200">
          <div
            className={`
              flex items-center gap-3 px-3 py-3
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow
                ${
                  isSuperadmin
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

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {user?.full_name || user?.username || "User"}
                </p>
                <p
                  className={`text-xs truncate leading-tight mt-0.5 ${
                    isSuperadmin
                      ? "text-amber-600 font-medium"
                      : "text-gray-500"
                  }`}
                >
                  {getRoleBadgeLabel(user?.role)}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Log out"
                aria-label="Log out"
                className="
                  flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500
                  hover:bg-red-50 rounded-lg transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                "
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {collapsed && !isMobile && (
            <NavTooltip label="Log out">
              <button
                onClick={handleLogout}
                aria-label="Log out"
                className="
                  w-full flex items-center justify-center py-2.5 px-2
                  text-gray-400 hover:text-red-500 hover:bg-red-50
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                "
              >
                <LogOut className="w-5 h-5" />
              </button>
            </NavTooltip>
          )}

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
            <div className="border-t border-gray-200">
              <button
                onClick={toggleCollapsed}
                aria-label={
                  isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                className={`
                  w-full flex items-center py-3 px-3 gap-2
                  text-gray-400 hover:text-gray-700 hover:bg-gray-100
                  transition-colors duration-150 text-xs font-medium
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${collapsed ? "justify-center" : "justify-between"}
                `}
              >
                {!collapsed && (
                  <span className="select-none">Collapse</span>
                )}
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
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="
          lg:hidden fixed top-4 left-4 z-50
          p-2.5 bg-white rounded-xl shadow-lg
          border border-gray-200 text-gray-600
          hover:bg-gray-50 hover:text-gray-900
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        "
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
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

      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className="
          hidden lg:flex flex-col
          fixed top-0 left-0 z-30 h-screen
          transition-[width] duration-300 ease-out will-change-[width]
        "
        style={{
          width: isCollapsed
            ? `${COLLAPSED_WIDTH}px`
            : `${EXPANDED_WIDTH}px`,
        }}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* Desktop spacer */}
      <div
        className="hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-out"
        style={{
          width: isCollapsed
            ? `${COLLAPSED_WIDTH}px`
            : `${EXPANDED_WIDTH}px`,
        }}
        aria-hidden="true"
      />
    </>
  );
}
