'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { rosterApi, clientsApi } from '@/services/api'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

interface DayData {
  date: string
  required: number
  assigned: number
  gap: number
  fill_rate: number | null
  shifts: number
  status: 'full' | 'partial' | 'empty' | 'no_shifts'
}

interface SiteCoverage {
  site_id: number
  site_name: string
  client_name: string
  total_required: number
  total_assigned: number
  overall_fill_rate: number | null
  days: DayData[]
}

interface CoverageData {
  period_start: string
  period_end: string
  dates: string[]
  sites: SiteCoverage[]
}

interface ClientOption {
  client_id: number
  client_name: string
}

const STATUS_COLORS: Record<string, string> = {
  full: 'bg-green-500',
  partial: 'bg-amber-400',
  empty: 'bg-red-500',
  no_shifts: 'bg-slate-200 dark:bg-slate-700',
}

const STATUS_HOVER: Record<string, string> = {
  full: 'hover:bg-green-600',
  partial: 'hover:bg-amber-500',
  empty: 'hover:bg-red-600',
  no_shifts: 'hover:bg-slate-300 dark:hover:bg-slate-600',
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function formatDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-ZA', { weekday: 'short' })
}

function isWeekend(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00')
  return d.getDay() === 0 || d.getDay() === 6
}

export default function SiteCoverageCalendarPage() {
  const [data, setData] = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: DayData; siteName: string } | null>(null)

  // Date range: default 14 days starting today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [periodDays, setPeriodDays] = useState(14)

  const endDate = useMemo(() => {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + periodDays - 1)
    return d.toISOString().split('T')[0]
  }, [startDate, periodDays])

  // Fetch clients
  useEffect(() => {
    clientsApi.getAll().then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.clients ?? []
      setClients(data)
    }).catch(() => {})
  }, [])

  // Fetch coverage
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params: any = { start_date: startDate, end_date: endDate }
        if (selectedClient) params.client_id = Number(selectedClient)
        const res = await rosterApi.getSiteCoverageCalendar(params)
        setData(res.data)
      } catch (err) {
        console.error('Failed to load coverage:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate, selectedClient])

  const shiftPeriod = (days: number) => {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setStartDate(d.toISOString().split('T')[0])
  }

  // Overall summary
  const summary = useMemo(() => {
    if (!data?.sites.length) return null
    let totalReq = 0, totalAsgn = 0, gapDays = 0, fullDays = 0
    for (const site of data.sites) {
      for (const day of site.days) {
        if (day.shifts > 0) {
          totalReq += day.required
          totalAsgn += day.assigned
          if (day.status === 'full') fullDays++
          if (day.gap > 0) gapDays++
        }
      }
    }
    return {
      totalRequired: totalReq,
      totalAssigned: totalAsgn,
      overallFill: totalReq > 0 ? Math.round((totalAsgn / totalReq) * 100) : 0,
      gapDays,
      fullDays,
      sites: data.sites.length,
    }
  }, [data])

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Site Coverage Calendar
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Visual staffing coverage across all sites
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={21}>21 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3">
          <button onClick={() => shiftPeriod(-periodDays)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-purple-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatDateShort(startDate)} — {formatDateShort(endDate)}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <button onClick={() => shiftPeriod(periodDays)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Overall Fill Rate</p>
              <p className={`text-3xl font-bold mt-1 ${summary.overallFill >= 90 ? 'text-green-600' : summary.overallFill >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {summary.overallFill}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Guards Needed</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.totalRequired}</p>
              <p className="text-xs text-slate-400 mt-1">{summary.totalAssigned} assigned</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Days with Gaps</p>
              <p className={`text-3xl font-bold mt-1 ${summary.gapDays > 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.gapDays}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sites Tracked</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.sites}</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500" /> Fully Staffed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400" /> Partially Staffed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" /> No Coverage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" /> No Shifts
          </span>
        </div>

        {/* Coverage heatmap grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Loading coverage data...
          </div>
        ) : !data || data.sites.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No shifts found for this period</p>
            <p className="text-xs text-slate-400 mt-1">Try extending the date range or selecting a different client.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto relative">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="sticky left-0 z-10 bg-white dark:bg-slate-800 px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[180px]">
                    Site
                  </th>
                  {data.dates.map((d) => (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center text-xs font-medium min-w-[44px] ${
                        isWeekend(d)
                          ? 'text-purple-500 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div>{formatDay(d)}</div>
                      <div className="font-normal">{d.slice(8)}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[70px]">
                    Fill %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {data.sites.map((site) => (
                  <tr key={site.site_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 px-4 py-2.5 border-r border-slate-100 dark:border-slate-700">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={site.site_name}>
                        {site.site_name}
                      </div>
                      {site.client_name && (
                        <div className="text-xs text-slate-400 truncate max-w-[170px]">{site.client_name}</div>
                      )}
                    </td>
                    {site.days.map((day) => (
                      <td
                        key={day.date}
                        className={`px-0.5 py-1.5 text-center ${isWeekend(day.date) ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}`}
                        onMouseEnter={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect()
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, day, siteName: site.site_name })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div
                          className={`mx-auto w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold transition-colors cursor-default ${STATUS_COLORS[day.status]} ${STATUS_HOVER[day.status]} ${
                            day.status === 'no_shifts'
                              ? 'text-slate-400 dark:text-slate-500'
                              : day.status === 'full'
                                ? 'text-white'
                                : 'text-white'
                          }`}
                        >
                          {day.shifts > 0 ? (
                            day.status === 'full' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              day.gap
                            )
                          ) : (
                            '—'
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center">
                      {site.overall_fill_rate !== null ? (
                        <span className={`font-semibold ${
                          site.overall_fill_rate >= 90 ? 'text-green-600' : site.overall_fill_rate >= 70 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {site.overall_fill_rate}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tooltip */}
            {tooltip && tooltip.day.shifts > 0 && (
              <div
                className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
                style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
              >
                <div className="font-semibold">{tooltip.siteName}</div>
                <div className="text-slate-300">{formatDateShort(tooltip.day.date)}</div>
                <div className="mt-1 space-y-0.5">
                  <div>Required: {tooltip.day.required}</div>
                  <div>Assigned: {tooltip.day.assigned}</div>
                  {tooltip.day.gap > 0 && (
                    <div className="text-red-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Gap: {tooltip.day.gap}
                    </div>
                  )}
                  {tooltip.day.fill_rate !== null && <div>Fill: {tooltip.day.fill_rate}%</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
