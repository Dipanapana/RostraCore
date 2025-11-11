"use client";

/**
 * Mobile-First Dashboard Page
 *
 * Redesigned with mobile-first approach following MOBILE_FIRST_REDESIGN_STRATEGY
 *
 * Features:
 * - PullToRefresh for easy data refresh
 * - MobileBottomNav for thumb-zone navigation
 * - 48px minimum touch targets
 * - Skeleton screens for loading states
 * - Responsive charts (smaller height on mobile)
 * - 2-column grid for metrics on mobile
 * - Optimized quick actions (2 columns on mobile, 3 on tablet, 5 on desktop)
 */

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  PullToRefresh,
  MobileBottomNav,
  HomeIcon,
  CalendarIcon,
  MarketplaceIcon,
  ChartIcon,
  UserIcon,
} from "@/design-system/components";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardMetrics {
  employees: {
    total: number;
    active: number;
    inactive: number;
  };
  shifts: {
    total: number;
    upcoming: number;
    assigned: number;
    unassigned: number;
    this_week: number;
    fill_rate: number;
  };
  sites: {
    total: number;
  };
  certifications: {
    expiring_soon: number;
    expired: number;
  };
  availability: {
    total_records: number;
  };
}

interface UpcomingShift {
  shift_id: number;
  start_time: string;
  end_time: string;
  site_name: string;
  employee_name: string;
  status: string;
  required_skill: string;
}

interface ExpiringCert {
  cert_id: number;
  employee_name: string;
  cert_type: string;
  expiry_date: string;
  days_until_expiry: number;
}

interface CostTrend {
  date: string;
  cost: number;
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  shifts: {
    total: number;
    assigned: number;
    unassigned: number;
    fill_rate: number;
  };
  costs: {
    total: number;
    avg_per_shift: number;
  };
  hours: {
    total: number;
    avg_per_employee: number;
  };
  employees_utilized: number;
}

// Skeleton Screen Component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-8 bg-gray-300 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-300 rounded w-64 animate-pulse" />
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-300 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-300 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Weekly Summary Skeleton */}
        <div className="bg-white rounded-xl p-6 shadow mb-6 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-40 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 bg-gray-300 rounded w-24 mb-2" />
                <div className="h-6 bg-gray-300 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartHeight, setChartHeight] = useState(300);
  const [pieRadius, setPieRadius] = useState(100);

  // Responsive chart dimensions based on window width
  useEffect(() => {
    const updateChartDimensions = () => {
      const isMobile = window.innerWidth < 768;
      setChartHeight(isMobile ? 250 : 300);
      setPieRadius(isMobile ? 80 : 100);
    };

    // Set initial dimensions
    updateChartDimensions();

    // Add resize listener
    window.addEventListener('resize', updateChartDimensions);

    // Cleanup
    return () => window.removeEventListener('resize', updateChartDimensions);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, shiftsRes, certsRes, trendsRes, weeklyRes] =
        await Promise.all([
          axios.get(`${API_URL}/api/v1/dashboard/metrics`),
          axios.get(`${API_URL}/api/v1/dashboard/upcoming-shifts?limit=5`),
          axios.get(
            `${API_URL}/api/v1/dashboard/expiring-certifications?days_ahead=30`
          ),
          axios.get(`${API_URL}/api/v1/dashboard/cost-trends?days=14`),
          axios.get(`${API_URL}/api/v1/dashboard/weekly-summary`),
        ]);

      setMetrics(metricsRes.data);
      setUpcomingShifts(shiftsRes.data);
      setExpiringCerts(certsRes.data);
      setCostTrends(trendsRes.data.trend || []);
      setWeeklySummary(weeklyRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mobile Bottom Navigation Items
  const navItems = [
    {
      id: "dashboard",
      label: "Home",
      href: "/dashboard",
      icon: <HomeIcon className="w-full h-full" />,
    },
    {
      id: "roster",
      label: "Roster",
      href: "/roster",
      icon: <CalendarIcon className="w-full h-full" />,
      badge: metrics?.shifts.unassigned || 0,
    },
    {
      id: "marketplace",
      label: "Hire",
      href: "/marketplace",
      icon: <MarketplaceIcon className="w-full h-full" />,
    },
    {
      id: "reports",
      label: "Reports",
      href: "/dashboards",
      icon: <ChartIcon className="w-full h-full" />,
    },
    {
      id: "profile",
      label: "Profile",
      href: "/admin/profile",
      icon: <UserIcon className="w-full h-full" />,
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <>
      <PullToRefresh onRefresh={fetchDashboardData}>
        <div className="min-h-screen bg-gray-50 pb-24">
          {/* Mobile-optimized padding */}
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header - Mobile Optimized */}
              <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1">
                    📊 Dashboard
                  </h1>
                  <p className="text-sm md:text-base text-gray-600">
                    Real-time insights and analytics
                  </p>
                </div>
                {/* Hide "Back to Home" on mobile, show on desktop */}
                <Link
                  href="/"
                  className="hidden md:flex items-center justify-center h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  ← Back to Home
                </Link>
              </div>

              {/* Key Metrics Cards - Mobile: 2 cols, Desktop: 4 cols */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                {/* Employees Card */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Employees
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-1 md:mt-2">
                        {metrics?.employees.total || 0}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm mt-1 md:mt-2 font-medium">
                        {metrics?.employees.active || 0} Active
                      </p>
                    </div>
                    <div className="text-3xl md:text-5xl">👥</div>
                  </div>
                </div>

                {/* Shifts Card */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Shifts
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-1 md:mt-2">
                        {metrics?.shifts.total || 0}
                      </p>
                      <p className="text-blue-600 text-xs md:text-sm mt-1 md:mt-2 font-medium">
                        {metrics?.shifts.fill_rate || 0}% Fill Rate
                      </p>
                    </div>
                    <div className="text-3xl md:text-5xl">📅</div>
                  </div>
                </div>

                {/* Sites Card */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Sites
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-1 md:mt-2">
                        {metrics?.sites.total || 0}
                      </p>
                      <p className="text-purple-600 text-xs md:text-sm mt-1 md:mt-2 font-medium">
                        Locations
                      </p>
                    </div>
                    <div className="text-3xl md:text-5xl">📍</div>
                  </div>
                </div>

                {/* Certifications Card */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Warnings
                      </p>
                      <p className="text-2xl md:text-4xl font-bold text-gray-900 mt-1 md:mt-2">
                        {metrics?.certifications.expiring_soon || 0}
                      </p>
                      <p className="text-yellow-600 text-xs md:text-sm mt-1 md:mt-2 font-medium">
                        Expiring
                      </p>
                    </div>
                    <div className="text-3xl md:text-5xl">⚠️</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions - Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
              {/* 48px minimum touch target height */}
              {/* MOVED UP: Positioned right after metrics for better accessibility */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                <Link
                  href="/clients"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Clients
                </Link>
                <Link
                  href="/employees"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Employees
                </Link>
                <Link
                  href="/sites"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Sites
                </Link>
                <Link
                  href="/shifts"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Shifts
                </Link>
                <Link
                  href="/certifications"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Certifications
                </Link>
                <Link
                  href="/roster"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Roster
                </Link>
                <Link
                  href="/payroll"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Payroll
                </Link>
                <Link
                  href="/attendance"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Attendance
                </Link>
                <Link
                  href="/expenses"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Expenses
                </Link>
                <Link
                  href="/admin/leave-approvals"
                  className="flex items-center justify-center min-h-[48px] h-12 md:h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition font-medium text-sm md:text-base"
                >
                  Leave
                </Link>
              </div>

              {/* Weekly Summary */}
              {weeklySummary && (
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200 mb-6">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                    📆 This Week Summary
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div>
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Shifts This Week
                      </p>
                      <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1">
                        {weeklySummary.shifts.total}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm mt-1 font-medium">
                        {weeklySummary.shifts.assigned} Assigned
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Total Cost
                      </p>
                      <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1">
                        R{weeklySummary.costs.total.toLocaleString()}
                      </p>
                      <p className="text-blue-600 text-xs md:text-sm mt-1 font-medium">
                        R{weeklySummary.costs.avg_per_shift.toFixed(0)}/shift
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Total Hours
                      </p>
                      <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1">
                        {weeklySummary.hours.total.toFixed(0)}h
                      </p>
                      <p className="text-purple-600 text-xs md:text-sm mt-1 font-medium">
                        {weeklySummary.hours.avg_per_employee.toFixed(1)}h/emp
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs md:text-sm font-medium">
                        Employees
                      </p>
                      <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1">
                        {weeklySummary.employees_utilized}
                      </p>
                      <p className="text-pink-600 text-xs md:text-sm mt-1 font-medium">
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Row - Mobile: Stack, Desktop: Side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Cost Trends Chart - Mobile: 250px, Desktop: 300px */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                    💰 Cost Trends (14 Days)
                  </h2>
                  <ResponsiveContainer
                    width="100%"
                    height={chartHeight}
                  >
                    <LineChart data={costTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Daily Cost (R)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Shift Status Pie Chart */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                    📊 Shift Status
                  </h2>
                  <ResponsiveContainer
                    width="100%"
                    height={chartHeight}
                  >
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Assigned",
                            value: metrics?.shifts.assigned || 0,
                          },
                          {
                            name: "Unassigned",
                            value: metrics?.shifts.unassigned || 0,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={pieRadius}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1].map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tables Row - Mobile: Stack, Desktop: Side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Upcoming Shifts */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                    ⏰ Upcoming Shifts
                  </h2>
                  {upcomingShifts.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No upcoming shifts scheduled.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingShifts.map((shift) => (
                        <div
                          key={shift.shift_id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-gray-900 text-sm md:text-base">
                              {shift.site_name}
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {shift.status}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600">
                            {new Date(shift.start_time).toLocaleString()}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            {shift.employee_name} • {shift.required_skill || "Any"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expiring Certifications */}
                <div className="bg-white rounded-xl p-4 md:p-6 shadow border border-gray-200">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                    ⚠️ Expiring Certs
                  </h2>
                  {expiringCerts.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No certifications expiring soon.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {expiringCerts.slice(0, 5).map((cert) => (
                        <div
                          key={cert.cert_id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-gray-900 text-sm md:text-base">
                              {cert.employee_name}
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                cert.days_until_expiry <= 7
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {cert.days_until_expiry} days
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600">
                            {cert.cert_type}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav items={navItems} />
    </>
  );
}
