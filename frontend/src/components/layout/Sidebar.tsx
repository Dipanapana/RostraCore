"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Briefcase,
  MapPin,
  Calendar,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  AlertCircle,
  Award,
  Clock,
  DollarSign,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Shield,
  ShieldAlert,
  ChevronDown,
  Building2,
  CalendarClock,
  Wallet,
  Banknote,
  CalendarOff,
  Cog,
  Repeat,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  id: string;
  name: string;
  icon: any;
  defaultExpanded?: boolean;
  items: NavItem[];
}

// Navigation groups structure
const navGroups: NavGroup[] = [
  {
    id: "clients-sites",
    name: "Clients & Sites",
    icon: Building2,
    items: [
      { name: "Clients", href: "/clients", icon: Briefcase },
      { name: "Sites", href: "/sites", icon: MapPin },
    ],
  },
  {
    id: "workforce",
    name: "Workforce",
    icon: Users,
    items: [
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Data Quality", href: "/employees/dashboard", icon: ShieldAlert },
      { name: "Certifications", href: "/certifications", icon: Award },
    ],
  },
  {
    id: "scheduling",
    name: "Scheduling",
    icon: CalendarClock,
    defaultExpanded: true,
    items: [
      { name: "Shifts", href: "/shifts", icon: Calendar },
      { name: "Roster", href: "/roster", icon: ClipboardList },
      { name: "Assignments", href: "/roster/assignments", icon: ClipboardCheck },
      { name: "Unfilled Shifts", href: "/roster/unfilled", icon: AlertCircle },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    id: "time-leave",
    name: "Time & Leave",
    icon: Clock,
    items: [
      { name: "Availability", href: "/availability", icon: Clock },
      { name: "Leave Requests", href: "/leave", icon: CalendarOff },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    icon: Wallet,
    items: [
      { name: "Payroll", href: "/payroll", icon: Banknote },
      { name: "Billing", href: "/billing", icon: CreditCard },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    items: [
      { name: "Users", href: "/settings/users", icon: UserCog },
      { name: "Hourly Rates", href: "/settings/hourly-rates", icon: DollarSign },
      { name: "Shift Patterns", href: "/settings/shift-patterns", icon: Repeat },
      { name: "General", href: "/settings", icon: Cog },
    ],
  },
];

// Superadmin group (conditional)
const superadminGroup: NavGroup = {
  id: "superadmin",
  name: "Superadmin",
  icon: Shield,
  items: [
    { name: "Organizations", href: "/superadmin", icon: Shield },
    { name: "Platform Settings", href: "/superadmin/settings", icon: Settings },
  ],
};

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Check if user is superadmin
  const isSuperadmin = user?.role?.toLowerCase() === "superadmin";

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize expanded groups from localStorage or defaults
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-expanded-groups");
    if (stored) {
      setExpandedGroups(new Set(JSON.parse(stored)));
    } else {
      // Default: expand groups with defaultExpanded or groups containing active route
      const defaults = new Set<string>();
      navGroups.forEach((group) => {
        if (group.defaultExpanded) {
          defaults.add(group.id);
        }
        // Auto-expand if contains active route
        if (group.items.some((item) => isActive(item.href))) {
          defaults.add(group.id);
        }
      });
      setExpandedGroups(defaults);
    }
  }, [pathname]);

  // Save expanded state to localStorage
  useEffect(() => {
    if (expandedGroups.size > 0) {
      localStorage.setItem(
        "sidebar-expanded-groups",
        JSON.stringify(Array.from(expandedGroups))
      );
    }
  }, [expandedGroups]);

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActive(item.href));
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (isMobile) {
        // Accordion mode on mobile: only one group open at a time
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.clear();
          next.add(groupId);
        }
      } else {
        // Toggle mode on desktop
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
      }
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleNavClick = () => {
    // Close mobile drawer on navigation
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Single nav link component
  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={handleNavClick}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative
          min-h-[44px] lg:min-h-[40px]
          ${
            active
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }
        `}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${
            active
              ? "text-white"
              : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
          }`}
        />
        <span className="text-sm font-medium">{item.name}</span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  // Collapsible group component
  const NavGroupComponent = ({ group }: { group: NavGroup }) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupActive = isGroupActive(group);
    const Icon = group.icon;

    return (
      <div className="mb-1">
        {/* Group Header */}
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
            min-h-[52px] lg:min-h-[44px]
            ${
              groupActive && !isExpanded
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            }
          `}
        >
          <div className="flex items-center gap-3">
            <Icon
              className={`w-5 h-5 ${
                groupActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            />
            <span className="text-sm font-semibold">{group.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isExpanded && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {group.items.length}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* Collapsible Content */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-4 pt-1 pb-2 space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/5">
      {/* Logo & Close Button (mobile) */}
      <div className="flex items-center justify-between px-5 py-6">
        <Link href="/dashboard" onClick={handleNavClick} className="block">
          <Image
            src="/rostracore-logo.svg"
            alt="RostraCore"
            width={160}
            height={45}
            className="w-36 h-auto drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]"
            priority
          />
        </Link>
        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        {/* Dashboard - Standalone at top */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              min-h-[52px] lg:min-h-[48px]
              ${
                pathname === "/dashboard"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }
            `}
          >
            <LayoutDashboard
              className={`w-5 h-5 ${
                pathname === "/dashboard"
                  ? "text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            />
            <span className="text-sm font-semibold">Dashboard</span>
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-white/5 mx-2 mb-4" />

        {/* Navigation Groups */}
        <div className="space-y-1">
          {navGroups.map((group) => (
            <NavGroupComponent key={group.id} group={group} />
          ))}
        </div>

        {/* Superadmin Section */}
        {isSuperadmin && (
          <>
            <div className="h-px bg-amber-200 dark:bg-amber-500/20 mx-2 my-4" />
            <div className="mb-2">
              <p className="px-4 mb-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Superadmin
              </p>
              <NavGroupComponent group={superadminGroup} />
            </div>
          </>
        )}

        {/* Divider before bottom items */}
        <div className="h-px bg-slate-200 dark:bg-white/5 mx-2 my-4" />

        {/* Help & Logout */}
        <div className="space-y-1 pb-4">
          <Link
            href="/help"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
              min-h-[44px]
              ${
                isActive("/help")
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }
            `}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Help</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group min-h-[44px]"
          >
            <LogOut className="w-4 h-4 group-hover:text-red-600 dark:group-hover:text-red-400" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* User Profile Mini */}
      <div className="p-3 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${
              isSuperadmin
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            }`}
          >
            <span className="text-white font-bold text-sm">
              {user?.username?.substring(0, 2).toUpperCase() || "U"}
            </span>
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {user?.full_name || user?.username || "User"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isSuperadmin ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Superadmin
                </span>
              ) : (
                user?.email || ""
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-72
          transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Spacer for main content (desktop only) */}
      <div className="hidden lg:block w-72 shrink-0" />
    </>
  );
}
