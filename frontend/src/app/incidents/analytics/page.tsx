'use client'

import { useState, useEffect, useCallback } from 'react'
import { incidentAnalyticsApi } from '@/services/api'
import { PieChart, AlertTriangle, CheckCircle, Clock, Building2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const STATUS_COLORS: Record<string, string> = {
  REPORTED: 'bg-blue-100 text-blue-700',
  INVESTIGATING: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
}
const TYPE_LABELS: Record<string, string> = {
  theft: 'Theft', violence: 'Violence', medical: 'Medical', trespassing: 'Trespassing',
  fire: 'Fire', vandalism: 'Vandalism', other: 'Other',
}

export default function IncidentAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  const fetchData = useCallback(async () => {
    try {
      const res = await incidentAnalyticsApi.dashboard(days)
      setData(res.data)
    } catch { /* ignore */ }
  }, [days])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <DashboardLayout><div className="p-8 text-gray-500">Loading...</div></DashboardLayout>
  if (!data) return <DashboardLayout><div className="p-8 text-gray-500">No data available</div></DashboardLayout>

  const maxTypeCount = Math.max(...Object.values(data.by_type as Record<string, number>), 1)

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PieChart className="w-7 h-7 text-orange-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Incident Analytics</h1>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Total Incidents</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_incidents}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600"><AlertTriangle className="w-4 h-4" />Open</div>
          <div className="text-2xl font-bold text-yellow-600">{data.open}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Resolved</div>
          <div className="text-2xl font-bold text-green-600">{data.resolved}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-red-600">Critical</div>
          <div className="text-2xl font-bold text-red-600">{data.critical}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="w-4 h-4" />Avg Resolution</div>
          <div className="text-xl font-bold text-gray-900">
            {data.avg_resolution_hours !== null ? `${data.avg_resolution_hours}h` : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Severity */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">By Severity</h2>
          {Object.keys(data.by_severity).length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="space-y-2">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
                const count = data.by_severity[sev] || 0
                if (count === 0) return null
                return (
                  <div key={sev} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${SEVERITY_COLORS[sev]}`}>{sev}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">By Status</h2>
          {Object.keys(data.by_status).length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.by_status).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By Type — horizontal bar chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">By Incident Type</h2>
        {Object.keys(data.by_type).length === 0 ? (
          <p className="text-sm text-gray-400">No data</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.by_type)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([type, count]: [string, any]) => {
                const pct = (count / maxTypeCount) * 100
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 capitalize">{TYPE_LABELS[type] || type}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div className="h-4 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-sm font-medium text-gray-700 text-right">{count}</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      {data.monthly_trend.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-right">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly_trend.map((t: any) => (
                  <tr key={t.month} className="border-t border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{t.month}</td>
                    <td className="py-2 text-right text-gray-700 font-medium">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Sites */}
      {data.top_sites.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Sites by Incident Count</h2>
          <div className="space-y-2">
            {data.top_sites.map((s: any, i: number) => (
              <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-orange-600">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
