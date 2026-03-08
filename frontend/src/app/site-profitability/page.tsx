'use client'

import { useState, useEffect, useCallback } from 'react'
import { siteProfitabilityApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { TrendingUp, Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function fmtZAR(val: number) {
  return `R ${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SiteProfitabilityPage() {
  const [data, setData] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const fetchData = useCallback(async () => {
    try {
      const [byRes, sumRes] = await Promise.all([
        siteProfitabilityApi.bySite(year, month),
        siteProfitabilityApi.summary(),
      ])
      setData(byRes.data)
      setSummary(sumRes.data)
    } catch { /* ignore */ }
  }, [year, month])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-7 h-7 text-teal-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Site Profitability</h1>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Monthly Revenue</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(data.total_revenue)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Cost</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(data.total_cost)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Net Profit</div>
            <div className={`text-xl font-bold ${data.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtZAR(data.total_profit)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Margin</div>
            <div className={`text-xl font-bold ${data.overall_margin_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.overall_margin_pct}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {data.profitable_sites} profitable / {data.unprofitable_sites} unprofitable
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {summary?.monthly_trend?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">6-Month Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Profit</th>
                  <th className="pb-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthly_trend.map((t: any) => (
                  <tr key={t.month} className="border-t border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{t.month}</td>
                    <td className="py-2 text-right text-gray-700">{fmtZAR(t.revenue)}</td>
                    <td className="py-2 text-right text-gray-700">{fmtZAR(t.cost)}</td>
                    <td className={`py-2 text-right font-medium ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtZAR(t.profit)}
                    </td>
                    <td className={`py-2 text-right ${t.margin_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.margin_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
          ))}
        </select>
        {data && <span className="text-sm text-gray-500">{data.month_label}</span>}
      </div>

      {/* Site Table */}
      {data && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Site</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Client</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Revenue</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Labour</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">OT Cost</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Total Cost</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Profit</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Margin</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">Shifts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.sites.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No active sites</td></tr>
              ) : data.sites.map((s: any) => (
                <tr key={s.site_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {s.site_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.client_name || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(s.monthly_revenue)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(s.labour_cost)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{s.overtime_cost > 0 ? fmtZAR(s.overtime_cost) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(s.total_cost)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${s.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {s.profit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {fmtZAR(Math.abs(s.profit))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${s.margin_pct >= 20 ? 'text-green-600' : s.margin_pct >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {s.margin_pct}%
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.shift_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
