'use client'

import { useState, useEffect, useCallback } from 'react'
import { darApi, sitesApi, employeesApi } from '@/services/api'
import {
  ClipboardList,
  Plus,
  X,
  Search,
  BarChart3,
  Clock,
  MapPin,
  CheckCircle,
  Eye,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DAR {
  report_id: number
  site_id: number | null
  site_name: string | null
  employee_id: number | null
  employee_name: string | null
  shift_id: number | null
  report_date: string
  shift_start: string | null
  shift_end: string | null
  summary: string
  patrols_completed: number
  incidents_reported: number
  visitors_processed: number
  access_denied_count: number
  notable_events: string | null
  equipment_issues: string | null
  handover_notes: string | null
  status: string
  reviewed_at: string | null
  reviewer_notes: string | null
  created_at: string
}

interface Dashboard {
  period_days: number
  total: number
  submitted: number
  reviewed: number
  total_patrols: number
  total_incidents: number
  total_visitors: number
  total_access_denied: number
  equipment_issues: number
  by_site: { site_id: number; site_name: string; count: number; pending_review: number }[]
  daily_trend: { date: string; count: number }[]
}

interface SiteOption { site_id: number; site_name: string }
interface EmployeeOption { employee_id: number; first_name: string; last_name: string }

export default function DailyActivityPage() {
  const [tab, setTab] = useState<'reports' | 'dashboard'>('reports')

  const [reports, setReports] = useState<DAR[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState(0)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    site_id: 0,
    employee_id: 0,
    report_date: new Date().toISOString().slice(0, 16),
    summary: '',
    patrols_completed: 0,
    incidents_reported: 0,
    visitors_processed: 0,
    access_denied_count: 0,
    notable_events: '',
    equipment_issues: '',
    handover_notes: '',
  })

  const [showReview, setShowReview] = useState<DAR | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name,
      })))
    }).catch(() => {})

    employeesApi.list().then((res) => {
      const data = res.data.employees || res.data.items || res.data || []
      setEmployees(data.map((e: any) => ({
        employee_id: e.employee_id, first_name: e.first_name, last_name: e.last_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 30 }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      if (siteFilter) params.site_id = siteFilter
      const res = await darApi.list(params)
      setReports(res.data.items)
      setTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [statusFilter, searchQuery, siteFilter])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await darApi.dashboard(30)
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'reports') fetchReports()
    else fetchDashboard()
  }, [tab, fetchReports, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.summary) return
    try {
      const payload: any = {
        report_date: createForm.report_date,
        summary: createForm.summary,
        patrols_completed: createForm.patrols_completed,
        incidents_reported: createForm.incidents_reported,
        visitors_processed: createForm.visitors_processed,
        access_denied_count: createForm.access_denied_count,
      }
      if (createForm.site_id) payload.site_id = createForm.site_id
      if (createForm.employee_id) payload.employee_id = createForm.employee_id
      if (createForm.notable_events) payload.notable_events = createForm.notable_events
      if (createForm.equipment_issues) payload.equipment_issues = createForm.equipment_issues
      if (createForm.handover_notes) payload.handover_notes = createForm.handover_notes
      await darApi.create(payload)
      setShowCreate(false)
      setCreateForm({
        site_id: 0, employee_id: 0, report_date: new Date().toISOString().slice(0, 16),
        summary: '', patrols_completed: 0, incidents_reported: 0, visitors_processed: 0,
        access_denied_count: 0, notable_events: '', equipment_issues: '', handover_notes: '',
      })
      fetchReports()
    } catch { /* ignore */ }
  }

  const handleReview = async () => {
    if (!showReview) return
    try {
      await darApi.review(showReview.report_id, { reviewer_notes: reviewNotes || undefined })
      setShowReview(null)
      setReviewNotes('')
      fetchReports()
    } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const statusBadge = (s: string) => {
    if (s === 'reviewed') return 'bg-emerald-50 text-emerald-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Activity Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            Daily shift activity reports submitted by guards
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'reports', label: 'Reports', icon: ClipboardList },
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── REPORTS TAB ──────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
              />
            </div>
            <select value={siteFilter} onChange={(e) => setSiteFilter(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value={0}>All Sites</option>
              {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
            <span className="text-sm text-gray-500">{total} reports (last 30 days)</span>
          </div>

          {/* Reports list */}
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                {loading ? 'Loading...' : 'No daily activity reports found'}
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.report_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                        {r.site_name && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {r.site_name}
                          </span>
                        )}
                        {r.employee_name && (
                          <span className="text-xs text-gray-500">
                            by {r.employee_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900">{r.summary}</p>

                      {/* Activity counts */}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        {r.patrols_completed > 0 && <span>Patrols: {r.patrols_completed}</span>}
                        {r.incidents_reported > 0 && <span className="text-red-500">Incidents: {r.incidents_reported}</span>}
                        {r.visitors_processed > 0 && <span>Visitors: {r.visitors_processed}</span>}
                        {r.access_denied_count > 0 && <span>Denied: {r.access_denied_count}</span>}
                      </div>

                      {r.notable_events && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Notable:</strong> {r.notable_events}
                        </p>
                      )}
                      {r.equipment_issues && (
                        <p className="text-xs text-orange-500 mt-1">
                          <strong>Equipment:</strong> {r.equipment_issues}
                        </p>
                      )}
                      {r.handover_notes && (
                        <p className="text-xs text-blue-500 mt-1">
                          <strong>Handover:</strong> {r.handover_notes}
                        </p>
                      )}
                      {r.reviewer_notes && (
                        <p className="text-xs text-green-600 mt-1">
                          <strong>Review:</strong> {r.reviewer_notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(r.report_date)}
                      </p>
                      {r.status === 'submitted' && (
                        <button
                          onClick={() => { setShowReview(r); setReviewNotes('') }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Review
                        </button>
                      )}
                      {r.status === 'reviewed' && (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <Eye className="w-3 h-3" />
                          Reviewed {r.reviewed_at ? formatDate(r.reviewed_at) : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Reports', value: dashboard.total, color: 'text-blue-600' },
              { label: 'Submitted', value: dashboard.submitted, color: 'text-yellow-600' },
              { label: 'Reviewed', value: dashboard.reviewed, color: 'text-green-600' },
              { label: 'Equipment Issues', value: dashboard.equipment_issues, color: 'text-orange-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Activity totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Patrols', value: dashboard.total_patrols },
              { label: 'Total Incidents', value: dashboard.total_incidents },
              { label: 'Total Visitors', value: dashboard.total_visitors },
              { label: 'Access Denied', value: dashboard.total_access_denied },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Site */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Site</h3>
              {dashboard.by_site.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_site.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{s.site_name}</span>
                      <div className="flex items-center gap-3">
                        {s.pending_review > 0 && (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            {s.pending_review} pending
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Daily Trend (Last 7 Days)</h3>
              {dashboard.daily_trend.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-1">
                  {dashboard.daily_trend.map((d) => {
                    const max = Math.max(...dashboard.daily_trend.map((t) => t.count), 1)
                    return (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20 shrink-0">
                          {new Date(d.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(d.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-6 text-right">{d.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && !dashboard && (
        <div className="text-center py-12 text-gray-400">{loading ? 'Loading...' : 'No data'}</div>
      )}

      {/* ── CREATE MODAL ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Daily Activity Report</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={0}>Select site...</option>
                    {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guard</label>
                  <select value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={0}>Select guard...</option>
                    {employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Date *</label>
                <input type="datetime-local" value={createForm.report_date}
                  onChange={(e) => setCreateForm({ ...createForm, report_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
                <textarea value={createForm.summary} onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Shift summary and key activities..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patrols Completed</label>
                  <input type="number" min={0} value={createForm.patrols_completed}
                    onChange={(e) => setCreateForm({ ...createForm, patrols_completed: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incidents Reported</label>
                  <input type="number" min={0} value={createForm.incidents_reported}
                    onChange={(e) => setCreateForm({ ...createForm, incidents_reported: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visitors Processed</label>
                  <input type="number" min={0} value={createForm.visitors_processed}
                    onChange={(e) => setCreateForm({ ...createForm, visitors_processed: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Denied</label>
                  <input type="number" min={0} value={createForm.access_denied_count}
                    onChange={(e) => setCreateForm({ ...createForm, access_denied_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notable Events</label>
                <textarea value={createForm.notable_events} onChange={(e) => setCreateForm({ ...createForm, notable_events: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Any notable events during the shift..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Issues</label>
                <textarea value={createForm.equipment_issues} onChange={(e) => setCreateForm({ ...createForm, equipment_issues: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Any equipment problems..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handover Notes</label>
                <textarea value={createForm.handover_notes} onChange={(e) => setCreateForm({ ...createForm, handover_notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Notes for the next shift..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.summary}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ─────────────────────────────────────────────────── */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Review Report</h3>
              <button onClick={() => setShowReview(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-900">{showReview.summary}</p>
                {showReview.site_name && (
                  <p className="text-xs text-gray-500 mt-1">Site: {showReview.site_name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Date: {formatDate(showReview.report_date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Notes</label>
                <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Optional review comments..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowReview(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleReview}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Mark as Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
