"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  ClipboardList,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Award,
  Clock,
  BarChart3,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/employees",
    icon: Users,
  },
  {
    name: "Sites",
    href: "/sites",
    icon: MapPin,
  },
  {
    name: "Shifts",
    href: "/shifts",
    icon: Calendar,
  },
  {
    name: "Roster",
    href: "/roster",
    icon: ClipboardList,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: Clock,
  },
  {
    name: "Certifications",
    href: "/certifications",
    icon: Award,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    children: [
      { name: "Analytics", href: "/reports/analytics", icon: BarChart3 },
      { name: "Payroll", href: "/payroll", icon: DollarSign },
    ],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const Icon = item.icon;

    return (
      <div>
        <Link
          href={item.href}
          className={`
            flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group
            ${depth > 0 ? "ml-4 text-sm" : ""}
            ${
              active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }
          `}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpanded(item.name);
            }
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <Icon
              className={`w-5 h-5 flex-shrink-0 ${
                active ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"
              }`}
            />
            {!collapsed && <span className="truncate">{item.name}</span>}
          </div>
          {!collapsed && (
            <>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isExpanded ? "transform rotate-180" : ""
                  }`}
                />
              )}
            </>
          )}
        </Link>

        {/* Submenu */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => (
              <NavLink key={child.name} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">GuardianOS</h1>
                <p className="text-xs text-gray-500">Security Management</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink key={item.name} item={item} />
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">AD</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@guardianos.co.za</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <SidebarContent />

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block absolute -right-3 top-20 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          <ChevronDown
            className={`w-4 h-4 text-gray-600 transition-transform ${
              collapsed ? "rotate-90" : "-rotate-90"
            }`}
          />
        </button>
      </aside>

      {/* Spacer for main content */}
      <div className={`${collapsed ? "lg:w-20" : "lg:w-64"} transition-all duration-300`} />
    </>
  );
}
