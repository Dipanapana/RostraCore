'use client'

import { useState, useEffect, useCallback } from 'react'
import { exceptionsApi, sitesApi, employeesApi } from '@/services/api'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react'

interface ShiftException {
  exception_id: number
  shift_id: number | null
  employee_id: number | null
  employee_name: string | null
  site_id: number | null
  site_name: string | null
  exception_type: string
  exception_date: string
  description: string | null
  status: string
  reported_by_name: string | null
  resolved_by_name: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string | null
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  no_show:         { label: 'No Show',          color: 'bg-red-100 text-red-700' },
  late_arrival:    { label: 'Late Arrival',      color: 'bg-amber-100 text-amber-700' },
  early_departure: { label: 'Early Departure',   color: 'bg-orange-100 text-orange-700' },
  awol:            { label: 'AWOL',              color: 'bg-red-50 text-red-700' },
  relief_required: { label: 'Relief Required',   color: 'bg-purple-100 text-purple-700' },
  equipment_issue: { label: 'Equipment Issue',   color: 'bg-gray-100 text-gray-700' },
  other:           { label: 'Other',             color: 'bg-gray-100 text-gray-700' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  open:        { label: 'Open',        color: 'bg-red-100 text-red-700',         icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolved:    { label: 'Resolved',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  escalated:   { label: 'Escalated',   color: 'bg-purple-100 text-purple-700', icon: AlertTriangle },
}

function todayISO() { return new Date().toISOString().split('T')[0] }
function minusDays(iso: string, n: number) {
  const d = new Date(iso); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}

export default function ExceptionsPage() {
  const today = todayISO()

  // Filters
  const [startDate, setStartDate] = useState(minusDays(today, 29))
  const [endDate, setEndDate] = useState(today)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [siteFilter, setSiteFilter] = useState('')

  // Data
  const [exceptions, setExceptions] = useState<ShiftException[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reference data
  const [sites, setSites] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  // Log form
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    exception_type: 'no_show',
    exception_date: today,
    employee_id: '',
    site_id: '',
    shift_id: '',
    description: '',
  })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Resolve modal
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [resolveStatus, setResolveStatus] = useState('resolved')
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveSaving, setResolveSaving] = useState(false)

  // Load reference data
  useEffect(() => {
    Promise.allSettled([sitesApi.getAll(), employeesApi.getAll()]).then(([s, e]) => {
      if (s.status === 'fulfilled') setSites(s.value.data || [])
      if (e.status === 'fulfilled') setEmployees(e.value.data || [])
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { start_date: startDate, end_date: endDate }
      if (typeFilter) params.exception_type = typeFilter
      if (statusFilter) params.status_filter = statusFilter
      if (siteFilter) params.site_id = Number(siteFilter)

      const [listRes, summaryRes] = await Promise.allSettled([
        exceptionsApi.list(params),
        exceptionsApi.getSummary(),
      ])

      if (listRes.status === 'fulfilled') {
        setExceptions(listRes.value.data.items || [])
        setTotal(listRes.value.data.total || 0)
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load exceptions')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, typeFilter, statusFilter, siteFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSaving(true)
    setFormError(null)
    try {
      const data: any = {
        exception_type: formData.exception_type,
        exception_date: formData.exception_date,
        description: formData.description || undefined,
      }
      if (formData.employee_id) data.employee_id = Number(formData.employee_id)
      if (formData.site_id) data.site_id = Number(formData.site_id)
      if (formData.shift_id) data.shift_id = Number(formData.shift_id)
      await exceptionsApi.create(data)
      setShowForm(false)
      setFormData({ exception_type: 'no_show', exception_date: today, employee_id: '', site_id: '', shift_id: '', description: '' })
      fetchData()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to log exception')
    } finally {
      setFormSaving(false)
    }
  }

  const handleResolve = async () => {
    if (!resolvingId) return
    setResolveSaving(true)
    try {
      await exceptionsApi.updateStatus(resolvingId, {
        status: resolveStatus,
        resolution_notes: resolveNotes || undefined,
      })
      setResolvingId(null)
      setResolveNotes('')
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setResolveSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this exception record?')) return
    try {
      await exceptionsApi.remove(id)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Exception Log</h1>
          <p className="text-gray-500 mt-1">
            Track and resolve operational exceptions — no-shows, AWOL, late arrivals, and more
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Exception
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Active</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_active}</p>
          </div>
          {(['open', 'in_progress', 'escalated'] as const).map((s) => {
            const cfg = STATUS_CONFIG[s]
            const Icon = cfg.icon
            return (
              <div key={s} className={`rounded-xl border p-4 ${
                s === 'open' ? 'bg-red-50 border-red-200' :
                s === 'in_progress' ? 'bg-amber-50 border-amber-200' :
                'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${
                    s === 'open' ? 'text-red-500' : s === 'in_progress' ? 'text-amber-500' : 'text-purple-500'
                  }`} />
                  <p className={`text-xs ${
                    s === 'open' ? 'text-red-600' :
                    s === 'in_progress' ? 'text-amber-600' :
                    'text-purple-600'
                  }`}>{cfg.label}</p>
                </div>
                <p className={`text-2xl font-bold ${
                  s === 'open' ? 'text-red-700' :
                  s === 'in_progress' ? 'text-amber-700' :
                  'text-purple-700'
                }`}>{summary.by_status[s] || 0}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900">
              <option value="">All Types</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Site</label>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900">
              <option value="">All Sites</option>
              {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>{error}</p>
        </div>
      )}

      {/* Exception list */}
      {exceptions.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Exceptions <span className="ml-1.5 text-sm font-normal text-gray-400">({total})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Reported By</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exceptions.map((ex) => {
                  const typeCfg = TYPE_CONFIG[ex.exception_type] || { label: ex.exception_type, color: 'bg-gray-100 text-gray-700' }
                  const statusCfg = STATUS_CONFIG[ex.status] || { label: ex.status, color: 'bg-gray-100 text-gray-700', icon: ChevronDown }
                  const StatusIcon = statusCfg.icon

                  return (
                    <tr key={ex.exception_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ex.exception_date}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ex.employee_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {ex.site_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {ex.reported_by_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ex.status !== 'resolved' && (
                            <button
                              onClick={() => { setResolvingId(ex.exception_id); setResolveStatus('resolved'); setResolveNotes('') }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Update
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(ex.exception_id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No exceptions found</h3>
          <p className="text-gray-500 mt-1">
            No {statusFilter || 'active'} exceptions for the selected period.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
        </div>
      )}

      {/* Log Exception Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Log Exception</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exception Type *</label>
                  <select value={formData.exception_type} onChange={(e) => setFormData({...formData, exception_type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900" required>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={formData.exception_date} onChange={(e) => setFormData({...formData, exception_date: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                    <option value="">Select employee…</option>
                    {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  <select value={formData.site_id} onChange={(e) => setFormData({...formData, site_id: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                    <option value="">Select site…</option>
                    {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift ID (optional)</label>
                <input type="number" value={formData.shift_id} onChange={(e) => setFormData({...formData, shift_id: e.target.value})}
                  placeholder="Leave blank if unknown"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3} placeholder="Brief description of the exception…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {formSaving ? 'Logging…' : 'Log Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve / Update Status Modal */}
      {resolvingId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              <button onClick={() => setResolvingId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} rows={3}
                  placeholder="What action was taken?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setResolvingId(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleResolve} disabled={resolveSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {resolveSaving ? 'Saving…' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
