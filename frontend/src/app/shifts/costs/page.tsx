'use client'

import { useState, useEffect, useCallback } from 'react'
import { shiftCostsApi } from '@/services/api'
import { Coins, DollarSign, Clock, TrendingUp, Users, MapPin } from 'lucide-react'

function formatCurrency(val: number): string {
  return `R${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ShiftCostsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    try {
      const res = await shiftCostsApi.breakdown(days)
      setData(res.data)
    } catch { /* ignore */ }
  }, [days])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  const costBreakdown = [
    { label: 'Regular Pay', value: data.regular_pay, color: 'bg-blue-500' },
    { label: 'Overtime Pay', value: data.overtime_pay, color: 'bg-orange-500' },
    { label: 'Night Premium', value: data.night_premium, color: 'bg-purple-500' },
    { label: 'Weekend Premium', value: data.weekend_premium, color: 'bg-teal-500' },
    { label: 'Sunday Premium', value: data.sunday_premium, color: 'bg-indigo-500' },
    { label: 'Holiday Premium', value: data.holiday_premium, color: 'bg-red-500' },
    { label: 'Travel', value: data.travel_reimbursement, color: 'bg-gray-500' },
  ].filter(c => c.value > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="w-7 h-7 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Shift Cost Breakdown</h1>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="w-4 h-4" />Total Cost</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(data.total_cost)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Assignments</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_assignments}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="w-4 h-4" />Total Hours</div>
          <div className="text-xl font-bold text-gray-900">{data.total_hours}h</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Avg Cost/Hour</div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(data.avg_cost_per_hour)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-orange-600">Overtime Ratio</div>
          <div className="text-xl font-bold text-orange-600">{data.overtime_ratio_pct}%</div>
          <div className="text-xs text-gray-500">{data.overtime_hours}h OT</div>
        </div>
      </div>

      {/* Cost Breakdown Bar */}
      {costBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
          <div className="flex rounded-lg overflow-hidden h-8 mb-4">
            {costBreakdown.map(c => {
              const pct = data.total_cost > 0 ? (c.value / data.total_cost) * 100 : 0
              if (pct < 1) return null
              return (
                <div key={c.label} className={`${c.color} flex items-center justify-center text-white text-xs font-medium`} style={{ width: `${pct}%` }}>
                  {pct >= 5 ? `${pct.toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {costBreakdown.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${c.color}`} />
                <span className="text-sm text-gray-600">{c.label}: {formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Site */}
        {data.by_site.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" />Cost by Site</h2>
            <div className="space-y-3">
              {data.by_site.slice(0, 10).map((s: any) => {
                const pct = data.total_cost > 0 ? (s.total_cost / data.total_cost) * 100 : 0
                return (
                  <div key={s.site_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                      <span className="text-sm text-gray-500">{formatCurrency(s.total_cost)} ({s.cost_per_hour}/h)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {data.by_month.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Monthly Trend</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2">Month</th>
                    <th className="pb-2 text-right">Regular</th>
                    <th className="pb-2 text-right">Overtime</th>
                    <th className="pb-2 text-right">Premiums</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_month.map((m: any) => (
                    <tr key={m.month} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 font-medium text-gray-900">{m.month}</td>
                      <td className="py-2 text-right text-blue-600">{formatCurrency(m.regular_pay)}</td>
                      <td className="py-2 text-right text-orange-600">{formatCurrency(m.overtime_pay)}</td>
                      <td className="py-2 text-right text-purple-600">{formatCurrency(m.premiums)}</td>
                      <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(m.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Top Employees by Cost */}
      {data.top_employees.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" />Highest-Cost Employees</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2 text-right">Regular</th>
                  <th className="pb-2 text-right">Overtime</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.top_employees.map((e: any, i: number) => (
                  <tr key={e.employee_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2">
                      <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{i + 1}</span>
                    </td>
                    <td className="py-2 font-medium text-gray-900">{e.employee_name}</td>
                    <td className="py-2 text-right text-blue-600">{formatCurrency(e.regular_pay)}</td>
                    <td className="py-2 text-right text-orange-600">{formatCurrency(e.overtime_pay)}</td>
                    <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(e.total_cost)}</td>
                    <td className="py-2 text-right text-gray-500">{e.total_hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.total_assignments === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No shift cost data for this period.</p>
        </div>
      )}
    </div>
  )
}
