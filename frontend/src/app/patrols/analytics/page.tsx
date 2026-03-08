'use client'

import { useState, useEffect, useCallback } from 'react'
import { patrolAnalyticsApi } from '@/services/api'
import { Radar, CheckCircle, XCircle, Clock, Route, AlertTriangle, Users, MapPin } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function PatrolAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  const fetchData = useCallback(async () => {
    try {
      const res = await patrolAnalyticsApi.dashboard(days)
      setData(res.data)
    } catch { /* ignore */ }
  }, [days])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <DashboardLayout><div className="p-8 text-gray-500">Loading...</div></DashboardLayout>
  if (!data) return <DashboardLayout><div className="p-8 text-gray-500">No data available</div></DashboardLayout>

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Patrol Analytics</h1>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Route className="w-4 h-4" />Total Runs</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_runs}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Completed</div>
          <div className="text-2xl font-bold text-green-600">{data.completed}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-red-600"><XCircle className="w-4 h-4" />Abandoned</div>
          <div className="text-2xl font-bold text-red-600">{data.abandoned}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Completion Rate</div>
          <div className={`text-2xl font-bold ${data.completion_rate >= 80 ? 'text-green-600' : data.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {data.completion_rate}%
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="w-4 h-4" />Avg Duration</div>
          <div className="text-xl font-bold text-gray-900">
            {data.avg_duration_minutes !== null ? `${data.avg_duration_minutes}m` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Total Scans</div>
          <div className="text-2xl font-bold text-indigo-600">{data.total_scans}</div>
        </div>
      </div>

      {/* Coverage Alert */}
      {data.coverage_gaps > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <span className="font-medium text-yellow-800">
              {data.coverage_gaps} active tour{data.coverage_gaps > 1 ? 's have' : ' has'} no runs in the last {days} days
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Tour */}
        {data.by_tour.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">By Tour</h2>
            <div className="space-y-3">
              {data.by_tour.map((t: any) => (
                <div key={t.tour_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.tour_name}</div>
                    <div className="text-xs text-gray-500">{t.total_runs} runs &middot; {t.completed} completed &middot; {t.abandoned} abandoned</div>
                  </div>
                  <span className={`text-sm font-bold ${t.completion_rate >= 80 ? 'text-green-600' : t.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {t.completion_rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Site */}
        {data.by_site.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" />By Site</h2>
            <div className="space-y-3">
              {data.by_site.map((s: any) => {
                const pct = data.by_site[0]?.total_runs ? (s.total_runs / data.by_site[0].total_runs) * 100 : 0
                return (
                  <div key={s.site_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                      <span className="text-xs text-gray-500">{s.total_runs} runs &middot; {s.completion_rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Guards */}
      {data.top_guards.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" />Top Patrol Guards</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Guard</th>
                  <th className="pb-2 text-right">Runs</th>
                  <th className="pb-2 text-right">Completed</th>
                  <th className="pb-2 text-right">Scans</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.top_guards.map((g: any, i: number) => (
                  <tr key={g.employee_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2">
                      <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{i + 1}</span>
                    </td>
                    <td className="py-2 font-medium text-gray-900">{g.employee_name}</td>
                    <td className="py-2 text-right text-gray-700">{g.total_runs}</td>
                    <td className="py-2 text-right text-green-600 font-medium">{g.completed}</td>
                    <td className="py-2 text-right text-indigo-600 font-medium">{g.total_scans}</td>
                    <td className="py-2 text-right">
                      <span className={`font-bold ${g.completion_rate >= 80 ? 'text-green-600' : g.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {g.completion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {data.monthly_trend.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-right">Total Runs</th>
                  <th className="pb-2 text-right">Completed</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly_trend.map((t: any) => (
                  <tr key={t.month} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 font-medium text-gray-900">{t.month}</td>
                    <td className="py-2 text-right text-gray-700">{t.total_runs}</td>
                    <td className="py-2 text-right text-green-600 font-medium">{t.completed}</td>
                    <td className="py-2 text-right">
                      <span className={`font-bold ${t.completion_rate >= 80 ? 'text-green-600' : t.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {t.completion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coverage Gaps */}
      {data.gap_tours.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />Coverage Gaps — Active Tours with No Runs
          </h2>
          <div className="space-y-2">
            {data.gap_tours.map((g: any) => (
              <div key={g.tour_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{g.tour_name}</div>
                  {g.site_name && <div className="text-xs text-gray-500">{g.site_name}</div>}
                </div>
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 font-medium">No runs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
