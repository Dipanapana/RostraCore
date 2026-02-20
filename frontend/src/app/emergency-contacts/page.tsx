'use client'

import { useState, useEffect, useCallback } from 'react'
import { emergencyContactsApi } from '@/services/api'
import { Phone, Plus, Pencil, Trash2, X, Star, AlertTriangle } from 'lucide-react'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']

export default function EmergencyContactsPage() {
  const [items, setItems] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({
    employee_id: '', full_name: '', relationship: 'Spouse', phone: '',
    alt_phone: '', email: '', address: '', is_primary: false,
  })

  const fetchData = useCallback(async () => {
    try {
      const params: any = {}
      if (filterEmployee) params.employee_id = Number(filterEmployee)
      const [listRes, dashRes] = await Promise.all([
        emergencyContactsApi.list(params),
        emergencyContactsApi.dashboard(),
      ])
      setItems(listRes.data.items || [])
      setDashboard(dashRes.data)
    } catch { /* ignore */ }
  }, [filterEmployee])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({
      employee_id: '', full_name: '', relationship: 'Spouse', phone: '',
      alt_phone: '', email: '', address: '', is_primary: false,
    })
    setShowModal(true)
  }

  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      employee_id: String(c.employee_id),
      full_name: c.full_name,
      relationship: c.relationship,
      phone: c.phone,
      alt_phone: c.alt_phone || '',
      email: c.email || '',
      address: c.address || '',
      is_primary: c.is_primary,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await emergencyContactsApi.update(editing.contact_id, {
          full_name: form.full_name,
          relationship: form.relationship,
          phone: form.phone,
          alt_phone: form.alt_phone || null,
          email: form.email || null,
          address: form.address || null,
          is_primary: form.is_primary,
        })
      } else {
        await emergencyContactsApi.create({
          employee_id: Number(form.employee_id),
          full_name: form.full_name,
          relationship: form.relationship,
          phone: form.phone,
          alt_phone: form.alt_phone || null,
          email: form.email || null,
          address: form.address || null,
          is_primary: form.is_primary,
        })
      }
      setShowModal(false)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this emergency contact?')) return
    try {
      await emergencyContactsApi.remove(id)
      fetchData()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Phone className="w-7 h-7 text-rose-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Contacts</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Coverage Dashboard */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Active Employees</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_active_employees}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="text-sm text-green-600">With Contacts</div>
            <div className="text-2xl font-bold text-green-600">{dashboard.with_emergency_contacts}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="text-sm text-red-600">Missing Contacts</div>
            <div className="text-2xl font-bold text-red-600">{dashboard.without_emergency_contacts}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Coverage</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.coverage_pct}%</div>
            <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${dashboard.coverage_pct >= 90 ? 'bg-green-500' : dashboard.coverage_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(dashboard.coverage_pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Missing Contacts Warning */}
      {dashboard?.missing_contacts?.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
              Employees without emergency contacts ({dashboard.without_emergency_contacts})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {dashboard.missing_contacts.map((m: any) => (
              <span key={m.employee_id} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          placeholder="Filter by Employee ID"
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-48 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        {filterEmployee && (
          <button onClick={() => setFilterEmployee('')} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
        )}
        <span className="text-sm text-gray-500">{items.length} contact(s)</span>
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Employee</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Contact Name</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Relationship</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Phone</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Email</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 font-medium">Primary</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No emergency contacts found</td></tr>
            ) : items.map((c: any) => (
              <tr key={c.contact_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white">{c.employee_name}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.full_name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{c.relationship}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {c.phone}
                  {c.alt_phone && <span className="text-gray-400 ml-1">/ {c.alt_phone}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.email || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {c.is_primary && <Star className="w-4 h-4 text-yellow-500 inline" />}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.contact_id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                  <input type="number" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
                  <select value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {RELATIONSHIPS.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="+27..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alt Phone</label>
                  <input value={form.alt_phone} onChange={e => setForm({ ...form, alt_phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} className="rounded" />
                Primary contact
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.full_name || !form.phone || (!editing && !form.employee_id)} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
