"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/config";
import Link from "next/link";
import { FileSpreadsheet, FileText, Download, Users, User } from "lucide-react";

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
  const [payrollSummary, setPayrollSummary] = useState<ComprehensivePayrollResponse["summary"] | null>(null);
  const [exporting, setExporting] = useState(false);

  // Date range filter state
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filteredPayrolls, setFilteredPayrolls] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, [token]);

  // Apply date range filter whenever payrolls or filter dates change
  useEffect(() => {
    if (!filterStartDate && !filterEndDate) {
      setFilteredPayrolls(payrolls);
      return;
    }

    const filtered = payrolls.filter((payroll) => {
      const periodStart = new Date(payroll.period_start);
      const periodEnd = new Date(payroll.period_end);

      if (filterStartDate && filterEndDate) {
        const filterStart = new Date(filterStartDate);
        const filterEnd = new Date(filterEndDate);
        // Check if payroll period overlaps with filter range
        return periodStart <= filterEnd && periodEnd >= filterStart;
      } else if (filterStartDate) {
        const filterStart = new Date(filterStartDate);
        return periodEnd >= filterStart;
      } else if (filterEndDate) {
        const filterEnd = new Date(filterEndDate);
        return periodStart <= filterEnd;
      }
      return true;
    });

    setFilteredPayrolls(filtered);
  }, [payrolls, filterStartDate, filterEndDate]);

  const fetchPayrolls = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
      const response = await fetch(
        `${getApiUrl()}/api/v1/employees`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (err: any) {
      console.error("Failed to fetch employees:", err);
    }
  };

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
      // Use comprehensive endpoint for full SA deduction calculations
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

  const handleExportExcel = async () => {
    if (!periodStart || !periodEnd) {
      setError("Please filter by date range first");
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
            period_start: filterStartDate || periodStart,
            period_end: filterEndDate || periodEnd,
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll_${filterStartDate || periodStart}_to_${filterEndDate || periodEnd}.xlsx`;
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

  const handleDownloadPayslipPDF = async (payrollId: number, employeeName: string) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/payroll/${payrollId}/payslip/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payslips_bulk_${new Date().toISOString().split("T")[0]}.zip`;
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
        }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payroll records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate and manage employee payroll records
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={handleExportExcel}
                disabled={exporting || filteredPayrolls.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={handleBulkPayslipPDF}
                disabled={exporting || filteredPayrolls.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                All Payslips PDF
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                + Generate Payroll
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">Filter by Period:</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="End Date"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredPayrolls.length} of {payrolls.length} records
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {payrollSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Employees</p>
              <p className="text-xl font-bold text-gray-900">{payrollSummary.employee_count}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Total Gross</p>
              <p className="text-xl font-bold text-gray-900">R {payrollSummary.total_gross.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">PAYE</p>
              <p className="text-xl font-bold text-red-600">R {payrollSummary.total_paye.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">UIF (Employee)</p>
              <p className="text-xl font-bold text-red-600">R {payrollSummary.total_uif_employee.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">UIF (Employer)</p>
              <p className="text-xl font-bold text-orange-600">R {payrollSummary.total_uif_employer.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">SDL</p>
              <p className="text-xl font-bold text-orange-600">R {payrollSummary.total_sdl.toLocaleString()}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Total Net</p>
              <p className="text-xl font-bold text-green-600">R {payrollSummary.total_net.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Payroll Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
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
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    {payrolls.length === 0
                      ? 'No payroll records found. Click "Generate Payroll" to create one.'
                      : 'No payroll records match the selected date range.'}
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll) => (
                  <tr key={payroll.payroll_id} className="hover:bg-gray-50">
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
                      <div className="text-sm text-gray-900">{payroll.total_hours.toFixed(1)}h</div>
                      <div className="text-xs text-gray-500">OT: {payroll.overtime_hours.toFixed(1)}h</div>
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payroll.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : payroll.status === "approved"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleDownloadPayslipPDF(payroll.payroll_id, payroll.employee_name)}
                        className="text-red-600 hover:text-red-900"
                        title="Download Payslip PDF"
                      >
                        <FileText className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => window.open(`/payroll/${payroll.payroll_id}`, '_blank')}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeletePayroll(payroll.payroll_id)}
                        className="text-gray-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Payroll</h2>

            <div className="space-y-4">
              {/* All Employees Toggle */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateAll}
                    onChange={(e) => {
                      setGenerateAll(e.target.checked);
                      if (e.target.checked) setSelectedEmployee(null);
                    }}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="ml-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Generate for All Employees</span>
                  </span>
                </label>
                <p className="mt-2 ml-8 text-xs text-gray-600">
                  Calculate SA deductions (PAYE, UIF, SDL) for all active employees
                </p>
              </div>

              {/* Single Employee Selection */}
              {!generateAll && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Select Employee
                  </label>
                  <select
                    value={selectedEmployee || ""}
                    onChange={(e) => setSelectedEmployee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.first_name} {emp.last_name} - {emp.position || "Guard"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* SA Deductions Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">SA Statutory Deductions Applied:</p>
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                {generateAll ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                Generate {generateAll ? "All" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
