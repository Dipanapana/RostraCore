"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[DASHBOARD] useEffect triggered");
    let mounted = true;

    const fetchData = async () => {
      console.log("[DASHBOARD] fetchData starting, mounted:", mounted);
      if (!mounted) return;

      setLoading(true);
      console.log("[DASHBOARD] Loading state set to true");

      try {
        console.log("[DASHBOARD] Starting API calls...");
        // Add timeout to prevent hanging
        const timeout = (ms: number) => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), ms)
        );

        const fetchWithTimeout = (url: string) => {
          console.log("[DASHBOARD] Fetching:", url);
          return Promise.race([
            axios.get(url, { timeout: 10000 }),
            timeout(10000)
          ]);
        };

        console.log("[DASHBOARD] Making parallel API calls...");
        const [metricsRes, shiftsRes, certsRes, trendsRes, weeklyRes] =
          await Promise.all([
            fetchWithTimeout(`${API_URL}/api/v1/dashboard/metrics`),
            fetchWithTimeout(`${API_URL}/api/v1/dashboard/upcoming-shifts?limit=5`),
            fetchWithTimeout(`${API_URL}/api/v1/dashboard/expiring-certifications?days_ahead=30`),
            fetchWithTimeout(`${API_URL}/api/v1/dashboard/cost-trends?days=14`),
            fetchWithTimeout(`${API_URL}/api/v1/dashboard/weekly-summary`),
          ]);

        console.log("[DASHBOARD] All API calls completed");
        if (mounted) {
          console.log("[DASHBOARD] Setting state with fetched data");
          setMetrics((metricsRes as any).data);
          setUpcomingShifts((shiftsRes as any).data);
          setExpiringCerts((certsRes as any).data);
          setCostTrends((trendsRes as any).data.trend || []);
          setWeeklySummary((weeklyRes as any).data);
        }
      } catch (error) {
        console.error("[DASHBOARD] Error fetching dashboard data:", error);
        if (mounted) {
          console.log("[DASHBOARD] Setting empty data on error");
          // Set empty data on error to allow page to render
          setMetrics(null);
          setUpcomingShifts([]);
          setExpiringCerts([]);
          setCostTrends([]);
          setWeeklySummary(null);
        }
      } finally {
        if (mounted) {
          console.log("[DASHBOARD] Setting loading to false");
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      console.log("[DASHBOARD] Cleanup - unmounting");
      mounted = false;
    };
  }, []);

  const fetchDashboardData = async () => {
    // Keep this function for potential refresh button
    setLoading(true);
    try {
      const [metricsRes, shiftsRes, certsRes, trendsRes, weeklyRes] =
        await Promise.all([
          axios.get(`${API_URL}/api/v1/dashboard/metrics`, { timeout: 10000 }),
          axios.get(`${API_URL}/api/v1/dashboard/upcoming-shifts?limit=5`, { timeout: 10000 }),
          axios.get(
            `${API_URL}/api/v1/dashboard/expiring-certifications?days_ahead=30`,
            { timeout: 10000 }
          ),
          axios.get(`${API_URL}/api/v1/dashboard/cost-trends?days=14`, { timeout: 10000 }),
          axios.get(`${API_URL}/api/v1/dashboard/weekly-summary`, { timeout: 10000 }),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              📊 Dashboard
            </h1>
            <p className="text-gray-300">
              Real-time insights and analytics for GuardianOS
            </p>
          </div>
          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Employees Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Employees</p>
                <p className="text-4xl font-bold text-white mt-2">
                  {metrics?.employees.total || 0}
                </p>
                <p className="text-green-400 text-sm mt-2">
                  {metrics?.employees.active || 0} Active
                </p>
              </div>
              <div className="text-5xl">👥</div>
            </div>
          </div>

          {/* Shifts Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Shifts</p>
                <p className="text-4xl font-bold text-white mt-2">
                  {metrics?.shifts.total || 0}
                </p>
                <p className="text-blue-400 text-sm mt-2">
                  {metrics?.shifts.fill_rate || 0}% Fill Rate
                </p>
              </div>
              <div className="text-5xl">📅</div>
            </div>
          </div>

          {/* Sites Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Active Sites</p>
                <p className="text-4xl font-bold text-white mt-2">
                  {metrics?.sites.total || 0}
                </p>
                <p className="text-purple-400 text-sm mt-2">Client Locations</p>
              </div>
              <div className="text-5xl">📍</div>
            </div>
          </div>

          {/* Certifications Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Cert Warnings</p>
                <p className="text-4xl font-bold text-white mt-2">
                  {metrics?.certifications.expiring_soon || 0}
                </p>
                <p className="text-yellow-400 text-sm mt-2">Expiring Soon</p>
              </div>
              <div className="text-5xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        {weeklySummary && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              📆 This Week Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-gray-300 text-sm">Shifts This Week</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {weeklySummary.shifts.total}
                </p>
                <p className="text-green-400 text-sm mt-1">
                  {weeklySummary.shifts.assigned} Assigned
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Cost</p>
                <p className="text-3xl font-bold text-white mt-1">
                  R{weeklySummary.costs.total.toLocaleString()}
                </p>
                <p className="text-blue-400 text-sm mt-1">
                  R{weeklySummary.costs.avg_per_shift.toFixed(2)} / shift
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Hours</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {weeklySummary.hours.total.toFixed(1)}h
                </p>
                <p className="text-purple-400 text-sm mt-1">
                  {weeklySummary.hours.avg_per_employee.toFixed(1)}h / employee
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Employees Used</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {weeklySummary.employees_utilized}
                </p>
                <p className="text-pink-400 text-sm mt-1">Active this week</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Cost Trends Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              💰 Cost Trends (Last 14 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis
                  dataKey="date"
                  stroke="#fff"
                  tick={{ fill: "#fff" }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis stroke="#fff" tick={{ fill: "#fff" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Daily Cost (R)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Shift Status Pie Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              📊 Shift Status Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
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
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Shifts */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              ⏰ Upcoming Shifts
            </h2>
            {upcomingShifts.length === 0 ? (
              <p className="text-gray-400">No upcoming shifts scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => (
                  <div
                    key={shift.shift_id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-white">
                        {shift.site_name}
                      </div>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        {shift.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      {new Date(shift.start_time).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      {shift.employee_name} • {shift.required_skill || "Any"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Certifications */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              ⚠️ Expiring Certifications
            </h2>
            {expiringCerts.length === 0 ? (
              <p className="text-gray-400">No certifications expiring soon.</p>
            ) : (
              <div className="space-y-3">
                {expiringCerts.slice(0, 5).map((cert) => (
                  <div
                    key={cert.cert_id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-white">
                        {cert.employee_name}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          cert.days_until_expiry <= 7
                            ? "bg-red-500/20 text-red-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {cert.days_until_expiry} days
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{cert.cert_type}</p>
                    <p className="text-sm text-gray-400">
                      Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            href="/clients"
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Clients
          </Link>
          <Link
            href="/employees"
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Employees
          </Link>
          <Link
            href="/sites"
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Sites
          </Link>
          <Link
            href="/shifts"
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Shifts
          </Link>
          <Link
            href="/certifications"
            className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Certifications
          </Link>
          <Link
            href="/roster"
            className="bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-lg text-center transition"
          >
            Generate Roster
          </Link>
          <Link
            href="/payroll"
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Payroll
          </Link>
          <Link
            href="/attendance"
            className="bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-lg text-center transition"
          >
            Track Attendance
          </Link>
          <Link
            href="/expenses"
            className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-lg text-center transition"
          >
            Manage Expenses
          </Link>
          <Link
            href="/admin/leave-approvals"
            className="bg-rose-600 hover:bg-rose-700 text-white p-4 rounded-lg text-center transition"
          >
            Leave Approvals
          </Link>
        </div>
      </div>
    </div>
  );
}
