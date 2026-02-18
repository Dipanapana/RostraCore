"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { reportsApi } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Download,
  Building2,
  Users,
  AlertTriangle,
  Loader2,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfitabilityData {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  profit_margin: number;
}

interface SitePerformance {
  site_id: number;
  site_name: string;
  client_name: string;
  shifts_count: number;
  hours_worked: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface RevenueVsCost {
  group: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface OutstandingInvoice {
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
  status: string;
}

interface EmployeePayroll {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  net_pay: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#a855f7", "#14b8a6",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatCurrencyFull(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDefaultPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : trend === "down" ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : null}
          <span
            className={`text-xs font-medium ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-slate-400"
            }`}
          >
            {trend === "up"
              ? "Positive"
              : trend === "down"
              ? "Negative"
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Recharts tooltip
// ---------------------------------------------------------------------------

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
        {label}
      </p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { showToast } = useToast();
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);

  // Period filter
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end);

  // Data
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(
    null
  );
  const [sitePerformance, setSitePerformance] = useState<SitePerformance[]>([]);
  const [revenueVsCost, setRevenueVsCost] = useState<RevenueVsCost[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<
    OutstandingInvoice[]
  >([]);
  const [employeePayroll, setEmployeePayroll] = useState<EmployeePayroll[]>([]);

  // Loading
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  const loadReports = useCallback(async () => {
    setLoading(true);
    const params = { period_start: periodStart, period_end: periodEnd };

    try {
      const [profitRes, siteRes, revRes, invoiceRes, payrollRes] =
        await Promise.allSettled([
          reportsApi.profitability(params),
          reportsApi.sitePerformance(params),
          reportsApi.revenueVsCost({ ...params, group_by: "client" }),
          reportsApi.outstandingInvoices(),
          reportsApi.employeePayroll(params),
        ]);

      if (profitRes.status === "fulfilled")
        setProfitability(profitRes.value.data);
      if (siteRes.status === "fulfilled")
        setSitePerformance(siteRes.value.data?.sites || siteRes.value.data || []);
      if (revRes.status === "fulfilled")
        setRevenueVsCost(revRes.value.data?.data || revRes.value.data || []);
      if (invoiceRes.status === "fulfilled")
        setOutstandingInvoices(
          invoiceRes.value.data?.invoices || invoiceRes.value.data || []
        );
      if (payrollRes.status === "fulfilled")
        setEmployeePayroll(
          payrollRes.value.data?.employees || payrollRes.value.data || []
        );
    } catch {
      showToast("Failed to load some reports", "error");
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd, showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ---------------------------------------------------------------------------
  // PDF download handlers
  // ---------------------------------------------------------------------------

  const handleDownloadPdf = async (
    type: string,
    fetchFn: () => Promise<any>,
    filename: string
  ) => {
    setDownloading(type);
    try {
      const res = await fetchFn();
      downloadBlob(new Blob([res.data], { type: "application/pdf" }), filename);
      showToast(`${filename} downloaded`, "success");
    } catch {
      showToast("Failed to download report", "error");
    } finally {
      setDownloading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Chart data
  // ---------------------------------------------------------------------------

  const siteChartData = sitePerformance.slice(0, 10).map((s) => ({
    name: s.site_name.length > 18 ? s.site_name.slice(0, 18) + "..." : s.site_name,
    Revenue: s.revenue,
    Cost: s.cost,
    Profit: s.profit,
  }));

  const revenuePieData = revenueVsCost.slice(0, 8).map((r) => ({
    name: r.group,
    value: r.revenue,
  }));

  const topEmployees = [...employeePayroll]
    .sort((a, b) => b.total_hours - a.total_hours)
    .slice(0, 10)
    .map((e) => ({
      name:
        e.employee_name.length > 15
          ? e.employee_name.split(" ")[0]
          : e.employee_name,
      Hours: e.total_hours,
      "Gross Pay": e.gross_pay,
    }));

  // Outstanding invoices summary
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.total_amount,
    0
  );
  const overdueCount = outstandingInvoices.filter(
    (inv) => inv.days_overdue > 0
  ).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Financial performance, site analytics, and workforce insights
            </p>
          </div>

          {/* Period filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Loading reports...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Revenue"
                value={formatCurrency(profitability?.total_revenue ?? 0)}
                icon={DollarSign}
                color="bg-green-500"
                trend={
                  (profitability?.total_revenue ?? 0) > 0 ? "up" : "neutral"
                }
              />
              <KpiCard
                label="Total Costs"
                value={formatCurrency(profitability?.total_costs ?? 0)}
                icon={TrendingDown}
                color="bg-blue-500"
              />
              <KpiCard
                label="Gross Profit"
                value={formatCurrency(profitability?.gross_profit ?? 0)}
                icon={TrendingUp}
                color={
                  (profitability?.gross_profit ?? 0) >= 0
                    ? "bg-purple-500"
                    : "bg-red-500"
                }
                trend={
                  (profitability?.gross_profit ?? 0) >= 0 ? "up" : "down"
                }
              />
              <KpiCard
                label="Profit Margin"
                value={`${(profitability?.profit_margin ?? 0).toFixed(1)}%`}
                icon={BarChart3}
                color="bg-amber-500"
                trend={
                  (profitability?.profit_margin ?? 0) >= 20
                    ? "up"
                    : (profitability?.profit_margin ?? 0) >= 0
                    ? "neutral"
                    : "down"
                }
              />
            </div>

            {/* Charts row 1: Site Performance + Revenue by Client */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Site Performance Bar Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      Site Performance
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        "coverage",
                        () =>
                          reportsApi.coveragePdf({
                            period_start: periodStart,
                            period_end: periodEnd,
                          }),
                        `coverage-report-${periodStart}.pdf`
                      )
                    }
                    disabled={downloading === "coverage"}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    {downloading === "coverage" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {siteChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={siteChartData} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v)}
                        fontSize={11}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        fontSize={11}
                        stroke="#94a3b8"
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="Revenue"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="Cost"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
                    <Building2 className="w-8 h-8 mr-2 opacity-40" />
                    No site data for this period
                  </div>
                )}
              </div>

              {/* Revenue by Client Pie Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      Revenue by Client
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        "revenue",
                        () =>
                          reportsApi.revenuePdf({
                            period_start: periodStart,
                            period_end: periodEnd,
                          }),
                        `revenue-by-client-${periodStart}.pdf`
                      )
                    }
                    disabled={downloading === "revenue"}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    {downloading === "revenue" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {revenuePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenuePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {revenuePieData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrencyFull(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
                    <DollarSign className="w-8 h-8 mr-2 opacity-40" />
                    No revenue data for this period
                  </div>
                )}
              </div>
            </div>

            {/* Charts row 2: Employee Hours + Outstanding Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employee Hours Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      Top Employees by Hours
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        "payroll",
                        () =>
                          reportsApi.employeePayrollPdf({
                            period_start: periodStart,
                            period_end: periodEnd,
                          }),
                        `employee-payroll-${periodStart}.pdf`
                      )
                    }
                    disabled={downloading === "payroll"}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    {downloading === "payroll" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {topEmployees.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topEmployees}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        stroke="#94a3b8"
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="Hours"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
                    <Users className="w-8 h-8 mr-2 opacity-40" />
                    No employee data for this period
                  </div>
                )}
              </div>

              {/* Outstanding Invoices */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      Outstanding Invoices
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        "outstanding",
                        () => reportsApi.outstandingInvoicesPdf(),
                        `outstanding-invoices.pdf`
                      )
                    }
                    disabled={downloading === "outstanding"}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    {downloading === "outstanding" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(totalOutstanding)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Total Outstanding
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">
                      {overdueCount}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Overdue
                    </p>
                  </div>
                </div>

                {/* Invoice list */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {outstandingInvoices.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                      <FileText className="w-6 h-6 mr-2 opacity-40" />
                      No outstanding invoices
                    </div>
                  ) : (
                    outstandingInvoices.slice(0, 8).map((inv) => (
                      <div
                        key={inv.invoice_id}
                        className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {inv.invoice_number}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {inv.client_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrencyFull(inv.total_amount)}
                          </p>
                          {inv.days_overdue > 0 && (
                            <p className="text-xs text-red-500 font-medium">
                              {inv.days_overdue}d overdue
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Profit & Loss download */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    Downloadable Reports
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Professional PDF reports for management review and SARS
                    compliance
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {[
                  {
                    key: "profitability",
                    title: "Profit & Loss Statement",
                    desc: "Revenue, costs, and profit margins",
                    fn: () =>
                      reportsApi.profitabilityPdf({
                        period_start: periodStart,
                        period_end: periodEnd,
                      }),
                    file: `profit-loss-${periodStart}.pdf`,
                    color: "bg-green-500",
                  },
                  {
                    key: "revenue",
                    title: "Revenue by Client",
                    desc: "Revenue distribution across clients",
                    fn: () =>
                      reportsApi.revenuePdf({
                        period_start: periodStart,
                        period_end: periodEnd,
                      }),
                    file: `revenue-by-client-${periodStart}.pdf`,
                    color: "bg-purple-500",
                  },
                  {
                    key: "coverage",
                    title: "Coverage Analysis",
                    desc: "Shift fill rates and coverage metrics",
                    fn: () =>
                      reportsApi.coveragePdf({
                        period_start: periodStart,
                        period_end: periodEnd,
                      }),
                    file: `coverage-${periodStart}.pdf`,
                    color: "bg-blue-500",
                  },
                  {
                    key: "outstanding",
                    title: "Outstanding Invoices",
                    desc: "Unpaid and overdue invoice summary",
                    fn: () => reportsApi.outstandingInvoicesPdf(),
                    file: `outstanding-invoices.pdf`,
                    color: "bg-amber-500",
                  },
                  {
                    key: "payroll",
                    title: "Employee Payroll Summary",
                    desc: "Hours, pay breakdown, and costs",
                    fn: () =>
                      reportsApi.employeePayrollPdf({
                        period_start: periodStart,
                        period_end: periodEnd,
                      }),
                    file: `employee-payroll-${periodStart}.pdf`,
                    color: "bg-indigo-500",
                  },
                ].map((report) => (
                  <button
                    key={report.key}
                    onClick={() =>
                      handleDownloadPdf(report.key, report.fn, report.file)
                    }
                    disabled={downloading === report.key}
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${report.color}`}
                    >
                      {downloading === report.key ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <FileText className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {report.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {report.desc}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
