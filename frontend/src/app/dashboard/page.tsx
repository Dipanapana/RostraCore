"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Users, Calendar, MapPin, AlertTriangle } from "lucide-react";
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
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-900 text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time insights and analytics for GuardianOS
            </p>
          </div>
          <Link
            href="/roster"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Generate Roster
          </Link>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Employees"
            value={metrics?.employees.total || 0}
            subtitle={`${metrics?.employees.active || 0} Active`}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Total Shifts"
            value={metrics?.shifts.total || 0}
            subtitle={`${metrics?.shifts.fill_rate || 0}% Fill Rate`}
            icon={Calendar}
            color="green"
            progress={metrics?.shifts.fill_rate || 0}
          />
          <StatCard
            title="Active Sites"
            value={metrics?.sites.total || 0}
            subtitle="Client Locations"
            icon={MapPin}
            color="purple"
          />
          <StatCard
            title="Cert Warnings"
            value={metrics?.certifications.expiring_soon || 0}
            subtitle="Expiring Soon"
            icon={AlertTriangle}
            color="orange"
          />
        </div>

        {/* Weekly Summary */}
        {weeklySummary && (
          <Card title="This Week Summary" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Shifts This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {weeklySummary.shifts.total}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {weeklySummary.shifts.assigned} Assigned
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  R{weeklySummary.costs.total.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  R{weeklySummary.costs.avg_per_shift.toFixed(2)} / shift
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {weeklySummary.hours.total.toFixed(1)}h
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  {weeklySummary.hours.avg_per_employee.toFixed(1)}h / employee
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Employees Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {weeklySummary.employees_utilized}
                </p>
                <p className="text-sm text-pink-600 mt-1">Active this week</p>
              </div>
            </div>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expiring Certifications */}
          <Card title="Expiring Certifications">
            {expiringCerts.length === 0 ? (
              <p className="text-gray-500">No certifications expiring soon.</p>
            ) : (
              <div className="space-y-3">
                {expiringCerts.slice(0, 5).map((cert) => (
                  <div
                    key={cert.cert_id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">
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
                    <p className="text-sm text-gray-600">{cert.cert_type}</p>
                    <p className="text-sm text-gray-500">
                      Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Project Analysis - Cost Trends */}
          <Card title="Project Analysis">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costTrends}>
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
                <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`R${Number(value).toLocaleString()}`, "Cost"]}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Project List & Team Collaboration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shifts List */}
          <Card title="Shifts">
            {upcomingShifts.length === 0 ? (
              <p className="text-gray-500">No upcoming shifts scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift) => (
                  <div
                    key={shift.shift_id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">
                        {shift.site_name}
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {shift.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(shift.start_time).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {shift.employee_name} • {shift.required_skill || "Any"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
