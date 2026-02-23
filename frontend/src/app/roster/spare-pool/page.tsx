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
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Spare Guard Pool Calculator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Calculates the recommended number of relief/spare guards to keep on standby based on
            your organisation's historical absence rate.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Lookback Period
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setLookbackDays(d)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      lookbackDays === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Safety Buffer %
              </label>
              <input
                type="number"
                value={bufferPct}
                min={0}
                max={30}
                step={0.5}
                onChange={(e) => setBufferPct(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24"
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
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
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
                  color: 'text-gray-600',
                  bg: 'bg-gray-50',
                  sub: 'currently deployed',
                },
                {
                  label: 'Absence Rate',
                  value: `${r.absence_stats.absence_rate_pct}%`,
                  icon: TrendingDown,
                  color: r.absence_stats.absence_rate_pct >= 10 ? 'text-red-500' : r.absence_stats.absence_rate_pct >= 5 ? 'text-amber-500' : 'text-emerald-500',
                  bg: r.absence_stats.absence_rate_pct >= 10 ? 'bg-red-50' : r.absence_stats.absence_rate_pct >= 5 ? 'bg-amber-50' : 'bg-emerald-50',
                  sub: `last ${r.lookback_days} days`,
                },
                {
                  label: 'Safety Buffer',
                  value: `${r.buffer_pct}%`,
                  icon: ShieldCheck,
                  color: 'text-indigo-500',
                  bg: 'bg-indigo-50',
                  sub: 'extra headroom',
                },
                {
                  label: 'Recommended Pool',
                  value: r.recommended_spare_pool,
                  icon: Users,
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                  sub: `${r.effective_rate_pct}% of headcount`,
                },
              ].map(({ label, value, icon: Icon, color, bg, sub }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Absence breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
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
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Methodology note */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-800">How this is calculated</p>
                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Site Deployment (last 30 days) — {r.site_breakdown.length} active site{r.site_breakdown.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Site', 'Client', 'Deployed Guards'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.site_breakdown.map((site) => (
                        <tr key={site.site_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                            <Building2 className="w-4 h-4 text-gray-400 inline mr-1.5" />
                            {site.site_name}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {site.client_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{
                                    width: `${Math.min((site.deployed_guards / (r.active_guards || 1)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="font-semibold text-gray-800">{site.deployed_guards}</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No site assignments found in the last 30 days.</p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-right">
              Data as of {r.as_of}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
