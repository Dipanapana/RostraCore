"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  ClipboardList,
  Award,
  Clock,
  BarChart3,
  DollarSign,
  Receipt,
  FileCheck,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const menuItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Briefcase,
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
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Payroll",
    href: "/payroll",
    icon: DollarSign,
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
  },
  {
    name: "Leave Approval",
    href: "/admin/leave-approvals",
    icon: FileCheck,
  },
];

const generalItems: NavItem[] = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    name: "Help",
    href: "/help",
    icon: HelpCircle,
  },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all group
          ${
            active
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }
        `}
      >
        <Icon
          className={`w-5 h-5 ${
            active ? "text-white" : "text-gray-500 group-hover:text-gray-700"
          }`}
        />
        <span className="text-sm font-medium">{item.name}</span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-gray-900 text-white rounded">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <span className="text-xl font-bold text-gray-900">GuardianOS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {/* MENU Section */}
        <div>
          <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            MENU
          </p>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </div>
        </div>

        {/* GENERAL Section */}
        <div>
          <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            GENERAL
          </p>
          <div className="space-y-1">
            {generalItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all group"
            >
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>
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
          fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Spacer for main content */}
      <div className="lg:w-64" />
    </>
  );
}
