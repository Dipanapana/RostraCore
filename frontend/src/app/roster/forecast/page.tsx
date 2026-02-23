'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { rosterApi } from '@/services/api'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteForecast {
  site_id: number
  site_name: string
  client_id: number | null
  client_name: string | null
  total_shifts: number
  filled_shifts: number
  unfilled_shifts: number
  fill_rate_pct: number
  total_hours: number
  confirmed_cost: number
  pending_cost: number
  total_wage_cost: number
  projected_revenue: number
  projected_profit: number
  profit_margin_pct: number
  margin_status: 'green' | 'amber' | 'red'
  target_margin_pct: number | null
}

interface ForecastSummary {
  total_shifts: number
  filled_shifts: number
  unfilled_shifts: number
  fill_rate_pct: number
  total_hours: number
  total_wage_cost: number
  projected_revenue: number
  projected_profit: number
  profit_margin_pct: number
}

interface BudgetComparison {
  budget_limit: number
  total_wage_cost: number
  variance: number
  status: 'under_budget' | 'over_budget'
  pct_used: number
}

interface ForecastResult {
  period_start: string
  period_end: string
  summary: ForecastSummary
  budget_comparison: BudgetComparison | null
  sites: SiteForecast[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function marginBadge(status: string, pct: number) {
  const cfg: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[status] ?? cfg.red}`}>
      {pct.toFixed(1)}%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostForecastPage() {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 6)

  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(nextWeek.toISOString().slice(0, 10))
  const [budgetInput, setBudgetInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)
    try {
      const params: any = { start_date: startDate, end_date: endDate }
      if (budgetInput) params.budget_limit = Number(budgetInput)
      const res = await rosterApi.getCostForecast(params)
      setForecast(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load cost forecast')
    } finally {
      setLoading(false)
    }
  }

  const s = forecast?.summary

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-500" />
            Roster Cost Forecast
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Project wage costs and billing revenue for any roster period before publishing.
          </p>
        </div>

        {/* Filter panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Wage Budget (optional)
              </label>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="e.g. 50000"
                min={0}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 w-36"
              />
            </div>
            <button
              onClick={handleRun}
              disabled={loading || !startDate || !endDate}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {loading ? 'Calculating…' : 'Run Forecast'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>

        {forecast && s && (
          <>
            {/* Budget comparison banner */}
            {forecast.budget_comparison && (
              <div
                className={`rounded-xl border p-4 flex items-center gap-4 ${
                  forecast.budget_comparison.status === 'under_budget'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {forecast.budget_comparison.status === 'under_budget' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      forecast.budget_comparison.status === 'under_budget'
                        ? 'text-emerald-800'
                        : 'text-red-700'
                    }`}
                  >
                    {forecast.budget_comparison.status === 'under_budget'
                      ? `Under budget — saving ${fmt(forecast.budget_comparison.variance)}`
                      : `Over budget by ${fmt(Math.abs(forecast.budget_comparison.variance))}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Wage cost {fmt(forecast.budget_comparison.total_wage_cost)} vs budget{' '}
                    {fmt(forecast.budget_comparison.budget_limit)} ({forecast.budget_comparison.pct_used}% used)
                  </p>
                </div>
                {/* Budget progress bar */}
                <div className="w-40 hidden sm:block">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        forecast.budget_comparison.status === 'under_budget'
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(forecast.budget_comparison.pct_used, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 text-right">
                    {forecast.budget_comparison.pct_used}%
                  </p>
                </div>
              </div>
            )}

            {/* Summary KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Wage Cost',
                  value: fmt(s.total_wage_cost),
                  icon: DollarSign,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Projected Revenue',
                  value: fmt(s.projected_revenue),
                  icon: TrendingUp,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Total Hours',
                  value: `${s.total_hours.toFixed(0)}h`,
                  icon: Clock,
                  color: 'text-blue-500',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Fill Rate',
                  value: `${s.fill_rate_pct}%`,
                  sub: `${s.filled_shifts}/${s.total_shifts} shifts`,
                  icon: Users,
                  color: s.fill_rate_pct >= 90 ? 'text-emerald-500' : s.fill_rate_pct >= 70 ? 'text-amber-500' : 'text-red-500',
                  bg: s.fill_rate_pct >= 90 ? 'bg-emerald-50' : s.fill_rate_pct >= 70 ? 'bg-amber-50' : 'bg-red-50',
                },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Profit margin summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-6">
              {s.profit_margin_pct >= 30 ? (
                <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Projected profit for period:{' '}
                  <span className={s.projected_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {fmt(s.projected_profit)}
                  </span>
                  {' '}at{' '}
                  <span className="font-bold">{s.profit_margin_pct.toFixed(1)}%</span> margin
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Revenue {fmt(s.projected_revenue)} − Wages {fmt(s.total_wage_cost)}
                </p>
              </div>
            </div>

            {/* Per-site breakdown table */}
            {forecast.sites.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No shifts found for this period.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Per-Site Breakdown — {forecast.sites.length} site{forecast.sites.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Site', 'Client', 'Shifts', 'Fill %', 'Hours', 'Wage Cost', 'Revenue', 'Margin'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {forecast.sites.map((site) => (
                        <tr key={site.site_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                            {site.site_name}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {site.client_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-gray-800">{site.filled_shifts}</span>
                            <span className="text-gray-400">/{site.total_shifts}</span>
                            {site.unfilled_shifts > 0 && (
                              <span className="ml-1.5 text-xs text-red-500">({site.unfilled_shifts} open)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    site.fill_rate_pct >= 90
                                      ? 'bg-emerald-500'
                                      : site.fill_rate_pct >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${site.fill_rate_pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">
                                {site.fill_rate_pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {site.total_hours.toFixed(0)}h
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {fmt(site.total_wage_cost)}
                            </span>
                            {site.pending_cost > 0 && (
                              <span className="block text-xs text-amber-500">
                                {fmt(site.pending_cost)} pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {fmt(site.projected_revenue)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {marginBadge(site.margin_status, site.profit_margin_pct)}
                            {site.target_margin_pct != null && (
                              <span className="block text-xs text-gray-400 mt-0.5">
                                target: {site.target_margin_pct}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                        <td className="px-4 py-3 text-gray-800" colSpan={2}>
                          Total
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {s.filled_shifts}/{s.total_shifts}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {s.fill_rate_pct}%
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {s.total_hours.toFixed(0)}h
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {fmt(s.total_wage_cost)}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {fmt(s.projected_revenue)}
                        </td>
                        <td className="px-4 py-3">
                          {marginBadge(
                            s.profit_margin_pct >= 30 ? 'green' : s.profit_margin_pct >= 15 ? 'amber' : 'red',
                            s.profit_margin_pct
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state before first run */}
        {!forecast && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Set dates and run the forecast
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Pick a date range, optionally enter a wage budget, then click Run Forecast to see
              projected costs and margins per site.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
