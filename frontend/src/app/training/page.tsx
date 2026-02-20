'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap, Plus, Search, X, Trash2, Edit2,
  BookOpen, Users, CheckCircle, Clock, AlertTriangle,
  BarChart3, Shield,
} from 'lucide-react'
import { trainingApi, employeesApi } from '@/services/api'

// ── helpers ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'induction', 'firearms', 'first_aid', 'psira', 'fire_safety',
  'access_control', 'cctv', 'customer_service', 'health_safety', 'refresher', 'other',
]

const CAT_LABELS: Record<string, string> = {
  induction: 'Induction', firearms: 'Firearms', first_aid: 'First Aid',
  psira: 'PSIRA', fire_safety: 'Fire Safety', access_control: 'Access Control',
  cctv: 'CCTV', customer_service: 'Customer Service', health_safety: 'Health & Safety',
  refresher: 'Refresher', other: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed',
  failed: 'Failed', cancelled: 'Cancelled',
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-amber-500/20 text-amber-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-slate-500/20 text-slate-400',
  }
  return m[s] || 'bg-slate-500/20 text-slate-400'
}

function catBadge(c: string) {
  const m: Record<string, string> = {
    induction: 'bg-blue-500/20 text-blue-400',
    firearms: 'bg-red-500/20 text-red-400',
    first_aid: 'bg-green-500/20 text-green-400',
    psira: 'bg-purple-500/20 text-purple-400',
    fire_safety: 'bg-orange-500/20 text-orange-400',
    access_control: 'bg-cyan-500/20 text-cyan-400',
    cctv: 'bg-indigo-500/20 text-indigo-400',
    customer_service: 'bg-pink-500/20 text-pink-400',
    health_safety: 'bg-yellow-500/20 text-yellow-400',
    refresher: 'bg-teal-500/20 text-teal-400',
  }
  return m[c] || 'bg-slate-500/20 text-slate-400'
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── component ──────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [tab, setTab] = useState<'courses' | 'records' | 'dashboard'>('records')

  // Data
  const [courses, setCourses] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [dashboard, setDashboard] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editCourse, setEditCourse] = useState<any>(null)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)

  // Course form
  const [courseForm, setCourseForm] = useState({
    name: '', category: 'other', description: '', provider: '',
    duration_hours: '', is_mandatory: false, validity_months: '',
  })

  // Record form
  const [recordForm, setRecordForm] = useState({
    course_id: '', employee_id: '', status: 'scheduled',
    scheduled_date: '', completed_date: '', score: '',
    certificate_number: '', expires_at: '', notes: '',
  })

  // ── loaders ──

  const loadCourses = useCallback(async () => {
    try {
      const params: any = { active_only: true }
      if (search && tab === 'courses') params.search = search
      if (catFilter) params.category = catFilter
      const { data } = await trainingApi.listCourses(params)
      setCourses(data.items || [])
    } catch { /* ignore */ }
  }, [search, catFilter, tab])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search && tab === 'records') params.search = search
      if (statusFilter) params.status = statusFilter
      if (employeeFilter) params.employee_id = Number(employeeFilter)
      const { data } = await trainingApi.listRecords(params)
      setRecords(data.items || [])
      setRecordsTotal(data.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [search, statusFilter, employeeFilter, tab])

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await trainingApi.dashboard()
      setDashboard(data)
    } catch { /* ignore */ }
  }, [])

  const loadEmployees = useCallback(async () => {
    try {
      const { data } = await employeesApi.getAll({ status: 'active', limit: 1000 })
      setEmployees(data.employees || data.items || data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadCourses(); loadRecords(); loadDashboard(); loadEmployees() }, [loadCourses, loadRecords, loadDashboard, loadEmployees])

  // ── course actions ──

  const openCreateCourse = () => {
    setEditCourse(null)
    setCourseForm({ name: '', category: 'other', description: '', provider: '', duration_hours: '', is_mandatory: false, validity_months: '' })
    setShowCourseModal(true)
  }

  const openEditCourse = (c: any) => {
    setEditCourse(c)
    setCourseForm({
      name: c.name || '', category: c.category || 'other', description: c.description || '',
      provider: c.provider || '', duration_hours: c.duration_hours ? String(c.duration_hours) : '',
      is_mandatory: c.is_mandatory || false, validity_months: c.validity_months ? String(c.validity_months) : '',
    })
    setShowCourseModal(true)
  }

  const handleCourseSubmit = async () => {
    try {
      const payload: any = {
        name: courseForm.name,
        category: courseForm.category,
        description: courseForm.description || null,
        provider: courseForm.provider || null,
        duration_hours: courseForm.duration_hours ? Number(courseForm.duration_hours) : null,
        is_mandatory: courseForm.is_mandatory,
        validity_months: courseForm.validity_months ? Number(courseForm.validity_months) : null,
      }
      if (editCourse) {
        await trainingApi.updateCourse(editCourse.course_id, payload)
      } else {
        await trainingApi.createCourse(payload)
      }
      setShowCourseModal(false)
      loadCourses()
      loadDashboard()
    } catch { /* ignore */ }
  }

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Deactivate this course?')) return
    try { await trainingApi.deleteCourse(id); loadCourses(); loadDashboard() } catch { /* ignore */ }
  }

  // ── record actions ──

  const openCreateRecord = () => {
    setEditRecord(null)
    setRecordForm({ course_id: '', employee_id: '', status: 'scheduled', scheduled_date: '', completed_date: '', score: '', certificate_number: '', expires_at: '', notes: '' })
    setShowRecordModal(true)
  }

  const openEditRecord = (r: any) => {
    setEditRecord(r)
    setRecordForm({
      course_id: String(r.course_id), employee_id: String(r.employee_id), status: r.status || 'scheduled',
      scheduled_date: r.scheduled_date ? r.scheduled_date.slice(0, 10) : '',
      completed_date: r.completed_date ? r.completed_date.slice(0, 10) : '',
      score: r.score != null ? String(r.score) : '',
      certificate_number: r.certificate_number || '',
      expires_at: r.expires_at ? r.expires_at.slice(0, 10) : '',
      notes: r.notes || '',
    })
    setShowRecordModal(true)
  }

  const handleRecordSubmit = async () => {
    try {
      const payload: any = {
        course_id: Number(recordForm.course_id),
        employee_id: Number(recordForm.employee_id),
        status: recordForm.status,
        scheduled_date: recordForm.scheduled_date || null,
        completed_date: recordForm.completed_date || null,
        score: recordForm.score ? Number(recordForm.score) : null,
        certificate_number: recordForm.certificate_number || null,
        expires_at: recordForm.expires_at || null,
        notes: recordForm.notes || null,
      }
      if (editRecord) {
        await trainingApi.updateRecord(editRecord.record_id, payload)
      } else {
        await trainingApi.createRecord(payload)
      }
      setShowRecordModal(false)
      loadRecords()
      loadDashboard()
    } catch { /* ignore */ }
  }

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Delete this training record?')) return
    try { await trainingApi.deleteRecord(id); loadRecords(); loadDashboard() } catch { /* ignore */ }
  }

  // ── render ──

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-blue-400" /> Training Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Courses, employee records, and compliance tracking</p>
        </div>
        <div className="flex gap-2">
          {tab === 'courses' && (
            <button onClick={openCreateCourse} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Course
            </button>
          )}
          {tab === 'records' && (
            <button onClick={openCreateRecord} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Record
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {(['records', 'courses', 'dashboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── RECORDS TAB ── */}
      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course name…" className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Employees</option>
              {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Course</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Scheduled</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Completed</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Score</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Expires</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No training records found</td></tr>
                  ) : records.map((r: any) => (
                    <tr key={r.record_id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{r.employee_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{r.course_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${catBadge(r.course_category)}`}>
                          {CAT_LABELS[r.course_category] || r.course_category || 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{fmtDate(r.scheduled_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtDate(r.completed_date)}</td>
                      <td className="px-4 py-3 text-slate-400">{r.score != null ? `${r.score}%` : '—'}</td>
                      <td className="px-4 py-3">
                        {r.expires_at ? (
                          <span className={`text-xs font-medium ${new Date(r.expires_at) <= new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                            {fmtDate(r.expires_at)}
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditRecord(r)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRecord(r.record_id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recordsTotal > 0 && (
              <div className="px-4 py-3 border-t border-slate-700 text-sm text-slate-400">
                Showing {records.length} of {recordsTotal} records
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COURSES TAB ── */}
      {tab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…" className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">No courses found. Create your first training course.</div>
            ) : courses.map((c: any) => (
              <div key={c.course_id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{c.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${catBadge(c.category)}`}>
                      {CAT_LABELS[c.category] || c.category}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => openEditCourse(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCourse(c.course_id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {c.description && <p className="text-slate-400 text-xs mb-3 line-clamp-2">{c.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  {c.provider && <span className="bg-slate-700/50 px-2 py-0.5 rounded">{c.provider}</span>}
                  {c.duration_hours && <span className="bg-slate-700/50 px-2 py-0.5 rounded">{c.duration_hours}h</span>}
                  {c.validity_months && <span className="bg-slate-700/50 px-2 py-0.5 rounded">Valid {c.validity_months}mo</span>}
                  {c.is_mandatory && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-medium">Mandatory</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Records', value: dashboard.total_records, icon: BookOpen, colour: 'blue' },
              { label: 'Completed', value: dashboard.completed, icon: CheckCircle, colour: 'green' },
              { label: 'Scheduled', value: dashboard.scheduled, icon: Clock, colour: 'amber' },
              { label: 'Compliance', value: `${dashboard.compliance_pct}%`, icon: Shield, colour: 'purple' },
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs font-medium">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 text-${kpi.colour}-400`} />
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Status + Expiry row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'In Progress', value: dashboard.in_progress, colour: 'text-amber-400' },
              { label: 'Failed', value: dashboard.failed, colour: 'text-red-400' },
              { label: 'Expiring Soon', value: dashboard.expiring_soon, colour: 'text-orange-400' },
              { label: 'Expired', value: dashboard.expired, colour: 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${item.colour}`}>{item.value}</p>
                <p className="text-slate-400 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* By Category */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" /> Records by Category
              </h3>
              {(dashboard.by_category || []).length === 0 ? (
                <p className="text-slate-500 text-sm">No training records yet</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.by_category.map(([cat, count]: [string, number]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300">{CAT_LABELS[cat] || cat}</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count / dashboard.total_records) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" /> Overview
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{dashboard.total_courses}</p>
                    <p className="text-slate-400 text-xs">Active Courses</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{dashboard.mandatory_courses}</p>
                    <p className="text-slate-400 text-xs">Mandatory Courses</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{dashboard.total_employees}</p>
                    <p className="text-slate-400 text-xs">Active Employees</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{dashboard.compliance_pct}%</p>
                    <p className="text-slate-400 text-xs">Mandatory Compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COURSE MODAL ── */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCourseModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{editCourse ? 'Edit Course' : 'Add Course'}</h2>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Course Name *</label>
                <input value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Firearms Competency" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category</label>
                  <select value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Provider</label>
                  <input value={courseForm.provider} onChange={e => setCourseForm({ ...courseForm, provider: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. SAPS" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Duration (hours)</label>
                  <input type="number" value={courseForm.duration_hours} onChange={e => setCourseForm({ ...courseForm, duration_hours: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Validity (months)</label>
                  <input type="number" value={courseForm.validity_months} onChange={e => setCourseForm({ ...courseForm, validity_months: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. 12" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={courseForm.is_mandatory} onChange={e => setCourseForm({ ...courseForm, is_mandatory: e.target.checked })} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-300">Mandatory for all employees</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowCourseModal(false)} className="px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCourseSubmit} disabled={!courseForm.name} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {editCourse ? 'Save Changes' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD MODAL ── */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRecordModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{editRecord ? 'Edit Record' : 'Enrol Employee'}</h2>
              <button onClick={() => setShowRecordModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Employee *</label>
                <select value={recordForm.employee_id} onChange={e => setRecordForm({ ...recordForm, employee_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select employee…</option>
                  {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Course *</label>
                <select value={recordForm.course_id} onChange={e => setRecordForm({ ...recordForm, course_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select course…</option>
                  {courses.map((c: any) => <option key={c.course_id} value={c.course_id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select value={recordForm.status} onChange={e => setRecordForm({ ...recordForm, status: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Score (%)</label>
                  <input type="number" min="0" max="100" value={recordForm.score} onChange={e => setRecordForm({ ...recordForm, score: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Scheduled Date</label>
                  <input type="date" value={recordForm.scheduled_date} onChange={e => setRecordForm({ ...recordForm, scheduled_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Completed Date</label>
                  <input type="date" value={recordForm.completed_date} onChange={e => setRecordForm({ ...recordForm, completed_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Certificate Number</label>
                  <input value={recordForm.certificate_number} onChange={e => setRecordForm({ ...recordForm, certificate_number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Expires At</label>
                  <input type="date" value={recordForm.expires_at} onChange={e => setRecordForm({ ...recordForm, expires_at: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowRecordModal(false)} className="px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleRecordSubmit} disabled={!recordForm.course_id || !recordForm.employee_id} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {editRecord ? 'Save Changes' : 'Enrol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
