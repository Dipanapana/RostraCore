'use client'

import { useState, useEffect, useCallback } from 'react'
import { contractComplianceApi } from '@/services/api'
import { FileCheck, AlertTriangle, CheckCircle, XCircle, Clock, Building2, DollarSign } from 'lucide-react'

function fmtZAR(val: number) {
  return `R ${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const TERM_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  expiring_soon: 'bg-amber-50 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-600',
  unknown: 'bg-gray-100 text-gray-600',
}
const TERM_LABELS: Record<string, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  inactive: 'Inactive',
  unknown: 'Unknown',
}
const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: 'text-green-600',
  at_risk: 'text-yellow-600',
  non_compliant: 'text-red-600',
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-sm font-medium ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}
      </span>
    </div>
  )
}

export default function ContractCompliancePage() {
  const [overview, setOverview] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, dashRes] = await Promise.all([
        contractComplianceApi.overview(),
        contractComplianceApi.dashboard(),
      ])
      setOverview(ovRes.data)
      setDashboard(dashRes.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileCheck className="w-7 h-7 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Contract Compliance</h1>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><CheckCircle className="w-4 h-4 text-green-500" />Active Contracts</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard.active}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-600 mb-1"><Clock className="w-4 h-4" />Expiring &lt; 30d</div>
            <div className="text-2xl font-bold text-yellow-600">{dashboard.expiring_within_30_days}</div>
            <div className="text-xs text-gray-400 mt-0.5">{dashboard.expiring_within_90_days} within 90d</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1"><XCircle className="w-4 h-4" />Expired</div>
            <div className="text-2xl font-bold text-red-600">{dashboard.expired}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><DollarSign className="w-4 h-4" />Monthly Revenue</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(dashboard.total_monthly_revenue)}</div>
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Building2 className="w-4 h-4" />Understaffed Sites Today</div>
            <div className={`text-2xl font-bold ${dashboard.understaffed_sites_today > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {dashboard.understaffed_sites_today}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500 mb-1">With Wage Budget</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard.contracts_with_wage_budget}</div>
          </div>
          {overview && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-1">Fully Compliant</div>
              <div className="text-2xl font-bold text-green-600">{overview.compliant}</div>
              <div className="text-xs text-gray-400 mt-0.5">of {overview.total_contracts} contracts</div>
            </div>
          )}
        </div>
      )}

      {/* Contracts Table */}
      {overview && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Contracts — Compliance Status</h2>
            <p className="text-xs text-gray-400 mt-1">Sorted by compliance score (lowest first)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Contract</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Site</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Term</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Days Left</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Monthly Value</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Staffing %</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Wage Budget %</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overview.contracts.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No contracts found</td></tr>
                ) : overview.contracts.map((c: any) => (
                  <tr key={c.contract_value_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.contract_number || `#${c.contract_value_id}`}</td>
                    <td className="px-4 py-3 text-gray-600">{c.client_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.site_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TERM_COLORS[c.term_status] || TERM_COLORS.unknown}`}>
                        {TERM_LABELS[c.term_status] || c.term_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.days_remaining !== null ? (
                        <span className={c.days_remaining <= 30 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {c.days_remaining}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.monthly_value > 0 ? fmtZAR(c.monthly_value) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {c.staffing_compliance_pct !== null ? (
                        <span className={c.staffing_compliance_pct >= 90 ? 'text-green-600' : c.staffing_compliance_pct >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {c.staffing_compliance_pct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.wage_compliance_pct !== null ? (
                        <span className={c.wage_compliance_pct <= 100 ? 'text-green-600' : 'text-red-600'}>
                          {c.wage_compliance_pct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><ScoreBar score={c.overall_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
