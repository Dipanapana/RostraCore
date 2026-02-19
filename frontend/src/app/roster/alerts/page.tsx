'use client'

import { useState, useEffect, useCallback } from 'react'
import { rosterApi, sitesApi, clientsApi } from '@/services/api'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Filter,
  Clock,
} from 'lucide-react'

interface PostingAlert {
  shift_id: number
  site_id: number
  site_name: string
  client_id: number | null
  client_name: string | null
  shift_start: string
  shift_end: string
  required_staff: number
  assigned_staff: number
  gap: number
  severity: 'critical' | 'warning' | 'over_posted'
  hours_until_start: number
}

interface AlertSummary {
  critical: number
  warning: number
  over_posted: number
  ok: number
  total_shifts: number
}

interface AlertsResponse {
  as_of: string
  period_start: string
  period_end: string
  summary: AlertSummary
  alerts: PostingAlert[]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function plusDays(iso: string, n: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatShiftTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    description: 'No guards assigned — shift starts within 24 h',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    icon: AlertCircle,
  },
  warning: {
    label: 'Under-posted',
    description: 'Fewer guards assigned than required',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    icon: AlertTriangle,
  },
  over_posted: {
    label: 'Over-posted',
    description: 'More guards assigned than required',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    icon: TrendingUp,
  },
}

export default function PostingAlertsPage() {
  const today = todayISO()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(plusDays(today, 6))
  const [siteFilter, setSiteFilter] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const [data, setData] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sites, setSites] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  // Load filter options
  useEffect(() => {
    Promise.allSettled([sitesApi.getAll(), clientsApi.getAll()]).then(([sitesRes, clientsRes]) => {
      if (sitesRes.status === 'fulfilled') setSites(sitesRes.value.data || [])
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data || [])
    })
  }, [])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { start_date: startDate, end_date: endDate }
      if (siteFilter) params.site_id = Number(siteFilter)
      if (clientFilter) params.client_id = Number(clientFilter)
      const res = await rosterApi.getPostingAlerts(params)
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load posting alerts')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, siteFilter, clientFilter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const filteredAlerts = data?.alerts.filter((a) =>
    severityFilter === 'all' || a.severity === severityFilter
  ) ?? []

  const totalAlerts = data ? data.summary.critical + data.summary.warning + data.summary.over_posted : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Posting Alerts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time over/under-staffing alerts across all sites
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical only</option>
              <option value="warning">Under-posted only</option>
              <option value="over_posted">Over-posted only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Shifts</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.summary.total_shifts}</p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 dark:text-red-400">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{data.summary.critical}</p>
            <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">0 guards, starts ≤24h</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Under-posted</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{data.summary.warning}</p>
            <p className="text-xs text-amber-500/70 dark:text-amber-400/60 mt-0.5">Fewer than required</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-600 dark:text-blue-400">Over-posted</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{data.summary.over_posted}</p>
            <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-0.5">More than required</p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Correctly Posted</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data.summary.ok}</p>
            <p className="text-xs text-emerald-500/70 dark:text-emerald-400/60 mt-0.5">Exactly as required</p>
          </div>
        </div>
      )}

      {/* All clear */}
      {data && totalAlerts === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All shifts correctly posted</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            No over or under-posting issues found for {data.period_start} – {data.period_end}
          </p>
        </div>
      )}

      {/* Alert table */}
      {filteredAlerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {severityFilter === 'all' ? 'All Alerts' : SEVERITY_CONFIG[severityFilter as keyof typeof SEVERITY_CONFIG]?.label}
              <span className="ml-2 text-sm font-normal text-slate-400">({filteredAlerts.length})</span>
            </h2>
            {data && (
              <p className="text-xs text-slate-400">
                As of {new Date(data.as_of).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-white/5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Shift Start</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3 text-center">Assigned</th>
                  <th className="px-4 py-3 text-center">Gap</th>
                  <th className="px-4 py-3 text-left">Starts In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredAlerts.map((alert) => {
                  const cfg = SEVERITY_CONFIG[alert.severity]
                  const Icon = cfg.icon
                  const hoursUntil = alert.hours_until_start
                  const timeLabel =
                    hoursUntil < 0
                      ? 'Started'
                      : hoursUntil < 1
                      ? `${Math.round(hoursUntil * 60)}m`
                      : hoursUntil < 24
                      ? `${hoursUntil.toFixed(1)}h`
                      : `${Math.round(hoursUntil / 24)}d`

                  return (
                    <tr key={alert.shift_id} className={`${cfg.bg} hover:opacity-90 transition-opacity`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                        {alert.site_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {alert.client_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatShiftTime(alert.shift_start)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {alert.required_staff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${alert.assigned_staff === 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {alert.assigned_staff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${alert.gap < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {alert.gap > 0 ? `+${alert.gap}` : alert.gap}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          hoursUntil <= 0 ? 'text-slate-400' :
                          hoursUntil <= 2 ? 'text-red-600 dark:text-red-400' :
                          hoursUntil <= 24 ? 'text-amber-600 dark:text-amber-400' :
                          'text-slate-500 dark:text-slate-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  )
}
