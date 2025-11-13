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
  Award,
  Clock,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Download,
  Smartphone,
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

      {/* Mobile App Card */}
      <div className="p-4">
        <div className="bg-gray-900 rounded-2xl p-6 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl" />

          <div className="relative z-10">
            <Smartphone className="w-8 h-8 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Download our</h3>
            <h3 className="text-white font-semibold mb-3">Mobile App</h3>
            <p className="text-gray-400 text-xs mb-4">Get it on your mobile</p>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
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
