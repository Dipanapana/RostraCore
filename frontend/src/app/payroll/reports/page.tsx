'use client'

import { useState, useEffect, useCallback } from 'react'
import { payrollReportsApi } from '@/services/api'
import { Receipt, Users, DollarSign, Clock, TrendingUp, TrendingDown } from 'lucide-react'

function fmtZAR(val: number) {
  return `R ${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PayrollReportsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [trend, setTrend] = useState<any>(null)
  const [employees, setEmployees] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, trendRes, empRes] = await Promise.all([
        payrollReportsApi.summary(year, month),
        payrollReportsApi.trend(6),
        payrollReportsApi.byEmployee(year, month),
      ])
      setSummary(sumRes.data)
      setTrend(trendRes.data)
      setEmployees(empRes.data)
    } catch { /* ignore */ }
  }, [year, month])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Receipt className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Payroll Reports</h1>
      </div>

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
        {summary && <span className="text-sm text-gray-500">{summary.month_label}</span>}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Users className="w-4 h-4" />Headcount</div>
            <div className="text-2xl font-bold text-gray-900">{summary.headcount}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><DollarSign className="w-4 h-4" />Gross Pay</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(summary.total_gross)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500 mb-1">Total Deductions</div>
            <div className="text-xl font-bold text-red-600">{fmtZAR(summary.total_deductions)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500 mb-1">Net Pay</div>
            <div className="text-xl font-bold text-green-600">{fmtZAR(summary.total_net)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Clock className="w-4 h-4" />Total Hours</div>
            <div className="text-xl font-bold text-gray-900">{summary.total_hours}</div>
            <div className="text-xs text-orange-500 mt-0.5">{summary.total_overtime_hours} OT hrs</div>
          </div>
        </div>
      )}

      {/* Avg per employee card */}
      {summary && summary.headcount > 0 && (
        <div className="bg-white rounded-xl shadow p-4 max-w-xs">
          <div className="text-sm text-gray-500 mb-1">Avg Gross / Employee</div>
          <div className="text-xl font-bold text-indigo-600">{fmtZAR(summary.avg_gross_per_employee)}</div>
        </div>
      )}

      {/* 6-Month Trend */}
      {trend?.trend?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">6-Month Payroll Trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Month</th>
                  <th className="pb-2 text-right">Headcount</th>
                  <th className="pb-2 text-right">Gross Pay</th>
                  <th className="pb-2 text-right">Deductions</th>
                  <th className="pb-2 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {trend.trend.map((t: any, i: number) => {
                  const prev = i > 0 ? trend.trend[i - 1] : null
                  const grossChange = prev && prev.total_gross > 0 ? ((t.total_gross - prev.total_gross) / prev.total_gross) * 100 : null
                  return (
                    <tr key={t.month} className="border-t border-gray-100">
                      <td className="py-2 font-medium text-gray-900">{t.month}</td>
                      <td className="py-2 text-right text-gray-700">{t.headcount}</td>
                      <td className="py-2 text-right text-gray-700">
                        <div className="flex items-center justify-end gap-1">
                          {fmtZAR(t.total_gross)}
                          {grossChange !== null && grossChange !== 0 && (
                            <span className={`text-xs ${grossChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {grossChange > 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                              {Math.abs(grossChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-right text-red-600">{fmtZAR(t.total_deductions)}</td>
                      <td className="py-2 text-right text-green-600 font-medium">{fmtZAR(t.total_net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Employee Breakdown */}
      {employees && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Employee Breakdown — {employees.month_label}</h2>
            <p className="text-xs text-gray-400 mt-1">{employees.total} employees</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Employee</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Hours</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">OT Hrs</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Gross</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Deductions</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.employees.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payroll records for this period</td></tr>
              ) : employees.employees.map((e: any) => (
                <tr key={e.employee_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.employee_name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{e.total_hours}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{e.overtime_hours > 0 ? e.overtime_hours : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(e.total_gross)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmtZAR(e.deductions)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{fmtZAR(e.total_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
