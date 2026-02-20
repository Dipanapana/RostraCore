'use client'

import { useState, useEffect, useCallback } from 'react'
import { maintenanceApi, sitesApi } from '@/services/api'
import {
  Hammer,
  Plus,
  X,
  Search,
  BarChart3,
  Pencil,
  Trash2,
} from 'lucide-react'

interface MaintenanceItem {
  request_id: number
  site_id: number | null
  site_name: string | null
  title: string
  description: string | null
  category: string | null
  priority: string
  status: string
  reported_by_name: string | null
  assigned_to: string | null
  estimated_cost: number | null
  actual_cost: number | null
  completed_at: string | null
  completion_notes: string | null
  created_at: string
}

interface Dashboard {
  period_days: number
  total: number
  open: number
  in_progress: number
  completed: number
  on_hold: number
  critical_open: number
  total_estimated_cost: number
  total_actual_cost: number
  by_category: [string, number][]
  by_site: { site_id: number; site_name: string; count: number; open: number }[]
}

interface SiteOption { site_id: number; site_name: string }

const PRIORITIES = ['low', 'medium', 'high', 'critical']
const STATUSES = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const CATEGORIES = ['electrical', 'plumbing', 'structural', 'security_equipment', 'hvac', 'cleaning', 'other']

const priorityColor = (p: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[p] || colors.medium
}

const statusColor = (s: string) => {
  const colors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    on_hold: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[s] || colors.open
}

const formatZAR = (cents: number | null) => {
  if (!cents) return '-'
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

export default function MaintenancePage() {
  const [tab, setTab] = useState<'requests' | 'dashboard'>('requests')

  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState(0)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    site_id: 0, title: '', description: '', category: 'other',
    priority: 'medium', assigned_to: '', estimated_cost: '',
  })

  const [editItem, setEditItem] = useState<MaintenanceItem | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'open', priority: 'medium', assigned_to: '',
    actual_cost: '', completion_notes: '',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 90 }
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (searchQuery) params.search = searchQuery
      if (siteFilter) params.site_id = siteFilter
      const res = await maintenanceApi.list(params)
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [statusFilter, priorityFilter, searchQuery, siteFilter])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await maintenanceApi.dashboard(90)
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'requests') fetchList()
    else fetchDashboard()
  }, [tab, fetchList, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.title) return
    try {
      const payload: any = {
        title: createForm.title, priority: createForm.priority, category: createForm.category,
      }
      if (createForm.site_id) payload.site_id = createForm.site_id
      if (createForm.description) payload.description = createForm.description
      if (createForm.assigned_to) payload.assigned_to = createForm.assigned_to
      if (createForm.estimated_cost) payload.estimated_cost = Math.round(parseFloat(createForm.estimated_cost) * 100)
      await maintenanceApi.create(payload)
      setShowCreate(false)
      setCreateForm({ site_id: 0, title: '', description: '', category: 'other', priority: 'medium', assigned_to: '', estimated_cost: '' })
      fetchList()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      const payload: any = {
        status: editForm.status, priority: editForm.priority,
      }
      if (editForm.assigned_to) payload.assigned_to = editForm.assigned_to
      if (editForm.actual_cost) payload.actual_cost = Math.round(parseFloat(editForm.actual_cost) * 100)
      if (editForm.completion_notes) payload.completion_notes = editForm.completion_notes
      await maintenanceApi.update(editItem.request_id, payload)
      setEditItem(null)
      fetchList()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this maintenance request?')) return
    try { await maintenanceApi.remove(id); fetchList() } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Site maintenance and repair tracking</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'requests', label: 'Requests', icon: Hammer },
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── REQUESTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..." className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
            <select value={siteFilter} onChange={(e) => setSiteFilter(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value={0}>All Sites</option>
              {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">{total} requests</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Loading...' : 'No maintenance requests found'}
                  </td></tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.request_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
                        {r.category && <p className="text-xs text-gray-400">{r.category.replace('_', ' ')}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.site_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(r.priority)}`}>{r.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.assigned_to || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => {
                            setEditItem(r)
                            setEditForm({
                              status: r.status, priority: r.priority,
                              assigned_to: r.assigned_to || '',
                              actual_cost: r.actual_cost ? (r.actual_cost / 100).toString() : '',
                              completion_notes: r.completion_notes || '',
                            })
                          }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(r.request_id)}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Open', value: dashboard.open, color: 'text-blue-600' },
              { label: 'In Progress', value: dashboard.in_progress, color: 'text-yellow-600' },
              { label: 'Completed', value: dashboard.completed, color: 'text-green-600' },
              { label: 'Critical Open', value: dashboard.critical_open, color: 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Costs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatZAR(dashboard.total_estimated_cost)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Costs (Completed)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatZAR(dashboard.total_actual_cost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By Category</h3>
              {dashboard.by_category.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">
                  {dashboard.by_category.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{cat.replace('_', ' ')}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By Site</h3>
              {dashboard.by_site.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">
                  {dashboard.by_site.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.site_name}</span>
                      <div className="flex items-center gap-2">
                        {s.open > 0 && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">{s.open} open</span>}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{s.count}</span>
                      </div>
                    </div>
                  ))}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">New Maintenance Request</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Brief description of the issue..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site</label>
                  <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value={0}>Select site...</option>
                    {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Cost (ZAR)</label>
                  <input type="number" min={0} step={0.01} value={createForm.estimated_cost}
                    onChange={(e) => setCreateForm({ ...createForm, estimated_cost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Detailed description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                <input type="text" value={createForm.assigned_to} onChange={(e) => setCreateForm({ ...createForm, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Contractor or maintenance person..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.title}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Update Request</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{editItem.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{editItem.site_name || 'No site'} | {editItem.category || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</label>
                <input type="text" value={editForm.assigned_to} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Cost (ZAR)</label>
                <input type="number" min={0} step={0.01} value={editForm.actual_cost}
                  onChange={(e) => setEditForm({ ...editForm, actual_cost: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Completion Notes</label>
                <textarea value={editForm.completion_notes} onChange={(e) => setEditForm({ ...editForm, completion_notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Work completed, parts replaced, etc." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={handleUpdate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
