"use client";

import { useState, useEffect, useCallback } from "react";
import { psiraApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceResult {
  employee_id: number;
  employee_name: string;
  grade: string | null;
  current_hourly_rate: number;
  psira_minimum: number | null;
  compliant: boolean;
  shortfall: number;
}

interface ComplianceData {
  total_employees: number;
  compliant: number;
  non_compliant: number;
  results: ComplianceResult[];
}

interface WageRate {
  rate_id: number;
  effective_from: string;
  effective_to: string;
  grade: string;
  area: number;
  rate_type: string;
  hourly_rate: number;
  monthly_minimum: number | null;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PSIRACompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [rates, setRates] = useState<WageRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [tab, setTab] = useState<"compliance" | "rates">("compliance");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, ratesRes] = await Promise.all([
        psiraApi.checkCompliance(),
        psiraApi.getRates({ area: 1 }),
      ]);
      setData(compRes.data);
      setRates(ratesRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await psiraApi.seedRates();
      await loadData();
    } catch {} finally { setSeeding(false); }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const complianceRate = data ? Math.round((data.compliant / Math.max(data.total_employees, 1)) * 100) : 0;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="PSIRA Wage Compliance"
        subtitle="South African minimum wage rate compliance by PSIRA grade"
        icon={<Shield className="text-blue-600" size={28} />}
        actions={
          <div className="flex items-center gap-2">
            {rates.length === 0 && (
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {seeding ? "Seeding..." : "Seed 2025 Rates"}
              </button>
            )}
            <button onClick={loadData}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
              <Users size={14} /> Total Employees
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.total_employees}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 text-xs uppercase mb-2">
              <CheckCircle size={14} /> Compliant
            </div>
            <p className="text-2xl font-bold text-green-600">{data.compliant}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 text-xs uppercase mb-2">
              <AlertTriangle size={14} /> Non-Compliant
            </div>
            <p className="text-2xl font-bold text-red-600">{data.non_compliant}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
              Compliance Rate
            </div>
            <p className={`text-2xl font-bold ${complianceRate >= 100 ? "text-green-600" : complianceRate >= 80 ? "text-amber-600" : "text-red-600"}`}>
              {complianceRate}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-2">
        <button onClick={() => setTab("compliance")}
          className={`pb-2 text-sm font-medium ${tab === "compliance" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
          Employee Compliance
        </button>
        <button onClick={() => setTab("rates")}
          className={`pb-2 text-sm font-medium ${tab === "rates" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
          PSIRA Rates ({rates.length})
        </button>
      </div>

      {/* Compliance Tab */}
      {tab === "compliance" && data && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Current Rate</th>
                <th className="px-4 py-3">PSIRA Min</th>
                <th className="px-4 py-3">Shortfall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((r) => (
                <tr key={r.employee_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {r.compliant ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{r.employee_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.grade || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-600">R{r.current_hourly_rate.toFixed(2)}/hr</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.psira_minimum ? `R${r.psira_minimum.toFixed(2)}/hr` : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {r.shortfall > 0 ? (
                      <span className="text-red-600 font-medium">-R{r.shortfall.toFixed(2)}/hr</span>
                    ) : (
                      <span className="text-green-600">{"\u2014"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rates Tab */}
      {tab === "rates" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Hourly Rate</th>
                <th className="px-4 py-3">Monthly Min</th>
                <th className="px-4 py-3">Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.filter(r => r.rate_type === "normal").map((r) => (
                <tr key={r.rate_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">Grade {r.grade}</td>
                  <td className="px-4 py-3 text-gray-600">Area {r.area}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.rate_type}</td>
                  <td className="px-4 py-3 text-gray-900">R{r.hourly_rate.toFixed(2)}/hr</td>
                  <td className="px-4 py-3 text-gray-500">{r.monthly_minimum ? `R${r.monthly_minimum.toFixed(2)}` : "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.effective_from} {"\u2014"} {r.effective_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
