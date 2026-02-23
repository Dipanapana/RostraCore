"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/config";
import { api, exportsApi } from "@/services/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import EmployeeCombobox from "@/components/ui/EmployeeCombobox";
import {
  FileSpreadsheet,
  FileText,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayrollRecord {
  payroll_id: number;
  employee_id: number;
  employee_name: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  overtime_hours: number;
  gross_pay: number;
  net_pay: number;
  status: string;
  // SA deduction fields
  paye?: number;
  uif_employee?: number;
  uif_employer?: number;
  sdl?: number;
  total_deductions?: number;
  cost_to_company?: number;
}

interface ComprehensivePayrollResponse {
  payroll_records: PayrollRecord[];
  summary: {
    total_gross: number;
    total_net: number;
    total_paye: number;
    total_uif_employee: number;
    total_uif_employer: number;
    total_sdl: number;
    total_cost_to_company: number;
    employee_count: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } for a given month. */
function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day of month
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

/** Format a Date-like month/year into "February 2026". */
function formatMonthLabel(year: number, month: number) {
  const d = new Date(year, month, 1);
  return d.toLocaleString("en-ZA", { month: "long", year: "numeric" });
}

// Status workflow constants
const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; next?: string; nextLabel?: string }
> = {
  draft: {
    color: "bg-gray-100 text-gray-800",

    label: "Draft",
    next: "reviewed",
    nextLabel: "Review",
  },
  reviewed: {
    color: "bg-amber-50 text-amber-700",

    label: "Reviewed",
    next: "approved",
    nextLabel: "Approve",
  },
  approved: {
    color: "bg-emerald-50 text-emerald-700",

    label: "Approved",
    next: "paid",
    nextLabel: "Mark as Paid",
  },
  paid: {
    color: "bg-blue-100 text-blue-800",

    label: "Paid",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status.toLowerCase()] ?? {
      color: "bg-gray-100 text-gray-800",
  
      label: status,
    }
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayrollPage() {
  const { token } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [generateAll, setGenerateAll] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] =
    useState<ComprehensivePayrollResponse["summary"] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showPayrollExportMenu, setShowPayrollExportMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // Month selector state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthMode, setMonthMode] = useState<"this" | "last" | "custom">("this");

  // Derive filter dates from selected month
  const { start: filterStartDate, end: filterEndDate } = useMemo(
    () => getMonthRange(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  // Filtered payrolls based on month selection
  const filteredPayrolls = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return payrolls;

    return payrolls.filter((payroll) => {
      const pStart = new Date(payroll.period_start);
      const pEnd = new Date(payroll.period_end);
      const fStart = new Date(filterStartDate);
      const fEnd = new Date(filterEndDate);
      return pStart <= fEnd && pEnd >= fStart;
    });
  }, [payrolls, filterStartDate, filterEndDate]);

  // Computed summary from visible records (always shown, regardless of generate)
  const computedSummary = useMemo(() => {
    if (filteredPayrolls.length === 0) return null;
    return {
      total_gross: filteredPayrolls.reduce((s, p) => s + p.gross_pay, 0),
      total_net: filteredPayrolls.reduce((s, p) => s + p.net_pay, 0),
      total_deductions: filteredPayrolls.reduce(
        (s, p) => s + (p.total_deductions ?? (p.paye ?? 0) + (p.uif_employee ?? 0)),
        0,
      ),
      employee_count: new Set(filteredPayrolls.map((p) => p.employee_id)).size,
    };
  }, [filteredPayrolls]);

  // -----------------------------------------------------------------------
  // Month navigation helpers
  // -----------------------------------------------------------------------

  const goToPreviousMonth = useCallback(() => {
    setMonthMode("custom");
    setSelectedMonth((prev) => {
      if (prev === 0) {
        setSelectedYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonthMode("custom");
    setSelectedMonth((prev) => {
      if (prev === 11) {
        setSelectedYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const selectThisMonth = useCallback(() => {
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth());
    setMonthMode("this");
  }, []);

  const selectLastMonth = useCallback(() => {
    const n = new Date();
    const lm = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    setSelectedYear(lm.getFullYear());
    setSelectedMonth(lm.getMonth());
    setMonthMode("last");
  }, []);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, [token]);

  const fetchPayrolls = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/payroll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPayrolls(data);
      } else {
        setError("Failed to fetch payroll records");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch payroll records");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (err: any) {
      console.error("Failed to fetch employees:", err);
    }
  };

  // -----------------------------------------------------------------------
  // Generate payroll
  // -----------------------------------------------------------------------

  const handleGeneratePayroll = async () => {
    if (!periodStart || !periodEnd) {
      setError("Please select a date range");
      return;
    }

    if (!generateAll && !selectedEmployee) {
      setError("Please select an employee or choose 'All Employees'");
      return;
    }

    try {
      const endpoint = generateAll
        ? `${getApiUrl()}/api/v1/payroll/generate-comprehensive`
        : `${getApiUrl()}/api/v1/payroll/generate`;

      const body = generateAll
        ? {
            period_start: periodStart,
            period_end: periodEnd,
            include_deductions: true,
          }
        : {
            employee_id: selectedEmployee,
            period_start: periodStart,
            period_end: periodEnd,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (generateAll && data.summary) {
          setPayrollSummary(data.summary);
        }
        setShowGenerateModal(false);
        setSelectedEmployee(null);
        setGenerateAll(false);
        setPeriodStart("");
        setPeriodEnd("");
        fetchPayrolls();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to generate payroll");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate payroll");
    }
  };

  // -----------------------------------------------------------------------
  // Status workflow
  // -----------------------------------------------------------------------

  const handleStatusChange = async (payrollId: number, newStatus: string) => {
    setUpdatingStatus(payrollId);
    try {
      await api.patch(`/api/v1/payroll/${payrollId}/status`, {
        status: newStatus,
      });
      // Update local state optimistically
      setPayrolls((prev) =>
        prev.map((p) =>
          p.payroll_id === payrollId ? { ...p, status: newStatus } : p,
        ),
      );
    } catch (err: any) {
      // If PATCH endpoint doesn't exist, fall back to PUT via raw fetch
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/payroll/${payrollId}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          },
        );
        if (response.ok) {
          setPayrolls((prev) =>
            prev.map((p) =>
              p.payroll_id === payrollId ? { ...p, status: newStatus } : p,
            ),
          );
        } else {
          setError("Failed to update payroll status");
        }
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || "Failed to update payroll status");
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  // -----------------------------------------------------------------------
  // Export handlers
  // -----------------------------------------------------------------------

  const handleExportExcel = async () => {
    if (!filterStartDate || !filterEndDate) {
      setError("Please select a month to export");
      return;
    }

    setExporting(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/generate-comprehensive/excel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            period_start: filterStartDate,
            period_end: filterEndDate,
          }),
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll_${filterStartDate}_to_${filterEndDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to export payroll");
      }
    } catch (err: any) {
      setError(err.message || "Failed to export payroll");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPayslipPDF = async (
    payrollId: number,
    employeeName: string,
  ) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/${payrollId}/payslip/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payslip_${employeeName.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        setError("Failed to download payslip PDF");
      }
    } catch (err: any) {
      setError(err.message || "Failed to download payslip");
    }
  };

  const handleBulkPayslipPDF = async () => {
    if (filteredPayrolls.length === 0) {
      setError("No payroll records to export");
      return;
    }

    setExporting(true);
    try {
      const payrollIds = filteredPayrolls.map((p) => p.payroll_id);
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/payslips/pdf/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ payroll_ids: payrollIds }),
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payslips_bulk_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        const data = await response.json();
        setError(data.detail || "Failed to generate bulk payslips");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate bulk payslips");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPayrollSystem = (format: 'sage300' | 'pastel' | 'vip') => {
    if (!filterStartDate || !filterEndDate) return;
    setShowPayrollExportMenu(false);
    const url = exportsApi.payrollCsv(filterStartDate, filterEndDate, format);
    const token = localStorage.getItem('access_token');
    // Trigger download via a temporary fetch (Bearer token required)
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `payroll_${format}_${filterStartDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(a.href);
        a.remove();
      })
      .catch(() => setError('Failed to export payroll CSV'));
  };

  const handleDeletePayroll = async (payrollId: number) => {
    if (!confirm("Are you sure you want to delete this payroll record?")) {
      return;
    }

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/${payrollId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        fetchPayrolls();
      } else {
        setError("Failed to delete payroll record");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete payroll record");
    }
  };

  // -----------------------------------------------------------------------
  // Pre-fill modal dates from selected month
  // -----------------------------------------------------------------------

  const openGenerateModal = useCallback(() => {
    setPeriodStart(filterStartDate);
    setPeriodEnd(filterEndDate);
    setShowGenerateModal(true);
  }, [filterStartDate, filterEndDate]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">
              Loading...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Payroll Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate and manage employee payroll records
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={exporting || filteredPayrolls.length === 0}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            {/* Payroll system export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPayrollExportMenu(v => !v)}
                disabled={filteredPayrolls.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export to Payroll System ▾
              </button>
              {showPayrollExportMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <p className="text-xs text-gray-500 px-3 pt-2 pb-1 font-medium uppercase tracking-wide">Select format</p>
                  {[
                    { key: 'sage300', label: 'Sage 300' },
                    { key: 'pastel', label: 'Pastel Evolution' },
                    { key: 'vip',    label: 'VIP Payroll' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleExportPayrollSystem(key as 'sage300' | 'pastel' | 'vip')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleBulkPayslipPDF}
              disabled={exporting || filteredPayrolls.length === 0}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              All Payslips PDF
            </button>
            <button
              onClick={openGenerateModal}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              + Generate Payroll
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
            >
              x
            </button>
          </div>
        )}

        {/* Month Quick-Selector Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Quick buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectThisMonth}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  monthMode === "this"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                This Month
              </button>
              <button
                onClick={selectLastMonth}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  monthMode === "last"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Last Month
              </button>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-gray-300 mx-1" />
            </div>

            {/* Month picker with arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg min-w-[180px] justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">
                  {formatMonthLabel(selectedYear, selectedMonth)}
                </span>
              </div>

              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Record count */}
            <div className="sm:ml-auto text-sm text-gray-500">
              Showing {filteredPayrolls.length} of {payrolls.length} records
            </div>
          </div>
        </div>

        {/* Summary Dashboard Cards */}
        {computedSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Gross Pay */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gross Pay
                  </p>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    R {computedSummary.total_gross.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>

            {/* Total Net Pay */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Net Pay
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-600">
                    R {computedSummary.total_net.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Total Deductions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Deductions
                  </p>
                  <p className="mt-1 text-xl font-bold text-red-600">
                    R {computedSummary.total_deductions.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>

            {/* Employee Count */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Count
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-700">
                    {computedSummary.employee_count}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive summary from generate (SA deductions breakdown) */}
        {payrollSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Employees</p>
              <p className="text-xl font-bold text-gray-900">
                {payrollSummary.employee_count ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Gross</p>
              <p className="text-xl font-bold text-gray-900">
                R {(payrollSummary.total_gross ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">PAYE</p>
              <p className="text-xl font-bold text-red-600">
                R {(payrollSummary.total_paye ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">UIF (Employee)</p>
              <p className="text-xl font-bold text-red-600">
                R {(payrollSummary.total_uif_employee ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">UIF (Employer)</p>
              <p className="text-xl font-bold text-orange-600">
                R {(payrollSummary.total_uif_employer ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">SDL</p>
              <p className="text-xl font-bold text-orange-600">
                R {(payrollSummary.total_sdl ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Net</p>
              <p className="text-xl font-bold text-green-600">
                R {(payrollSummary.total_net ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Payroll Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Pay
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PAYE
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UIF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Pay
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {payrolls.length === 0
                        ? 'No payroll records found. Click "Generate Payroll" to create one.'
                        : "No payroll records match the selected month."}
                    </td>
                  </tr>
                ) : (
                  filteredPayrolls.map((payroll) => {
                    const cfg = getStatusConfig(payroll.status);
                    return (
                      <tr
                        key={payroll.payroll_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payroll.employee_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {payroll.employee_id}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(payroll.period_start).toLocaleDateString()} -
                          </div>
                          <div className="text-sm text-gray-900">
                            {new Date(payroll.period_end).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payroll.total_hours.toFixed(1)}h
                          </div>
                          <div className="text-xs text-gray-500">
                            OT: {payroll.overtime_hours.toFixed(1)}h
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          R {payroll.gross_pay.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                          R {(payroll.paye || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                          R {(payroll.uif_employee || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                          R {payroll.net_pay.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${cfg.color}`}
                            >
                              {cfg.label}
                            </span>
                            {cfg.next && (
                              <button
                                onClick={() =>
                                  handleStatusChange(
                                    payroll.payroll_id,
                                    cfg.next!,
                                  )
                                }
                                disabled={updatingStatus === payroll.payroll_id}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                                  cfg.next === "reviewed"
                                    ? "bg-amber-50 text-amber-700 hover:bg-yellow-200"
                                    : cfg.next === "approved"
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                              >
                                {updatingStatus === payroll.payroll_id
                                  ? "..."
                                  : cfg.nextLabel}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() =>
                              handleDownloadPayslipPDF(
                                payroll.payroll_id,
                                payroll.employee_name,
                              )
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Download Payslip PDF"
                          >
                            <FileText className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                `/payroll/${payroll.payroll_id}`,
                                "_blank",
                              )
                            }
                            className="text-blue-600 hover:text-purple-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePayroll(payroll.payroll_id)
                            }
                            className="text-gray-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Generate Payroll
            </h2>

            <div className="space-y-4">
              {/* All Employees Toggle */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateAll}
                    onChange={(e) => {
                      setGenerateAll(e.target.checked);
                      if (e.target.checked) setSelectedEmployee(null);
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      Generate for All Employees
                    </span>
                  </span>
                </label>
                <p className="mt-2 ml-8 text-xs text-gray-600">
                  Calculate SA deductions (PAYE, UIF, SDL) for all active
                  employees
                </p>
              </div>

              {/* Single Employee Selection with EmployeeCombobox */}
              {!generateAll && (
                <EmployeeCombobox
                  value={selectedEmployee}
                  onChange={(id) => setSelectedEmployee(id)}
                  employees={employees}
                  label="Select Employee"
                  placeholder="Search employees..."
                  required
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* SA Deductions Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">
                  SA Statutory Deductions Applied:
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>PAYE - Tax based on annual income brackets</li>
                  <li>UIF - 1% employee + 1% employer (max R177.12 each)</li>
                  <li>SDL - 1% employer contribution</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedEmployee(null);
                  setGenerateAll(false);
                  setPeriodStart("");
                  setPeriodEnd("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
              >
                {generateAll ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                Generate {generateAll ? "All" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
