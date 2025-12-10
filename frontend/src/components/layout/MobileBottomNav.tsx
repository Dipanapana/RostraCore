"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  MoreHorizontal,
  Calendar,
  ClipboardList,
  CalendarDays,
  Award,
  ShieldAlert,
  X,
} from "lucide-react";

interface QuickNavItem {
  name: string;
  href: string;
  icon: any;
}

interface BottomNavItem {
  name: string;
  href?: string;
  icon: any;
  action?: "submenu";
  submenu?: QuickNavItem[];
}

const bottomNavItems: BottomNavItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Schedule",
    icon: CalendarClock,
    action: "submenu",
    submenu: [
      { name: "Shifts", href: "/shifts", icon: Calendar },
      { name: "Roster", href: "/roster", icon: ClipboardList },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    name: "Staff",
    icon: Users,
    action: "submenu",
    submenu: [
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Data Quality", href: "/employees/dashboard", icon: ShieldAlert },
      { name: "Certifications", href: "/certifications", icon: Award },
    ],
  },
  {
    name: "More",
    icon: MoreHorizontal,
    action: "submenu",
  },
];

interface MobileBottomNavProps {
  onOpenFullMenu?: () => void;
}

export default function MobileBottomNav({ onOpenFullMenu }: MobileBottomNavProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const pathname = usePathname();

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const isGroupActive = (item: BottomNavItem) => {
    if (item.href) return isActive(item.href);
    if (item.submenu) {
      return item.submenu.some((sub) => isActive(sub.href));
    }
    return false;
  };

  const handleItemClick = (item: BottomNavItem) => {
    if (item.name === "More" && onOpenFullMenu) {
      onOpenFullMenu();
      setActiveSubmenu(null);
      return;
    }

    if (item.action === "submenu") {
      setActiveSubmenu(activeSubmenu === item.name ? null : item.name);
    } else {
      setActiveSubmenu(null);
    }
  };

  const handleSubmenuClick = () => {
    setActiveSubmenu(null);
  };

  return (
    <>
      {/* Submenu Overlay */}
      {activeSubmenu && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setActiveSubmenu(null)}
        />
      )}

      {/* Submenu Popup */}
      {activeSubmenu && activeSubmenu !== "More" && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Submenu Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {activeSubmenu}
              </span>
              <button
                onClick={() => setActiveSubmenu(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submenu Items */}
            <div className="p-2">
              {bottomNavItems
                .find((item) => item.name === activeSubmenu)
                ?.submenu?.map((subItem) => {
                  const Icon = subItem.icon;
                  const active = isActive(subItem.href);

                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={handleSubmenuClick}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                        ${
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                      <span className="text-sm font-medium">{subItem.name}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Safe area background */}
        <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const active = isGroupActive(item);
              const isSubmenuOpen = activeSubmenu === item.name;

              if (item.href && !item.action) {
                // Direct link item
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setActiveSubmenu(null)}
                    className={`
                      flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]
                      ${
                        active
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-500 dark:text-slate-400"
                      }
                    `}
                  >
                    <div
                      className={`
                        p-2 rounded-xl transition-all
                        ${active ? "bg-blue-100 dark:bg-blue-500/20" : ""}
                      `}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </Link>
                );
              }

              // Submenu trigger item
              return (
                <button
                  key={item.name}
                  onClick={() => handleItemClick(item)}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]
                    ${
                      active || isSubmenuOpen
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  `}
                >
                  <div
                    className={`
                      p-2 rounded-xl transition-all
                      ${active || isSubmenuOpen ? "bg-blue-100 dark:bg-blue-500/20" : ""}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
