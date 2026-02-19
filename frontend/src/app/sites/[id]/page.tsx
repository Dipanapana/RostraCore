'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  MapPin,
  Navigation,
  Users,
  Clock,
  Banknote,
  Shield,
  Pencil,
  AlertTriangle,
  Route,
  Activity,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { sitesApi, shiftsApi, incidentsApi, patrolsApi, attendanceApi } from '@/services/api'
import { Site } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShiftRecord {
  shift_id: number
  start_time: string
  end_time: string
  required_skill?: string
  status: string
  is_overtime?: boolean
  notes?: string
}

interface IncidentRecord {
  id?: number
  incident_id?: number
  incident_type: string
  description: string
  severity: string
  status: string
  reported_at: string
}

interface PatrolTour {
  tour_id: number
  tour_name: string
  total_checkpoints?: number
  checkpoint_count?: number
  is_active?: boolean
}

interface AttendanceRecord {
  employee_name?: string
  employee_id: number
  check_in_time?: string
  check_out_time?: string
  attendance_status: string
  shift_date: string
  is_late?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), 'd MMM yyyy') } catch { return iso }
}

function fmtTime(iso: string): string {
  try { return format(parseISO(iso), 'HH:mm') } catch { return iso }
}

function fmtDateShort(iso: string): string {
  try { return format(parseISO(iso), 'd MMM') } catch { return iso }
}

const SEVERITY_CLASS: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  critical: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
}

const SHIFT_STATUS_CLASS: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  in_progress: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  completed: 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-500',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
}

const ATTEND_STATUS_CLASS: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  no_show: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  scheduled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{message}</div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const siteId = Number(id)

  const [site, setSite] = useState<Site | null>(null)
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [tours, setTours] = useState<PatrolTour[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId) return

    async function load() {
      setLoading(true)
      const [siteRes, shiftsRes, incidentsRes, toursRes, attendanceRes] = await Promise.allSettled([
        sitesApi.getById(siteId),
        shiftsApi.getAll({ site_id: siteId, limit: 10 }),
        incidentsApi.list({ site_id: siteId, limit: 5 }),
        patrolsApi.listTours({ site_id: siteId }),
        attendanceApi.getRecords({ site_id: siteId, limit: 8 }),
      ])

      if (siteRes.status === 'fulfilled') {
        setSite(siteRes.value.data)
      } else {
        setError('Site not found.')
        setLoading(false)
        return
      }

      if (shiftsRes.status === 'fulfilled') {
        const data = shiftsRes.value.data
        setShifts(Array.isArray(data) ? data : data?.shifts ?? [])
      }
      if (incidentsRes.status === 'fulfilled') {
        const data = incidentsRes.value.data
        setIncidents(Array.isArray(data) ? data : data?.incidents ?? [])
      }
      if (toursRes.status === 'fulfilled') {
        const data = toursRes.value.data
        setTours(Array.isArray(data) ? data : data?.tours ?? [])
      }
      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value.data
        setAttendance(Array.isArray(data) ? data : data?.records ?? [])
      }

      setLoading(false)
    }

    load()
  }, [siteId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !site) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <p className="text-slate-500 dark:text-slate-400">{error ?? 'Site not found.'}</p>
          <Link href="/sites" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm">
            ← Back to Sites
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const openIncidents = incidents.filter((i) => !['resolved', 'closed'].includes(i.status)).length
  const mapsUrl = site.gps_lat && site.gps_lng
    ? `https://www.google.com/maps?q=${site.gps_lat},${site.gps_lng}`
    : null

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Hero card */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
              <MapPin className="w-8 h-8 text-white" />
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{site.site_name}</h1>
                {site.required_skill && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                    {site.required_skill.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{site.client_name}</p>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{site.address || 'No address'}</span>
                </div>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline">
                    <Navigation className="w-4 h-4" />
                    <span>Open in Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Edit action */}
            <Link
              href={`/sites`}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit Site
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Min Staff</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                {site.min_staff}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Billing Rate</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-500" />
                {site.billing_rate ? `R${site.billing_rate}/hr` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Shift Pattern</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-500" />
                {site.shift_pattern || 'Standard'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Open Incidents</p>
              <p className={`text-lg font-bold flex items-center gap-1.5 ${openIncidents > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                <AlertTriangle className={`w-4 h-4 ${openIncidents > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                {openIncidents}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Shifts */}
          <Section title="Upcoming Shifts" icon={Clock}>
            {shifts.length === 0 ? (
              <EmptyRow message="No shifts found for this site." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="pb-2 text-left font-semibold">Date</th>
                      <th className="pb-2 text-left font-semibold">Time</th>
                      <th className="pb-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {shifts.map((s) => (
                      <tr key={s.shift_id}>
                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                          {fmtDateShort(s.start_time)}
                          {s.is_overtime && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold">OT</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-400">
                          {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_STATUS_CLASS[s.status] ?? SHIFT_STATUS_CLASS.planned}`}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Recent Attendance */}
          <Section title="Recent Attendance" icon={Activity}>
            {attendance.length === 0 ? (
              <EmptyRow message="No attendance records for this site." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="pb-2 text-left font-semibold">Guard</th>
                      <th className="pb-2 text-left font-semibold">Date</th>
                      <th className="pb-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {attendance.map((a, i) => (
                      <tr key={i}>
                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                          {a.employee_name ?? `Guard #${a.employee_id}`}
                          {a.is_late && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold">LATE</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-400">
                          {fmtDateShort(a.shift_date)}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ATTEND_STATUS_CLASS[a.attendance_status] ?? ATTEND_STATUS_CLASS.scheduled}`}>
                            {a.attendance_status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Recent Incidents */}
          <Section title="Recent Incidents" icon={AlertTriangle}>
            {incidents.length === 0 ? (
              <EmptyRow message="No incidents reported at this site." />
            ) : (
              <div className="space-y-3">
                {incidents.map((inc, i) => {
                  const incId = inc.incident_id ?? inc.id ?? i
                  const sevClass = SEVERITY_CLASS[inc.severity] ?? SEVERITY_CLASS.low
                  return (
                    <div key={incId} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <span className={`flex-shrink-0 px-2 py-0.5 h-fit rounded text-xs font-bold border ${sevClass}`}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{inc.incident_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{inc.description}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fmtDate(inc.reported_at)}</p>
                      </div>
                      <div className="flex-shrink-0 ml-auto">
                        {['resolved', 'closed'].includes(inc.status) ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Patrol Tours */}
          <Section title="Patrol Tours" icon={Route}>
            {tours.length === 0 ? (
              <EmptyRow message="No patrol tours configured for this site." />
            ) : (
              <div className="space-y-3">
                {tours.map((tour) => (
                  <div key={tour.tour_id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                        <Route className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tour.tour_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tour.total_checkpoints ?? tour.checkpoint_count ?? 0} checkpoint{(tour.total_checkpoints ?? tour.checkpoint_count ?? 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {tour.is_active !== false && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>

        {/* Notes */}
        {site.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Site Notes</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{site.notes}</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
