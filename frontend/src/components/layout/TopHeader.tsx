"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

// ---------------------------------------------------------------------------
// Breadcrumb route labels
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  employees: "People",
  clients: "Clients & Sites",
  sites: "Sites",
  roster: "Schedule",
  shifts: "Shifts",
  calendar: "Calendar",
  schedule: "Schedule",
  leave: "Time & Leave",
  availability: "Availability",
  payroll: "Payroll",
  billing: "Billing",
  assets: "Assets",
  settings: "Settings",
  users: "Users",
  certifications: "Certifications",
  documents: "Documents",
  superadmin: "Platform",
  generate: "Generate",
  assignments: "Assignments",
  unfilled: "Unfilled Shifts",
  "hourly-rates": "Hourly Rates",
  "shift-patterns": "Shift Patterns",
  "company-profile": "Company Profile",
  "subscription-plans": "Subscription Plans",
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  if (!pathname || pathname === "/") return [];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  segments.forEach((segment, index) => {
    // Skip numeric IDs (dynamic routes like /payroll/123)
    if (/^\d+$/.test(segment)) return;

    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

    crumbs.push({ label, href });
  });

  return crumbs;
}

// ---------------------------------------------------------------------------
// TopHeader component
// ---------------------------------------------------------------------------

export default function TopHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 px-4 sm:px-6 pt-4 pb-2">
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center justify-between shadow-sm backdrop-blur-xl bg-white/80 dark:bg-slate-900/50">
        {/* Left: Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {breadcrumbs.length === 0 ? (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Dashboard
            </span>
          ) : (
            breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })
          )}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <ThemeToggle />

          {/* Date display */}
          <div className="hidden md:block text-right">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
