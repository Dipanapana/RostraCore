"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Activity,
  TrendingUp,
  Calendar
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import UtilizationChart from "@/components/dashboard/UtilizationChart";
import ComplianceChart from "@/components/dashboard/ComplianceChart";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import UpcomingShiftsCard from "@/components/dashboard/UpcomingShiftsCard";
import AlertsCard from "@/components/dashboard/AlertsCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
interface DashboardMetrics {
  users: { total: number; active: number };
  employees: { total: number; active: number; inactive: number };
  shifts: {
    total: number;
    upcoming: number;
    assigned: number;
    unassigned: number;
    this_week: number;
    fill_rate: number;
  };
  sites: { total: number };
  certifications: { expiring_soon: number; expired: number };
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

interface CostTrend {
  date: string;
  cost: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived Metrics
  const [orsScore, setOrsScore] = useState(0);
  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [metricsRes, shiftsRes, trendsRes] = await Promise.all([
          api.get(`${API_URL}/api/v1/dashboard/metrics`),
          api.get(`${API_URL}/api/v1/dashboard/upcoming-shifts?limit=5`),
          api.get(`${API_URL}/api/v1/dashboard/cost-trends?days=7`),
        ]);

        const metricsData = metricsRes.data;
        setMetrics(metricsData);
        setUpcomingShifts(shiftsRes.data);
        setCostTrends(trendsRes.data.trend || []);

        // Calculate Operational Readiness Score (ORS)
        const fillRate = metricsData.shifts.fill_rate || 0;
        const activeGuardsPct = metricsData.employees.total > 0
          ? (metricsData.employees.active / metricsData.employees.total) * 100
          : 0;
        const compliancePct = 92;

        const score = Math.round((fillRate * 0.5) + (activeGuardsPct * 0.3) + (compliancePct * 0.2));
        setOrsScore(score);

        // Mock Utilization Data
        const mockUtilization = [
          { name: "06:00", deployed: 45, capacity: 60 },
          { name: "09:00", deployed: 52, capacity: 60 },
          { name: "12:00", deployed: 55, capacity: 60 },
          { name: "15:00", deployed: 50, capacity: 60 },
          { name: "18:00", deployed: 58, capacity: 60 },
          { name: "21:00", deployed: 48, capacity: 60 },
          { name: "00:00", deployed: 40, capacity: 60 },
        ];
        setUtilizationData(mockUtilization);

        // Mock Compliance Data
        setComplianceData([
          { name: "Compliant", value: 85, color: "#10b981" },
          { name: "Expiring", value: 10, color: "#f59e0b" },
          { name: "Expired", value: 5, color: "#ef4444" },
        ]);

        // Mock Activities
        const newActivities = [
          {
            id: "1",
            type: "success",
            message: "Shift roster generated successfully for Week 42",
            time: "2 mins ago"
          },
          {
            id: "2",
            type: "alert",
            message: `${metricsData.certifications.expiring_soon} certifications expiring soon`,
            time: "15 mins ago"
          },
          {
            id: "3",
            type: "info",
            message: "New site 'Headquarters' added to monitoring",
            time: "1 hour ago"
          },
          {
            id: "4",
            type: "warning",
            message: `${metricsData.shifts.unassigned} shifts currently unassigned`,
            time: "2 hours ago"
          }
        ];
        setActivities(newActivities);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-500 animate-pulse">Loading Command Center...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Operational overview and workforce analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-400">System Operational</span>
            </div>
            <Link
              href="/roster"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Generate Roster
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Operational Readiness"
            value={`${orsScore}%`}
            subtitle="Combined Efficiency Score"
            icon={ShieldCheck}
            color="blue"
            trend={{ value: 2.5, label: "vs last week", direction: "up" }}
            delay={0}
          />
          <MetricCard
            title="Total Workforce"
            value={metrics?.employees.total || 0}
            subtitle={`${metrics?.employees.active || 0} Active on Site`}
            icon={Users}
            color="purple"
            trend={{ value: 1.2, label: "new recruits", direction: "up" }}
            delay={100}
          />
          <MetricCard
            title="Shift Fill Rate"
            value={`${metrics?.shifts.fill_rate || 0}%`}
            subtitle={`${metrics?.shifts.unassigned || 0} Unassigned`}
            icon={Activity}
            color={metrics?.shifts.fill_rate && metrics.shifts.fill_rate > 90 ? "green" : "orange"}
            trend={{ value: 0.8, label: "efficiency", direction: "down" }}
            delay={200}
          />
          <MetricCard
            title="Projected Cost"
            value={`R${(costTrends[costTrends.length - 1]?.cost || 0).toLocaleString()}`}
            subtitle="Daily Run Rate"
            icon={TrendingUp}
            color="green"
            trend={{ value: 4.1, label: "under budget", direction: "up" }}
            delay={300}
          />
        </div>

        {/* Main Content Grid - Fixed Layout Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Utilization Chart (2/3 width) */}
          <div className="lg:col-span-2 animate-slide-up h-full" style={{ animationDelay: "400ms" }}>
            <UtilizationChart data={utilizationData} />
          </div>

          {/* Compliance & Activity (1/3 width) */}
          <div className="flex flex-col gap-6 h-full">
            <div className="flex-1 min-h-[250px] animate-slide-up" style={{ animationDelay: "500ms" }}>
              <ComplianceChart data={complianceData} score={92} />
            </div>
            <div className="flex-1 min-h-[250px] animate-slide-up" style={{ animationDelay: "600ms" }}>
              <LiveActivityFeed activities={activities} />
            </div>
          </div>
        </div>

        {/* Bottom Section: Upcoming Shifts & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingShiftsCard shifts={upcomingShifts} delay={700} />
          <AlertsCard metrics={metrics} delay={800} />
        </div>
      </div>
    </DashboardLayout>
  );
}
