'use client'

import { useState, useEffect, useCallback } from 'react'
import { budgetsApi } from '@/services/api'
import { Wallet, Plus, Pencil, Trash2, X } from 'lucide-react'

const CATEGORIES = ['wages', 'equipment', 'training', 'operations', 'other']
const CAT_COLORS: Record<string, string> = {
  wages: 'bg-blue-100 text-blue-700',
  equipment: 'bg-purple-100 text-purple-700',
  training: 'bg-emerald-50 text-emerald-700',
  operations: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
}

function fmtZAR(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

export default function BudgetsPage() {
  const [items, setItems] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({
    name: '', category: 'wages', site_id: '', period_month: '',
    period_year: String(new Date().getFullYear()), allocated_amount: '', spent_amount: '0', notes: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [listRes, dashRes] = await Promise.all([
        budgetsApi.list({ year: filterYear, category: filterCategory || undefined }),
        budgetsApi.dashboard(filterYear),
      ])
      setItems(listRes.data.items || [])
      setDashboard(dashRes.data)
    } catch { /* ignore */ }
  }, [filterYear, filterCategory])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '', category: 'wages', site_id: '', period_month: '',
      period_year: String(filterYear), allocated_amount: '', spent_amount: '0', notes: '',
    })
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditing(b)
    setForm({
      name: b.name,
      category: b.category || 'other',
      site_id: b.site_id ? String(b.site_id) : '',
      period_month: b.period_month ? String(b.period_month) : '',
      period_year: String(b.period_year),
      allocated_amount: String(b.allocated_amount / 100),
      spent_amount: String(b.spent_amount / 100),
      notes: b.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    const payload: any = {
      name: form.name,
      category: form.category,
      site_id: form.site_id ? Number(form.site_id) : null,
      period_month: form.period_month ? Number(form.period_month) : null,
      period_year: Number(form.period_year),
      allocated_amount: Math.round(Number(form.allocated_amount) * 100),
      spent_amount: Math.round(Number(form.spent_amount) * 100),
      notes: form.notes || null,
    }
    try {
      if (editing) {
        await budgetsApi.update(editing.budget_id, {
          name: payload.name,
          category: payload.category,
          allocated_amount: payload.allocated_amount,
          spent_amount: payload.spent_amount,
          notes: payload.notes,
        })
      } else {
        await budgetsApi.create(payload)
      }
      setShowModal(false)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this budget?')) return
    try {
      await budgetsApi.delete(id)
      fetchData()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Budget
        </button>
      </div>

      {/* Dashboard Summary */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Allocated</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(dashboard.total_allocated)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total Spent</div>
            <div className="text-xl font-bold text-gray-900">{fmtZAR(dashboard.total_spent)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Remaining</div>
            <div className={`text-xl font-bold ${dashboard.total_remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtZAR(dashboard.total_remaining)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Utilisation</div>
            <div className="text-xl font-bold text-gray-900">{dashboard.overall_utilisation_pct}%</div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${dashboard.overall_utilisation_pct > 100 ? 'bg-red-500' : dashboard.overall_utilisation_pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(dashboard.overall_utilisation_pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* By Category Breakdown */}
      {dashboard?.by_category?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Budget by Category</h2>
          <div className="space-y-3">
            {dashboard.by_category.map((c: any) => (
              <div key={c.category} className="flex items-center gap-4">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${CAT_COLORS[c.category] || CAT_COLORS.other}`}>
                  {c.category}
                </span>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${c.utilisation_pct > 100 ? 'bg-red-500' : c.utilisation_pct > 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(c.utilisation_pct, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-32 text-right">
                  {fmtZAR(c.spent)} / {fmtZAR(c.allocated)}
                </span>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">{c.utilisation_pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Over-budget Alerts */}
      {dashboard?.over_budget_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            {dashboard.over_budget_count} budget(s) over allocated amount
          </h3>
          <div className="space-y-1">
            {dashboard.over_budget_items.map((b: any) => (
              <div key={b.budget_id} className="text-sm text-red-600">
                {b.name}: spent {fmtZAR(b.spent_amount)} of {fmtZAR(b.allocated_amount)} ({b.utilisation_pct}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{items.length} budget(s)</span>
      </div>

      {/* Budget Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Name</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Category</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Period</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Allocated</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Spent</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Remaining</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Use %</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No budgets found</td></tr>
            ) : items.map((b: any) => (
              <tr key={b.budget_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${CAT_COLORS[b.category] || CAT_COLORS.other}`}>
                    {b.category || 'other'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {b.period_month ? `${String(b.period_month).padStart(2, '0')}/` : ''}{b.period_year}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(b.allocated_amount)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtZAR(b.spent_amount)}</td>
                <td className={`px-4 py-3 text-right font-medium ${b.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtZAR(b.remaining)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${b.utilisation_pct > 100 ? 'text-red-600' : b.utilisation_pct > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {b.utilisation_pct}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(b.budget_id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Budget' : 'New Budget'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={form.period_year} onChange={e => setForm({ ...form, period_year: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month (optional, leave blank for annual)</label>
                <select value={form.period_month} onChange={e => setForm({ ...form, period_month: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Annual</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allocated (R)</label>
                  <input type="number" step="0.01" value={form.allocated_amount} onChange={e => setForm({ ...form, allocated_amount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spent (R)</label>
                  <input type="number" step="0.01" value={form.spent_amount} onChange={e => setForm({ ...form, spent_amount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={!form.name || !form.allocated_amount} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
