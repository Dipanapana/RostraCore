'use client'

import { useState, useEffect, useCallback } from 'react'
import { deploymentsApi, sitesApi } from '@/services/api'
import { employeesApi } from '@/services/api'
import { History, Plus, BarChart3, Edit, Trash2, MapPin } from 'lucide-react'

const REASONS: Record<string, string> = {
  new_assignment: 'New Assignment',
  transfer: 'Transfer',
  rotation: 'Rotation',
  temporary: 'Temporary',
}

function reasonBadge(r: string | null) {
  const colors: Record<string, string> = {
    new_assignment: 'bg-blue-100 text-blue-700',
    transfer: 'bg-purple-100 text-purple-700',
    rotation: 'bg-orange-100 text-orange-700',
    temporary: 'bg-gray-100 text-gray-700',
  }
  if (!r) return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">—</span>
  return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[r] || 'bg-gray-100 text-gray-600'}`}>{REASONS[r] || r}</span>
}

export default function DeploymentsPage() {
  const [tab, setTab] = useState<'records'|'dashboard'>('records')
  const [records, setRecords] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterActive, setFilterActive] = useState(false)

  const [form, setForm] = useState({
    employee_id: '',
    site_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    role: '',
    reason: '',
    notes: '',
  })

  const fetchRecords = useCallback(async () => {
    try {
      const params: any = {}
      if (filterEmployee) params.employee_id = Number(filterEmployee)
      if (filterSite) params.site_id = Number(filterSite)
      if (filterActive) params.active_only = true
      const { data } = await deploymentsApi.list(params)
      setRecords(data.items || [])
    } catch { /* ignore */ }
  }, [filterEmployee, filterSite, filterActive])

  const fetchMeta = useCallback(async () => {
    try {
      const [empRes, siteRes] = await Promise.all([employeesApi.list(), sitesApi.list()])
      setEmployees(empRes.data.items || empRes.data || [])
      setSites(siteRes.data.items || siteRes.data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await deploymentsApi.dashboard()
      setDashboard(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchRecords(), fetchMeta(), fetchDashboard()]).finally(() => setLoading(false))
  }, [fetchRecords, fetchMeta, fetchDashboard])

  const handleCreate = async () => {
    try {
      await deploymentsApi.create({
        employee_id: Number(form.employee_id),
        site_id: form.site_id ? Number(form.site_id) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        role: form.role || null,
        reason: form.reason || null,
        notes: form.notes || null,
      })
      setShowCreate(false)
      resetForm()
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!showEdit) return
    try {
      await deploymentsApi.update(showEdit.record_id, {
        site_id: form.site_id ? Number(form.site_id) : null,
        end_date: form.end_date || null,
        role: form.role || null,
        reason: form.reason || null,
        notes: form.notes || null,
      })
      setShowEdit(null)
      resetForm()
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this deployment record?')) return
    try {
      await deploymentsApi.remove(id)
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const resetForm = () => setForm({
    employee_id: '', site_id: '', start_date: new Date().toISOString().split('T')[0],
    end_date: '', role: '', reason: '', notes: '',
  })

  const openEdit = (r: any) => {
    setForm({
      employee_id: r.employee_id,
      site_id: r.site_id || '',
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      role: r.role || '',
      reason: r.reason || '',
      notes: r.notes || '',
    })
    setShowEdit(r)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Guard Deployments</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('records')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'records' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Records</button>
          <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            <BarChart3 className="w-4 h-4 inline mr-1" />Dashboard
          </button>
        </div>
      </div>

      {tab === 'records' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Employees</option>
              {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Sites</option>
              {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input type="checkbox" checked={filterActive} onChange={e => setFilterActive(e.target.checked)} className="rounded" />
              Active only
            </label>
            <div className="flex-1" />
            <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" />New Deployment
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Start</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">End</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No deployment records found</td></tr>
                )}
                {records.map((r: any) => (
                  <tr key={r.record_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.employee_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{r.site_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.role || '—'}</td>
                    <td className="px-4 py-3 text-center">{reasonBadge(r.reason)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.start_date}</td>
                    <td className="px-4 py-3">
                      {r.end_date
                        ? <span className="text-gray-600">{r.end_date}</span>
                        : <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">Active</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 mr-2"><Edit className="w-4 h-4 inline" /></button>
                      <button onClick={() => handleDelete(r.record_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.total_records}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-green-600">Active</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.active_deployments}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.completed_deployments}</div>
            </div>
          </div>

          {/* By Reason */}
          {dashboard.by_reason?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Reason</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dashboard.by_reason.map(([reason, count]: [string, number]) => (
                  <div key={reason} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{REASONS[reason] || reason}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Site */}
          {dashboard.by_site?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Active Deployments by Site</h3>
              <div className="space-y-2">
                {dashboard.by_site.map((s: any) => (
                  <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{s.count} guards</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Employees */}
          {dashboard.top_employees?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Most Deployed Guards</h3>
              <div className="space-y-2">
                {dashboard.top_employees.map((e: any, i: number) => (
                  <div key={e.employee_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-xs bg-gray-200 rounded-full text-gray-700">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{e.employee_name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{e.deployment_count} deployments</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">New Deployment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select employee</option>
                  {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select site</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="e.g. Site Supervisor, Patrol, Access Control" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select reason</option>
                  <option value="new_assignment">New Assignment</option>
                  <option value="transfer">Transfer</option>
                  <option value="rotation">Rotation</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={!form.employee_id || !form.start_date} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Edit Deployment — {showEdit.employee_name}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select site</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select reason</option>
                  <option value="new_assignment">New Assignment</option>
                  <option value="transfer">Transfer</option>
                  <option value="rotation">Rotation</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEdit(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
