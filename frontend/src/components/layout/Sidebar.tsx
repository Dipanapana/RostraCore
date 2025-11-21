"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  DollarSign,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

const menuItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Briefcase },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Sites", href: "/sites", icon: MapPin },
  { name: "Shifts", href: "/shifts", icon: Calendar },
  { name: "Roster", href: "/roster", icon: ClipboardList },
  { name: "Certifications", href: "/certifications", icon: Award },
  { name: "Availability", href: "/availability", icon: Clock },
  { name: "Payroll", href: "/payroll", icon: DollarSign },
];

const generalItems: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
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
          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
          ${active
            ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }
        `}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-100" />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full">
          <Icon
            className={`w-5 h-5 transition-colors ${active ? "text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`}
          />
          <span className="text-sm font-medium">{item.name}</span>
          {item.badge && (
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/20">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5">
      {/* Logo */}
      <div className="px-6 py-8">
        <Link href="/dashboard" className="block">
          <Image
            src="/rostracore-logo.svg"
            alt="RostraCore"
            width={180}
            height={50}
            className="w-40 h-auto drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        {/* MENU Section */}
        <div>
          <p className="px-4 mb-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Main Menu
          </p>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </div>
        </div>

        {/* GENERAL Section */}
        <div>
          <p className="px-4 mb-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            System
          </p>
          <div className="space-y-1">
            {generalItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
            >
              <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* User Profile Mini */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">AD</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Admin User</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">admin@guardianos.co.za</p>
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
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

      {/* Spacer for main content */}
      <div className="hidden lg:block w-72 shrink-0" />
    </>
  );
}
