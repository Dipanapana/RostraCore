'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientRequestsApi, clientsApi, sitesApi } from '@/services/api'
import {
  Inbox,
  Plus,
  X,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface RequestItem {
  request_id: number
  client_id: number
  client_name: string | null
  site_id: number | null
  site_name: string | null
  requested_by: string
  request_type: string
  subject: string
  description: string | null
  priority: string
  status: string
  assigned_to_user_id: number | null
  assigned_to_name: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string | null
  resolved_at: string | null
}

interface ClientOption { client_id: number; client_name: string }
interface SiteOption { site_id: number; site_name: string; client_id?: number }

const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const STATUSES = ['open', 'in_progress', 'resolved', 'cancelled']
const REQUEST_TYPES = ['extra_guards', 'shift_change', 'incident_report', 'contract_change', 'general']

const TYPE_LABELS: Record<string, string> = {
  extra_guards: 'Extra Guards',
  shift_change: 'Shift Change',
  incident_report: 'Incident Report',
  contract_change: 'Contract Change',
  general: 'General',
}

const priorityColor = (p: string) => {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  }
  return colors[p] || colors.medium
}

const statusColor = (s: string) => {
  const colors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  return colors[s] || colors.open
}

export default function ClientRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [clientFilter, setClientFilter] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const [clients, setClients] = useState<ClientOption[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    client_id: 0, site_id: 0, requested_by: '', request_type: 'general',
    subject: '', description: '', priority: 'medium',
  })

  const [editItem, setEditItem] = useState<RequestItem | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'open', priority: 'medium', resolution_notes: '',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clientsApi.getAll().then((res: any) => {
      const data = res.data.items || res.data || []
      setClients(data.map((c: any) => ({ client_id: c.client_id, client_name: c.client_name })))
    }).catch(() => {})
    sitesApi.list().then((res: any) => {
      const data = res.data.items || res.data || []
      setSites(data.map((s: any) => ({ site_id: s.site_id, site_name: s.site_name, client_id: s.client_id })))
    }).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (typeFilter) params.request_type = typeFilter
      if (clientFilter) params.client_id = clientFilter
      if (searchQuery) params.search = searchQuery
      const res = await clientRequestsApi.list(params)
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [statusFilter, priorityFilter, typeFilter, clientFilter, searchQuery])

  useEffect(() => { fetchList() }, [fetchList])

  const handleCreate = async () => {
    if (!createForm.subject || !createForm.client_id || !createForm.requested_by) return
    try {
      const payload: any = {
        client_id: createForm.client_id,
        requested_by: createForm.requested_by,
        request_type: createForm.request_type,
        subject: createForm.subject,
        priority: createForm.priority,
      }
      if (createForm.site_id) payload.site_id = createForm.site_id
      if (createForm.description) payload.description = createForm.description
      await clientRequestsApi.create(payload)
      setShowCreate(false)
      setCreateForm({ client_id: 0, site_id: 0, requested_by: '', request_type: 'general', subject: '', description: '', priority: 'medium' })
      fetchList()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      const payload: any = {
        status: editForm.status,
        priority: editForm.priority,
      }
      if (editForm.resolution_notes) payload.resolution_notes = editForm.resolution_notes
      await clientRequestsApi.update(editItem.request_id, payload)
      setEditItem(null)
      fetchList()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this client request?')) return
    try { await clientRequestsApi.remove(id); fetchList() } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
  }

  const filteredSites = createForm.client_id
    ? sites.filter(s => s.client_id === createForm.client_id)
    : sites

  // Stats
  const openCount = items.filter(i => i.status === 'open').length
  const inProgressCount = items.filter(i => i.status === 'in_progress').length
  const urgentCount = items.filter(i => i.priority === 'urgent' && i.status !== 'resolved' && i.status !== 'cancelled').length

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Client Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage service requests from clients</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-gray-900' },
          { label: 'Open', value: openCount, color: 'text-blue-600' },
          { label: 'In Progress', value: inProgressCount, color: 'text-amber-600' },
          { label: 'Urgent', value: urgentCount, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..." className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" />
        </div>
        <select value={clientFilter} onChange={(e) => setClientFilter(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value={0}>All Clients</option>
          {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Types</option>
          {REQUEST_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <span className="text-sm text-gray-500">{total} requests</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                {loading ? 'Loading...' : 'No client requests found'}
              </td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.request_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.subject}</p>
                    {r.site_name && <p className="text-xs text-gray-400">{r.site_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.client_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {TYPE_LABELS[r.request_type] || r.request_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(r.priority)}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.requested_by}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => {
                        setEditItem(r)
                        setEditForm({ status: r.status, priority: r.priority, resolution_notes: r.resolution_notes || '' })
                      }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(r.request_id)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600">
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

      {/* ── CREATE MODAL ────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">New Client Request</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select value={createForm.client_id} onChange={(e) => setCreateForm({ ...createForm, client_id: Number(e.target.value), site_id: 0 })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value={0}>Select client...</option>
                  {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site (optional)</label>
                <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value={0}>All sites / not specific</option>
                  {filteredSites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
                <input type="text" value={createForm.requested_by}
                  onChange={(e) => setCreateForm({ ...createForm, requested_by: e.target.value })}
                  placeholder="Name of person requesting"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  placeholder="Brief summary of request"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                  <select value={createForm.request_type}
                    onChange={(e) => setCreateForm({ ...createForm, request_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {REQUEST_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3} placeholder="Detailed description..."
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Create Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Update Request</h2>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-sm">{editItem.subject}</p>
                <p className="text-xs text-gray-500 mt-1">{editItem.client_name} {editItem.site_name ? `- ${editItem.site_name}` : ''}</p>
                {editItem.description && <p className="text-sm text-gray-600 mt-2">{editItem.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea value={editForm.resolution_notes}
                  onChange={(e) => setEditForm({ ...editForm, resolution_notes: e.target.value })}
                  rows={3} placeholder="Notes about resolution..."
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
