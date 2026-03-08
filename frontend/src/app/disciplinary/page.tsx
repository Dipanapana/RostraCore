'use client'

import { useState, useEffect, useCallback } from 'react'
import { disciplinaryApi, employeesApi } from '@/services/api'
import {
  Gavel,
  Plus,
  X,
  Search,
  BarChart3,
  Pencil,
  Trash2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DisciplinaryCase {
  case_id: number
  employee_id: number
  employee_name: string | null
  incident_date: string
  case_type: string
  reason: string
  outcome: string | null
  issued_by_id: number | null
  issued_by_name: string | null
  created_at: string
}

interface Dashboard {
  period_days: number
  total: number
  by_type: [string, number][]
  by_employee: { employee_id: number; employee_name: string; count: number }[]
  monthly_trend: { month: string; count: number }[]
}

interface EmployeeOption { employee_id: number; first_name: string; last_name: string }

const CASE_TYPES = [
  'verbal_warning', 'written_warning', 'final_warning', 'suspension', 'dismissal',
]

const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const typeColor = (t: string) => {
  const colors: Record<string, string> = {
    verbal_warning: 'bg-blue-100 text-blue-700',
    written_warning: 'bg-amber-50 text-amber-700',
    final_warning: 'bg-orange-100 text-orange-700',
    suspension: 'bg-red-100 text-red-700',
    dismissal: 'bg-red-100 text-red-700',
  }
  return colors[t] || 'bg-gray-100 text-gray-600'
}

export default function DisciplinaryPage() {
  const [tab, setTab] = useState<'cases' | 'dashboard'>('cases')

  const [cases, setCases] = useState<DisciplinaryCase[]>([])
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    employee_id: 0, incident_date: new Date().toISOString().slice(0, 10),
    case_type: 'verbal_warning', reason: '', outcome: '',
  })

  const [editCase, setEditCase] = useState<DisciplinaryCase | null>(null)
  const [editOutcome, setEditOutcome] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    employeesApi.list().then((res) => {
      const data = res.data.employees || res.data.items || res.data || []
      setEmployees(data.map((e: any) => ({
        employee_id: e.employee_id, first_name: e.first_name, last_name: e.last_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 365 }
      if (typeFilter) params.type = typeFilter
      if (searchQuery) params.search = searchQuery
      const res = await disciplinaryApi.list(params)
      setCases(res.data.items)
      setTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [typeFilter, searchQuery])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await disciplinaryApi.dashboard(365)
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'cases') fetchCases()
    else fetchDashboard()
  }, [tab, fetchCases, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.employee_id || !createForm.reason) return
    try {
      const payload: any = {
        employee_id: createForm.employee_id,
        incident_date: createForm.incident_date,
        case_type: createForm.case_type,
        reason: createForm.reason,
      }
      if (createForm.outcome) payload.outcome = createForm.outcome
      await disciplinaryApi.create(payload)
      setShowCreate(false)
      setCreateForm({
        employee_id: 0, incident_date: new Date().toISOString().slice(0, 10),
        case_type: 'verbal_warning', reason: '', outcome: '',
      })
      fetchCases()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!editCase) return
    try {
      await disciplinaryApi.update(editCase.case_id, { outcome: editOutcome })
      setEditCase(null)
      setEditOutcome('')
      fetchCases()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this disciplinary record?')) return
    try {
      await disciplinaryApi.remove(id)
      fetchCases()
    } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
  }

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Disciplinary Records</h1>
          <p className="text-gray-500 text-sm mt-1">
            Formal disciplinary case log for all employees
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Case
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'cases', label: 'Cases', icon: Gavel },
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

      {/* ── CASES TAB ────────────────────────────────────────────────────── */}
      {tab === 'cases' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              {CASE_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
            <span className="text-sm text-gray-500">{total} cases (last 12 months)</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued By</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No disciplinary cases found'}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.case_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {c.employee_name || `Employee #${c.employee_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(c.case_type)}`}>
                          {typeLabel(c.case_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.incident_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.reason}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.outcome || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.issued_by_name || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditCase(c); setEditOutcome(c.outcome || '') }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 rounded">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.case_id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Cases ({dashboard.period_days}d)</p>
            <p className="text-3xl font-bold text-gray-900">{dashboard.total}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Type</h3>
              {dashboard.by_type.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_type.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(type)}`}>
                        {typeLabel(type)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Employee */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Most Cases (Employees)</h3>
              {dashboard.by_employee.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_employee.map((e) => (
                    <div key={e.employee_id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{e.employee_name}</span>
                      <span className="text-sm font-medium text-gray-900">{e.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Monthly Trend</h3>
              {dashboard.monthly_trend.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-1">
                  {dashboard.monthly_trend.map((d) => {
                    const max = Math.max(...dashboard.monthly_trend.map((t) => t.count), 1)
                    return (
                      <div key={d.month} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16 shrink-0">{d.month}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-red-500 h-full rounded-full"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Disciplinary Case</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={0}>Select employee...</option>
                    {employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={createForm.case_type} onChange={(e) => setCreateForm({ ...createForm, case_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {CASE_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date *</label>
                <input type="date" value={createForm.incident_date}
                  onChange={(e) => setCreateForm({ ...createForm, incident_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Offence *</label>
                <textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Describe the offence or reason for disciplinary action..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                <textarea value={createForm.outcome} onChange={(e) => setCreateForm({ ...createForm, outcome: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Corrective action or resolution..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.employee_id || !createForm.reason}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Log Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT OUTCOME MODAL ───────────────────────────────────────────── */}
      {editCase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Update Outcome</h3>
              <button onClick={() => setEditCase(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(editCase.case_type)}`}>
                    {typeLabel(editCase.case_type)}
                  </span>
                  <span className="text-sm text-gray-900 font-medium">{editCase.employee_name}</span>
                </div>
                <p className="text-sm text-gray-600">{editCase.reason}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome / Resolution</label>
                <textarea value={editOutcome} onChange={(e) => setEditOutcome(e.target.value)}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Corrective action taken or resolution..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setEditCase(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleUpdate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
