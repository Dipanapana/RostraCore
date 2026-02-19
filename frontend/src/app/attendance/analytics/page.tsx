'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { attendanceApi } from '@/services/api'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Users,
  XCircle,
  MapPin,
  TrendingDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsData {
  period_days: number
  total_assignments: number
  overview: {
    check_in_rate: number
    punctuality_rate: number
    no_show_rate: number
    avg_lateness_min: number
    checked_in: number
    checked_out: number
    no_shows: number
    late_arrivals: number
    early_departures: number
  }
  daily_trend: {
    date: string
    total: number
    checked_in: number
    no_show: number
    late: number
    check_in_rate: number
  }[]
  by_site: {
    site_id: number | null
    site_name: string
    total: number
    checked_in: number
    no_show: number
    late: number
    no_show_rate: number
    check_in_rate: number
  }[]
  top_no_show_employees: {
    employee_id: number
    name: string
    total: number
    checked_in: number
    no_show: number
    late: number
  }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AttendanceAnalyticsPage() {
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await attendanceApi.getAnalytics({ period_days: period })
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const d = data
  const o = d?.overview

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-500" />
              Attendance Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Check-in rates, punctuality trends, no-show analysis, and site-level attendance breakdown.
            </p>
          </div>

          {/* Period selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === days
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {days}d
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
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analysing attendance data…
          </div>
        ) : d && o ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total Shifts', value: d.total_assignments, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/30' },
                { label: 'Check-in Rate', value: `${o.check_in_rate}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Punctuality', value: `${o.punctuality_rate}%`, icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
                { label: 'No-shows', value: o.no_shows, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Late Arrivals', value: o.late_arrivals, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
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

            {/* Alert banners */}
            {o.no_show_rate > 10 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    High no-show rate: {o.no_show_rate}%
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    No-show rate exceeds 10%. Investigate recurring absences and consider spare pool utilisation.
                  </p>
                </div>
              </div>
            )}

            {o.avg_lateness_min > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-amber-800 dark:text-amber-300">
                  Average lateness: <strong>{o.avg_lateness_min} min</strong> across {o.late_arrivals} late arrival{o.late_arrivals !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Daily trend */}
              {d.daily_trend.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 lg:col-span-2">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                    <TrendingDown className="w-4 h-4 text-teal-500" /> Daily Check-in Rate
                  </h2>
                  <div className="flex items-end gap-px h-32">
                    {d.daily_trend.map((day) => {
                      const h = Math.max((day.check_in_rate / 100) * 100, 2)
                      const barColor = day.check_in_rate >= 90 ? 'bg-emerald-500' : day.check_in_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className={`w-full rounded-t ${barColor} transition-all min-w-[3px]`}
                            style={{ height: `${h}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            {fmtDate(day.date)}: {day.check_in_rate}% ({day.checked_in}/{day.total})
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{d.daily_trend.length > 0 ? fmtDate(d.daily_trend[0].date) : ''}</span>
                    <span>{d.daily_trend.length > 0 ? fmtDate(d.daily_trend[d.daily_trend.length - 1].date) : ''}</span>
                  </div>
                </div>
              )}

              {/* Per-site breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-violet-500" /> Attendance by Site
                </h2>
                {d.by_site.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {d.by_site.map((site) => (
                      <div key={site.site_name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[60%]">{site.site_name}</span>
                          <div className="flex items-center gap-2">
                            {site.no_show > 0 && (
                              <span className="text-red-500 font-medium">{site.no_show} no-show</span>
                            )}
                            <span className={`font-bold ${
                              site.check_in_rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                              site.check_in_rate >= 70 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {site.check_in_rate}%
                            </span>
                          </div>
                        </div>
                        <RateBar
                          value={site.check_in_rate}
                          color={
                            site.check_in_rate >= 90 ? 'bg-emerald-500' :
                            site.check_in_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No site data available.</p>
                )}
              </div>

              {/* Top no-show employees */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                  <XCircle className="w-4 h-4 text-red-500" /> Top No-show Employees
                </h2>
                {d.top_no_show_employees.length > 0 ? (
                  <div className="space-y-3">
                    {d.top_no_show_employees.map((emp) => {
                      const rate = emp.total > 0 ? Math.round((emp.no_show / emp.total) * 100) : 0
                      return (
                        <div key={emp.employee_id} className="flex items-center justify-between text-xs">
                          <Link
                            href={`/employees/${emp.employee_id}`}
                            className="text-violet-600 dark:text-violet-400 hover:underline font-medium truncate max-w-[50%]"
                          >
                            {emp.name}
                          </Link>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{emp.total} shifts</span>
                            <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                              {emp.no_show} no-show ({rate}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300 dark:text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No no-shows in this period.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Additional Metrics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Completed (in + out)', value: o.checked_out },
                  { label: 'Early Departures', value: o.early_departures },
                  { label: 'No-show Rate', value: `${o.no_show_rate}%` },
                  { label: 'Avg Lateness', value: o.avg_lateness_min > 0 ? `${o.avg_lateness_min} min` : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No attendance data available for this period.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
