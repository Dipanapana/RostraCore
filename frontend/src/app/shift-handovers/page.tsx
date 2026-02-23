'use client'

import { useState, useEffect, useCallback } from 'react'
import { shiftHandoversApi } from '@/services/api'
import { Repeat, Plus, X, Check, Trash2, AlertTriangle } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
}

export default function ShiftHandoversPage() {
  const [items, setItems] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterAck, setFilterAck] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    site_id: '', outgoing_employee_id: '', incoming_employee_id: '',
    summary: '', incidents_note: '', ongoing_issues: '', instructions: '',
    equipment_status: '', keys_handed: true, priority: 'normal',
  })

  const fetchData = useCallback(async () => {
    try {
      const params: any = {}
      if (filterAck === 'true') params.acknowledged = true
      if (filterAck === 'false') params.acknowledged = false
      if (filterPriority) params.priority = filterPriority
      const [listRes, dashRes] = await Promise.all([
        shiftHandoversApi.list(params),
        shiftHandoversApi.dashboard(),
      ])
      setItems(listRes.data.items)
      setDashboard(dashRes.data)
    } catch { /* ignore */ }
  }, [filterAck, filterPriority])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleCreate = async () => {
    try {
      const payload: any = {
        site_id: Number(form.site_id),
        summary: form.summary,
        keys_handed: form.keys_handed,
        priority: form.priority,
      }
      if (form.outgoing_employee_id) payload.outgoing_employee_id = Number(form.outgoing_employee_id)
      if (form.incoming_employee_id) payload.incoming_employee_id = Number(form.incoming_employee_id)
      if (form.incidents_note) payload.incidents_note = form.incidents_note
      if (form.ongoing_issues) payload.ongoing_issues = form.ongoing_issues
      if (form.instructions) payload.instructions = form.instructions
      if (form.equipment_status) payload.equipment_status = form.equipment_status
      await shiftHandoversApi.create(payload)
      setShowModal(false)
      setForm({ site_id: '', outgoing_employee_id: '', incoming_employee_id: '', summary: '', incidents_note: '', ongoing_issues: '', instructions: '', equipment_status: '', keys_handed: true, priority: 'normal' })
      fetchData()
    } catch { /* ignore */ }
  }

  const handleAcknowledge = async (id: number) => {
    try {
      await shiftHandoversApi.acknowledge(id)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this handover note?')) return
    try {
      await shiftHandoversApi.remove(id)
      fetchData()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Repeat className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Shift Handovers</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Handover
        </button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Handovers</div>
            <div className="text-2xl font-bold text-gray-900">{dashboard.total_handovers}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-yellow-600">Unacknowledged</div>
            <div className="text-2xl font-bold text-yellow-600">{dashboard.unacknowledged}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="w-4 h-4" />High Priority Pending</div>
            <div className="text-2xl font-bold text-red-600">{dashboard.high_priority_pending}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={filterAck} onChange={e => setFilterAck(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All priorities</option>
          {['urgent', 'high', 'normal', 'low'].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
      </div>

      {/* Handover Cards */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">No handover notes found</div>
        ) : items.map((h: any) => (
          <div key={h.handover_id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${h.priority === 'urgent' ? 'border-red-500' : h.priority === 'high' ? 'border-orange-500' : h.priority === 'normal' ? 'border-blue-500' : 'border-gray-300'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{h.site_name || `Site ${h.site_id}`}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PRIORITY_COLORS[h.priority]}`}>
                    {PRIORITY_LABELS[h.priority] || h.priority}
                  </span>
                  {h.acknowledged ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium">Acknowledged</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 font-medium">Pending</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {h.outgoing_employee_name && <span>From: <strong>{h.outgoing_employee_name}</strong></span>}
                  {h.incoming_employee_name && <span className="ml-3">To: <strong>{h.incoming_employee_name}</strong></span>}
                  {h.created_at && <span className="ml-3">{new Date(h.created_at).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!h.acknowledged && (
                  <button onClick={() => handleAcknowledge(h.handover_id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Acknowledge">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(h.handover_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-700 mb-2">{h.summary}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {h.incidents_note && (
                <div className="bg-red-50 rounded p-2">
                  <span className="text-xs font-medium text-red-600">Incidents:</span>
                  <p className="text-gray-700 text-xs mt-0.5">{h.incidents_note}</p>
                </div>
              )}
              {h.ongoing_issues && (
                <div className="bg-yellow-50 rounded p-2">
                  <span className="text-xs font-medium text-yellow-600">Ongoing Issues:</span>
                  <p className="text-gray-700 text-xs mt-0.5">{h.ongoing_issues}</p>
                </div>
              )}
              {h.instructions && (
                <div className="bg-blue-50 rounded p-2">
                  <span className="text-xs font-medium text-blue-600">Instructions:</span>
                  <p className="text-gray-700 text-xs mt-0.5">{h.instructions}</p>
                </div>
              )}
              {h.equipment_status && (
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs font-medium text-gray-600">Equipment:</span>
                  <p className="text-gray-700 text-xs mt-0.5">{h.equipment_status}</p>
                </div>
              )}
            </div>
            {!h.keys_handed && <div className="mt-2 text-xs text-red-600 font-medium">Keys NOT handed over</div>}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Shift Handover</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site ID *</label>
                  <input type="number" value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outgoing Employee ID</label>
                  <input type="number" value={form.outgoing_employee_id} onChange={e => setForm({ ...form, outgoing_employee_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incoming Employee ID</label>
                  <input type="number" value={form.incoming_employee_id} onChange={e => setForm({ ...form, incoming_employee_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
                <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Overall shift summary..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incidents Note</label>
                <textarea value={form.incidents_note} onChange={e => setForm({ ...form, incidents_note: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Any incidents during shift..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ongoing Issues</label>
                <textarea value={form.ongoing_issues} onChange={e => setForm({ ...form, ongoing_issues: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Issues to monitor..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions for Next Shift</label>
                <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Special instructions..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Status</label>
                <input type="text" value={form.equipment_status} onChange={e => setForm({ ...form, equipment_status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Radio, torch, etc." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.keys_handed} onChange={e => setForm({ ...form, keys_handed: e.target.checked })} className="rounded" />
                Keys handed over
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Submit Handover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
