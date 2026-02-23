'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientReportsApi } from '@/services/api'
import { clientsApi, sitesApi } from '@/services/api'
import { FileBarChart, Plus, BarChart3, Edit, Trash2, Send, Eye } from 'lucide-react'

const REPORT_TYPES: Record<string, string> = {
  monthly_summary: 'Monthly Summary',
  incident_report: 'Incident Report',
  sla_review: 'SLA Review',
  coverage_report: 'Coverage Report',
}

function statusBadge(s: string) {
  if (s === 'published') return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">Published</span>
  if (s === 'archived') return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Archived</span>
  return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">Draft</span>
}

function typeBadge(t: string) {
  const colors: Record<string, string> = {
    monthly_summary: 'bg-blue-100 text-blue-700',
    incident_report: 'bg-red-100 text-red-700',
    sla_review: 'bg-purple-100 text-purple-700',
    coverage_report: 'bg-teal-100 text-teal-700',
  }
  return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[t] || 'bg-gray-100 text-gray-600'}`}>{REPORT_TYPES[t] || t}</span>
}

export default function ClientReportsPage() {
  const [tab, setTab] = useState<'reports'|'dashboard'>('reports')
  const [reports, setReports] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showPreview, setShowPreview] = useState<any>(null)
  const [filterClient, setFilterClient] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    client_id: '', site_id: '', title: '', report_type: 'monthly_summary',
    period_start: '', period_end: '', summary: '',
  })

  const fetchReports = useCallback(async () => {
    try {
      const params: any = {}
      if (filterClient) params.client_id = Number(filterClient)
      if (filterType) params.report_type = filterType
      if (filterStatus) params.status = filterStatus
      const { data } = await clientReportsApi.list(params)
      setReports(data.items || [])
    } catch { /* ignore */ }
  }, [filterClient, filterType, filterStatus])

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([clientsApi.list(), sitesApi.list()])
      setClients(cRes.data.items || cRes.data || [])
      setSites(sRes.data.items || sRes.data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await clientReportsApi.dashboard()
      setDashboard(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchReports(), fetchMeta(), fetchDashboard()]).finally(() => setLoading(false))
  }, [fetchReports, fetchMeta, fetchDashboard])

  const handleCreate = async () => {
    try {
      await clientReportsApi.create({
        client_id: Number(form.client_id),
        site_id: form.site_id ? Number(form.site_id) : null,
        title: form.title,
        report_type: form.report_type,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        summary: form.summary || null,
      })
      setShowCreate(false)
      resetForm()
      fetchReports()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!showEdit) return
    try {
      await clientReportsApi.update(showEdit.report_id, {
        title: form.title,
        summary: form.summary || null,
        status: form.report_type, // reuse field for status in edit mode
      })
      setShowEdit(null)
      resetForm()
      fetchReports()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handlePublish = async (id: number) => {
    try {
      await clientReportsApi.update(id, { status: 'published' })
      fetchReports()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this report?')) return
    try {
      await clientReportsApi.remove(id)
      fetchReports()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const resetForm = () => setForm({
    client_id: '', site_id: '', title: '', report_type: 'monthly_summary',
    period_start: '', period_end: '', summary: '',
  })

  const openEdit = (r: any) => {
    setForm({
      client_id: r.client_id, site_id: r.site_id || '',
      title: r.title, report_type: r.status, // use report_type field for status in edit
      period_start: '', period_end: '', summary: r.summary || '',
    })
    setShowEdit(r)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileBarChart className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Client Reports</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('reports')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Reports</button>
          <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            <BarChart3 className="w-4 h-4 inline mr-1" />Dashboard
          </button>
        </div>
      </div>

      {tab === 'reports' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Clients</option>
              {clients.map((c: any) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Types</option>
              {Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex-1" />
            <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" />New Report
            </button>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Published</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No client reports found</td></tr>
                )}
                {reports.map((r: any) => (
                  <tr key={r.report_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      {r.site_name && <div className="text-xs text-gray-500">{r.site_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.client_name || '—'}</td>
                    <td className="px-4 py-3 text-center">{typeBadge(r.report_type)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.published_at ? new Date(r.published_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setShowPreview(r)} className="text-gray-500 hover:text-gray-700 mr-2" title="Preview"><Eye className="w-4 h-4 inline" /></button>
                      {r.status === 'draft' && (
                        <button onClick={() => handlePublish(r.report_id)} className="text-green-600 hover:text-green-800 mr-2" title="Publish"><Send className="w-4 h-4 inline" /></button>
                      )}
                      <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 mr-2"><Edit className="w-4 h-4 inline" /></button>
                      <button onClick={() => handleDelete(r.report_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total Reports</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.total}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-yellow-600">Drafts</div>
              <div className="text-2xl font-bold text-yellow-600">{dashboard.draft}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-green-600">Published</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.published}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Archived</div>
              <div className="text-2xl font-bold text-gray-400">{dashboard.archived}</div>
            </div>
          </div>

          {dashboard.by_type?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Report Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dashboard.by_type.map(([type, count]: [string, number]) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{REPORT_TYPES[type] || type}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dashboard.by_client?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Client</h3>
              <div className="space-y-2">
                {dashboard.by_client.map((c: any) => (
                  <div key={c.client_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-900">{c.client_name}</span>
                    <span className="text-sm font-bold text-indigo-600">{c.report_count} reports</span>
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">New Client Report</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select client</option>
                  {clients.map((c: any) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site (optional)</label>
                <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">All sites</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. February 2026 Monthly Summary" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.report_type} onChange={e => setForm({...form, report_type: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input type="date" value={form.period_start} onChange={e => setForm({...form, period_start: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input type="date" value={form.period_end} onChange={e => setForm({...form, period_end: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} rows={3} placeholder="Executive summary for the client..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={!form.client_id || !form.title} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Edit Report</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.report_type} onChange={e => setForm({...form, report_type: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEdit(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{showPreview.title}</h2>
              {statusBadge(showPreview.status)}
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
                <div><strong>Client:</strong> {showPreview.client_name}</div>
                <div><strong>Type:</strong> {REPORT_TYPES[showPreview.report_type] || showPreview.report_type}</div>
                {showPreview.site_name && <div><strong>Site:</strong> {showPreview.site_name}</div>}
                {showPreview.published_at && <div><strong>Published:</strong> {new Date(showPreview.published_at).toLocaleDateString()}</div>}
              </div>
              {showPreview.summary && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Summary</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{showPreview.summary}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowPreview(null)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
