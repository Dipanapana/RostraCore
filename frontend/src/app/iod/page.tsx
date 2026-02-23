'use client'

import { useState, useEffect, useCallback } from 'react'
import { iodApi } from '@/services/api'
import { HeartPulse, Plus, X, Edit2, Trash2, AlertTriangle } from 'lucide-react'

const INJURY_TYPES = ['fracture', 'laceration', 'burn', 'strain', 'concussion', 'other']
const STATUSES = ['reported', 'under_review', 'approved', 'rejected', 'closed']
const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-700',
}
const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
}
const INJURY_LABELS: Record<string, string> = {
  fracture: 'Fracture',
  laceration: 'Laceration',
  burn: 'Burn',
  strain: 'Strain',
  concussion: 'Concussion',
  other: 'Other',
}

export default function IODPage() {
  const [items, setItems] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    employee_id: '',
    incident_date: '',
    report_date: '',
    injury_type: 'strain',
    body_part: '',
    description: '',
    location: '',
    site_id: '',
    wca_claim_number: '',
    notes: '',
  })
  const [editForm, setEditForm] = useState({
    return_date: '',
    status: '',
    wca_claim_number: '',
    wca_submitted: false,
    medical_certificate: false,
    notes: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      const [listRes, dashRes] = await Promise.all([
        iodApi.list(params),
        iodApi.dashboard(),
      ])
      setItems(listRes.data.items)
      setDashboard(dashRes.data)
    } catch { /* ignore */ }
  }, [filterStatus])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleCreate = async () => {
    try {
      const payload: any = {
        employee_id: Number(form.employee_id),
        incident_date: form.incident_date,
        injury_type: form.injury_type,
        description: form.description,
      }
      if (form.report_date) payload.report_date = form.report_date
      if (form.body_part) payload.body_part = form.body_part
      if (form.location) payload.location = form.location
      if (form.site_id) payload.site_id = Number(form.site_id)
      if (form.wca_claim_number) payload.wca_claim_number = form.wca_claim_number
      if (form.notes) payload.notes = form.notes
      await iodApi.create(payload)
      setShowModal(false)
      setForm({ employee_id: '', incident_date: '', report_date: '', injury_type: 'strain', body_part: '', description: '', location: '', site_id: '', wca_claim_number: '', notes: '' })
      fetchData()
    } catch { /* ignore */ }
  }

  const openEdit = (item: any) => {
    setEditingId(item.iod_id)
    setEditForm({
      return_date: item.return_date || '',
      status: item.status || '',
      wca_claim_number: item.wca_claim_number || '',
      wca_submitted: item.wca_submitted || false,
      medical_certificate: item.medical_certificate || false,
      notes: item.notes || '',
    })
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      const payload: any = {}
      if (editForm.return_date) payload.return_date = editForm.return_date
      if (editForm.status) payload.status = editForm.status
      if (editForm.wca_claim_number) payload.wca_claim_number = editForm.wca_claim_number
      payload.wca_submitted = editForm.wca_submitted
      payload.medical_certificate = editForm.medical_certificate
      if (editForm.notes) payload.notes = editForm.notes
      await iodApi.update(editingId, payload)
      setEditingId(null)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this IOD record?')) return
    try {
      await iodApi.remove(id)
      fetchData()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeartPulse className="w-7 h-7 text-red-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Injury on Duty</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Report IOD
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Records</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard.total_records}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Active Cases</div>
            <div className="text-2xl font-bold text-red-600">{dashboard.active_cases}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Days Lost</div>
            <div className="text-2xl font-bold text-orange-600">{dashboard.total_days_lost}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-600 mb-1"><AlertTriangle className="w-4 h-4" />WCA Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{dashboard.wca_pending_submission}</div>
          </div>
        </div>
      )}

      {/* Breakdown Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Injury Type */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-3">By Injury Type</h2>
            {Object.keys(dashboard.by_injury_type).length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dashboard.by_injury_type).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{INJURY_LABELS[type] || type}</span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* By Status */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-3">By Status</h2>
            {Object.keys(dashboard.by_status).length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dashboard.by_status).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Employee</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Incident Date</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Injury</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Body Part</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Days Off</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">WCA</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Med Cert</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No IOD records found</td></tr>
            ) : items.map((item: any) => (
              <tr key={item.iod_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{item.employee_name}</td>
                <td className="px-4 py-3 text-gray-600">{item.incident_date}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{INJURY_LABELS[item.injury_type] || item.injury_type}</td>
                <td className="px-4 py-3 text-gray-600">{item.body_part || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-700 font-medium">{item.days_off ?? '—'}</td>
                <td className="px-4 py-3 text-center">{item.wca_submitted ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                <td className="px-4 py-3 text-center">{item.medical_certificate ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.iod_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Report Injury on Duty</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                <input type="number" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date *</label>
                  <input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                  <input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Injury Type *</label>
                  <select value={form.injury_type} onChange={e => setForm({ ...form, injury_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {INJURY_TYPES.map(t => <option key={t} value={t}>{INJURY_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
                  <input type="text" value={form.body_part} onChange={e => setForm({ ...form, body_part: e.target.value })} placeholder="e.g. Left arm" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Where it happened" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site ID</label>
                  <input type="number" value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WCA Claim Number</label>
                <input type="text" value={form.wca_claim_number} onChange={e => setForm({ ...form, wca_claim_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Report IOD</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Update IOD Record</h2>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                <input type="date" value={editForm.return_date} onChange={e => setEditForm({ ...editForm, return_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WCA Claim Number</label>
                <input type="text" value={editForm.wca_claim_number} onChange={e => setEditForm({ ...editForm, wca_claim_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.wca_submitted} onChange={e => setEditForm({ ...editForm, wca_submitted: e.target.checked })} className="rounded" />
                  WCA Submitted
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.medical_certificate} onChange={e => setEditForm({ ...editForm, medical_certificate: e.target.checked })} className="rounded" />
                  Medical Certificate
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
