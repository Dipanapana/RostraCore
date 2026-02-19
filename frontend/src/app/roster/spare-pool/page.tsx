'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { rosterApi } from '@/services/api'
import {
  Users,
  TrendingDown,
  ShieldCheck,
  Info,
  Loader2,
  AlertTriangle,
  BarChart3,
  Building2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AbsenceStats {
  leave_incidents: number
  total_leave_days: number
  no_show_awol_count: number
  total_absent_units: number
  total_scheduled_shifts: number
  absence_rate_pct: number
}

interface SiteRow {
  site_id: number
  site_name: string
  client_name: string | null
  deployed_guards: number
}

interface SparePoolResult {
  as_of: string
  lookback_days: number
  buffer_pct: number
  active_guards: number
  absence_stats: AbsenceStats
  recommended_spare_pool: number
  effective_rate_pct: number
  site_breakdown: SiteRow[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SparePoolPage() {
  const [lookbackDays, setLookbackDays] = useState(90)
  const [bufferPct, setBufferPct] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SparePoolResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await rosterApi.getSparePool({ lookback_days: lookbackDays, buffer_pct: bufferPct })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate spare pool')
    } finally {
      setLoading(false)
    }
  }, [lookbackDays, bufferPct])

  // Auto-run on mount
  useEffect(() => { handleRun() }, [handleRun])

  const r = result

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Spare Guard Pool Calculator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Calculates the recommended number of relief/spare guards to keep on standby based on
            your organisation's historical absence rate.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Lookback Period
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setLookbackDays(d)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      lookbackDays === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Safety Buffer %
              </label>
              <input
                type="number"
                value={bufferPct}
                min={0}
                max={30}
                step={0.5}
                onChange={(e) => setBufferPct(Number(e.target.value))}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24"
              />
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {loading ? 'Calculating…' : 'Recalculate'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>

        {r && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Active Guards',
                  value: r.active_guards,
                  icon: Users,
                  color: 'text-slate-600',
                  bg: 'bg-slate-50 dark:bg-slate-900/30',
                  sub: 'currently deployed',
                },
                {
                  label: 'Absence Rate',
                  value: `${r.absence_stats.absence_rate_pct}%`,
                  icon: TrendingDown,
                  color: r.absence_stats.absence_rate_pct >= 10 ? 'text-red-500' : r.absence_stats.absence_rate_pct >= 5 ? 'text-amber-500' : 'text-emerald-500',
                  bg: r.absence_stats.absence_rate_pct >= 10 ? 'bg-red-50 dark:bg-red-900/20' : r.absence_stats.absence_rate_pct >= 5 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
                  sub: `last ${r.lookback_days} days`,
                },
                {
                  label: 'Safety Buffer',
                  value: `${r.buffer_pct}%`,
                  icon: ShieldCheck,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                  sub: 'extra headroom',
                },
                {
                  label: 'Recommended Pool',
                  value: r.recommended_spare_pool,
                  icon: Users,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50 dark:bg-purple-900/20',
                  sub: `${r.effective_rate_pct}% of headcount`,
                },
              ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Absence breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Absence Breakdown — Last {r.lookback_days} Days
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Leave Incidents', value: r.absence_stats.leave_incidents },
                  { label: 'Total Leave Days', value: r.absence_stats.total_leave_days.toFixed(1) },
                  { label: 'No-Show / AWOL Events', value: r.absence_stats.no_show_awol_count },
                  { label: 'Total Absent Units', value: r.absence_stats.total_absent_units.toFixed(1) },
                  { label: 'Scheduled Guard-Shifts', value: r.absence_stats.total_scheduled_shifts.toLocaleString() },
                  { label: 'Historical Absence Rate', value: `${r.absence_stats.absence_rate_pct}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Methodology note */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">How this is calculated</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 leading-relaxed">
                  <strong>Absence rate</strong> = total absent units ÷ (scheduled guard-shifts + absent units) × 100.
                  Absent units include approved leave days and no-show/AWOL exceptions logged in the lookback window.
                  <br />
                  <strong>Recommended pool</strong> = ⌈Active guards × (absence rate + safety buffer)⌉.
                  A 5% safety buffer accounts for unrecorded absences and back-to-back incidents. Adjust the buffer
                  higher for high-risk contracts or lower for stable, long-running sites.
                </p>
              </div>
            </div>

            {/* Per-site deployment table */}
            {r.site_breakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Site Deployment (last 30 days) — {r.site_breakdown.length} active site{r.site_breakdown.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                        {['Site', 'Client', 'Deployed Guards'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                      {r.site_breakdown.map((site) => (
                        <tr key={site.site_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <Building2 className="w-4 h-4 text-slate-400 inline mr-1.5" />
                            {site.site_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {site.client_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{
                                    width: `${Math.min((site.deployed_guards / (r.active_guards || 1)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{site.deployed_guards}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {r.site_breakdown.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No site assignments found in the last 30 days.</p>
              </div>
            )}

            <p className="text-xs text-slate-400 text-right">
              Data as of {r.as_of}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
