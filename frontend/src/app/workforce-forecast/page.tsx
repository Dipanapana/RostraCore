'use client'

import { useState, useEffect, useCallback } from 'react'
import { workforceApi } from '@/services/api'
import { TrendingUp, Users, Building2, Calendar, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

function statusColor(s: string) {
  if (s === 'adequate') return 'text-green-600'
  if (s === 'overstaffed') return 'text-blue-600'
  return 'text-red-600'
}

function statusBadge(s: string) {
  if (s === 'adequate') return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">Adequate</span>
  if (s === 'overstaffed') return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Overstaffed</span>
  return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Understaffed</span>
}

export default function WorkforceForecastPage() {
  const [summary, setSummary] = useState<any>(null)
  const [gaps, setGaps] = useState<any>(null)
  const [siteNeeds, setSiteNeeds] = useState<any>(null)
  const [projection, setProjection] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, gRes, snRes, pRes] = await Promise.all([
        workforceApi.summary(),
        workforceApi.staffingGaps(30),
        workforceApi.siteNeeds(),
        workforceApi.monthlyProjection(6),
      ])
      setSummary(sRes.data)
      setGaps(gRes.data)
      setSiteNeeds(snRes.data)
      setProjection(pRes.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-7 h-7 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Workforce Forecasting</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Users className="w-4 h-4" />Active Guards</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_active_employees}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Building2 className="w-4 h-4" />Sites</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_sites}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Calendar className="w-4 h-4" />Active Contracts</div>
            <div className="text-2xl font-bold text-gray-900">{summary.active_contracts}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-600 mb-1"><AlertTriangle className="w-4 h-4" />Leave (30d)</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.upcoming_leave_30d}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-orange-600 mb-1"><Clock className="w-4 h-4" />OT Hours (30d)</div>
            <div className="text-2xl font-bold text-orange-600">{summary.overtime_hours_30d}h</div>
          </div>
        </div>
      )}

      {/* Staffing Gap Analysis */}
      {gaps && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Staffing Gap Analysis (Next 30 Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">Total Employees</div>
              <div className="text-xl font-bold text-gray-900">{gaps.total_employees}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Required (Sites)</div>
              <div className="text-xl font-bold text-gray-900">{gaps.total_required}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Avg On Leave</div>
              <div className="text-xl font-bold text-yellow-600">{gaps.avg_on_leave}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gap</div>
              <div className={`text-xl font-bold ${statusColor(gaps.status)}`}>
                {gaps.staffing_gap > 0 ? '+' : ''}{gaps.staffing_gap} ({gaps.gap_percentage}%)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gaps.status === 'adequate' || gaps.status === 'overstaffed'
              ? <CheckCircle className="w-5 h-5 text-green-500" />
              : <AlertTriangle className="w-5 h-5 text-red-500" />
            }
            <span className={`text-sm font-medium ${statusColor(gaps.status)}`}>
              {gaps.status === 'adequate' && 'Staffing levels are adequate for the next 30 days'}
              {gaps.status === 'overstaffed' && 'You have more guards than required — consider redeployments'}
              {gaps.status === 'understaffed' && `You need ${gaps.staffing_gap} more guards to meet site requirements`}
            </span>
          </div>

          {gaps.peak_leave_dates?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Peak Leave Dates</h3>
              <div className="flex flex-wrap gap-2">
                {gaps.peak_leave_dates.map((d: any) => (
                  <span key={d.date} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                    {d.date}: {d.on_leave} on leave
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Site Needs */}
      {siteNeeds?.sites?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Staffing by Site</h2>
          <div className="space-y-2">
            {siteNeeds.sites.map((s: any) => (
              <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">Need: {s.required}</span>
                  <span className="text-xs text-gray-500">Have: {s.deployed}</span>
                  <span className={`text-xs font-bold ${s.gap > 0 ? 'text-red-600' : s.gap < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                    {s.gap > 0 ? `−${s.gap}` : s.gap < 0 ? `+${Math.abs(s.gap)}` : '✓'}
                  </span>
                  {statusBadge(s.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Projection */}
      {projection?.projections?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Projection</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-center">Headcount</th>
                  <th className="pb-2 text-center">On Leave</th>
                  <th className="pb-2 text-center">Expiring Contracts</th>
                  <th className="pb-2 text-center">Effective Available</th>
                </tr>
              </thead>
              <tbody>
                {projection.projections.map((p: any) => (
                  <tr key={p.month} className="border-t border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{p.month_label}</td>
                    <td className="py-2 text-center text-gray-700">{p.headcount}</td>
                    <td className="py-2 text-center text-yellow-600">{p.leave_count}</td>
                    <td className="py-2 text-center text-orange-600">{p.expiring_contracts}</td>
                    <td className="py-2 text-center font-bold text-gray-900">{p.effective_available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
