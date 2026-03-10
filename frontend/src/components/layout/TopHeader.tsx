"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Bell, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { notificationsApi } from "@/services/api";
import {
  getTypeIcon,
  getTypeColor,
  type NotificationItem,
} from "@/lib/notificationUtils";

// ---------------------------------------------------------------------------
// Breadcrumb route labels
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  // Main sections
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
  notifications: "Notifications",
  attendance: "Attendance",
  certifications: "Certifications",
  documents: "Documents",
  superadmin: "Platform",

  // Operations
  incidents: "Incidents",
  patrols: "Patrols",
  deployments: "Deployments",
  geofencing: "Geofencing",
  inspections: "Inspections",
  maintenance: "Maintenance",
  iod: "Injury on Duty",
  visitors: "Visitors",
  overtime: "Overtime",
  "daily-activity": "Daily Activity",
  "shift-handovers": "Shift Handovers",
  "occurrence-book": "Occurrence Book",
  "ops-summary": "Ops Summary",
  "emergency-contacts": "Emergency Contacts",
  "comm-log": "Comm Log",
  keys: "Key Management",

  // Compliance
  "cert-alerts": "Cert Alerts",
  "compliance-calendar": "Compliance Calendar",
  "contract-compliance": "Contract Compliance",
  "sla-compliance": "SLA Compliance",
  "contract-values": "Contract Values",

  // Business
  announcements: "Announcements",
  training: "Training",
  disciplinary: "Disciplinary",
  budgets: "Budgets",
  fleet: "Fleet",
  organizations: "Organizations",
  reports: "Reports",
  revenue: "Revenue",
  "client-reports": "Client Reports",
  "site-profitability": "Site Profitability",
  "workforce-forecast": "Workforce Forecast",

  // Sub-routes
  users: "Users",
  generate: "Generate",
  assignments: "Assignments",
  unfilled: "Unfilled Shifts",
  analytics: "Analytics",
  compliance: "Compliance",
  alerts: "Alerts",
  exceptions: "Exceptions",
  forecast: "Forecast",
  swaps: "Swaps",
  coverage: "Coverage",
  exports: "Exports",
  invoices: "Invoices",
  new: "New",
  heatmap: "Heatmap",
  map: "Map",
  costs: "Costs",
  risk: "Risk",
  renewals: "Renewals",
  satisfaction: "Satisfaction",
  performance: "Performance",
  restrictions: "Restrictions",
  turnover: "Turnover",
  grades: "Grades",
  "spare-pool": "Spare Pool",
  "hourly-rates": "Hourly Rates",
  "shift-patterns": "Shift Patterns",
  "company-profile": "Company Profile",
  "subscription-plans": "Subscription Plans",
  "skills-matrix": "Skills Matrix",
  "hr-analytics": "HR Analytics",
  "accept-invite": "Accept Invite",
  "change-password": "Change Password",
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
// Helpers
// ---------------------------------------------------------------------------

function fmtAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Dropdown notification row
// ---------------------------------------------------------------------------

function DropdownNotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: number) => void;
}) {
  const Icon = getTypeIcon(notification.notification_type);
  const colorClass = getTypeColor(notification.notification_type);

  return (
    <button
      onClick={() => !notification.is_read && onMarkRead(notification.notification_id)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
        notification.is_read ? "opacity-60" : ""
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${notification.is_read ? "text-gray-500" : "text-gray-900 font-medium"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-400 truncate">{notification.message}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fmtAgo(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TopHeader component
// ---------------------------------------------------------------------------

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<NotificationItem[]>([]);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getAll({ unread_only: true, limit: 1 });
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {
      // Non-fatal — badge degrades gracefully
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Reset badge when user visits the notifications page
  useEffect(() => {
    if (pathname === "/notifications") {
      setUnreadCount(0);
      setRecentItems([]); // Force re-fetch on next dropdown open
      setOpen(false);
    }
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openDropdown = useCallback(async () => {
    setOpen(true);
    setLoadingDropdown(true);
    try {
      const res = await notificationsApi.getAll({ limit: 5 });
      setRecentItems(res.data.notifications ?? []);
    } catch {
      /* silent */
    } finally {
      setLoadingDropdown(false);
    }
  }, []);

  const handleMarkRead = useCallback(
    async (id: number) => {
      // Optimistic update
      setRecentItems((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationsApi.markRead(id);
      } catch {
        fetchUnreadCount();
      }
    },
    [fetchUnreadCount]
  );

  const handleMarkAllRead = useCallback(async () => {
    setRecentItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  return (
    <header className="sticky top-0 z-20 px-4 sm:px-6 pt-4 pb-2">
      <div className="rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm backdrop-blur-xl bg-white/80">
        {/* Left: Back button + Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {breadcrumbs.length >= 1 && pathname !== "/dashboard" && (
            <button
              onClick={() => {
                if (breadcrumbs.length > 1) {
                  router.push(breadcrumbs[breadcrumbs.length - 2].href);
                } else {
                  router.push("/dashboard");
                }
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-1 flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {breadcrumbs.length === 0 ? (
            <span className="text-sm font-medium text-gray-700">
              Dashboard
            </span>
          ) : (
            breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors truncate"
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
          {/* Notification bell with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => (open ? setOpen(false) : openDropdown())}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {loadingDropdown ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-blue-600" />
                    </div>
                  ) : recentItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    recentItems.map((n) => (
                      <DropdownNotificationRow
                        key={n.notification_id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                      />
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View all notifications &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Date display */}
          <div className="hidden md:block text-right">
            <p className="text-xs font-medium text-gray-500">
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
