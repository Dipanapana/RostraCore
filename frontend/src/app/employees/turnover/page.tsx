'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { employeesApi } from '@/services/api'
import {
  UserMinus,
  UserPlus,
  Users,
  AlertTriangle,
  Loader2,
  TrendingDown,
  Clock,
  BarChart3,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TurnoverData {
  period_months: number
  summary: {
    current_headcount: number
    total_hires: number
    total_terminations: number
    turnover_rate_pct: number
    avg_tenure_days: number | null
  }
  monthly_trend: {
    month: string
    hires: number
    terminations: number
    headcount: number
  }[]
  tenure_distribution: Record<string, number>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`
}

function fmtTenure(days: number): string {
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  const years = Math.floor(days / 365)
  const remaining = Math.round((days % 365) / 30)
  return remaining > 0 ? `${years}y ${remaining}mo` : `${years}y`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TurnoverAnalyticsPage() {
  const [months, setMonths] = useState(12)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TurnoverData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await employeesApi.getTurnoverAnalytics({ months })
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load turnover analytics')
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => { load() }, [load])

  const d = data
  const s = d?.summary

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-rose-500" />
              Employee Turnover & Retention
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track workforce stability — hires, terminations, headcount trends, and tenure distribution.
            </p>
          </div>

          <div className="flex gap-2">
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  months === m
                    ? 'bg-rose-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analysing turnover data…
          </div>
        ) : d && s ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Current Headcount', value: s.current_headcount, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/30' },
                { label: 'Hires', value: s.total_hires, icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Terminations', value: s.total_terminations, icon: UserMinus, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Turnover Rate', value: `${s.turnover_rate_pct}%`, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                { label: 'Avg Tenure', value: s.avg_tenure_days ? fmtTenure(s.avg_tenure_days) : '—', icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            {/* Alert for high turnover */}
            {s.turnover_rate_pct > 30 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    High turnover rate: {s.turnover_rate_pct}%
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    Annual turnover above 30% indicates retention issues. Review working conditions, compensation, and management practices.
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Trend Chart */}
            {d.monthly_trend.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-rose-500" /> Monthly Headcount & Movement
                </h2>

                {/* Stacked bar chart */}
                <div className="space-y-2">
                  {d.monthly_trend.map((m) => {
                    const maxVal = Math.max(...d.monthly_trend.map((t) => t.headcount), 1)
                    const hcPct = (m.headcount / maxVal) * 100
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-14 text-right flex-shrink-0">{fmtMonth(m.month)}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative">
                            <div
                              className="h-full bg-slate-400 dark:bg-slate-500 rounded"
                              style={{ width: `${hcPct}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              {m.headcount}
                            </span>
                          </div>
                          {m.hires > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                              +{m.hires}
                            </span>
                          )}
                          {m.terminations > 0 && (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                              -{m.terminations}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400 inline-block" /> Headcount</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Hires</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Terminations</span>
                </div>
              </div>
            )}

            {/* Tenure Distribution */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-sky-500" /> Tenure Distribution (Active Employees)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(d.tenure_distribution).map(([bucket, count]) => {
                  const maxCount = Math.max(...Object.values(d.tenure_distribution), 1)
                  const pct = (count / maxCount) * 100
                  const isHighTurnover = bucket === '<3 months' || bucket === '3-6 months'
                  return (
                    <div key={bucket} className="text-center">
                      <div className="h-20 flex items-end justify-center mb-1">
                        <div
                          className={`w-10 rounded-t ${isHighTurnover ? 'bg-amber-400' : 'bg-sky-400'}`}
                          style={{ height: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{count}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{bucket}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Info panel */}
            <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-xs text-sky-700 dark:text-sky-400 leading-relaxed">
              <p className="font-semibold mb-1">How Turnover Rate is Calculated</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Turnover Rate = (Terminations ÷ Average Headcount) × 100</li>
                <li>Average Headcount = mean of monthly headcount over the selected period</li>
                <li>Employees without a <strong>hire_date</strong> are included in headcount if currently active</li>
                <li>SA security industry average annual turnover: 20–40%</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No turnover data available.</p>
            <p className="text-xs text-slate-400 mt-1">Set hire dates on your employees to enable turnover tracking.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
