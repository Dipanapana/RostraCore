'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Plus, Search, X, Trash2, Edit2,
  BarChart3, Building, TrendingUp, AlertTriangle, Clock,
} from 'lucide-react'
import { contractValuesApi, clientsApi, sitesApi } from '@/services/api'

// ── helpers ────────────────────────────────────────────────────────────────

function fmtZAR(n: number | null | undefined): string {
  if (n == null) return '—'
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', fortnightly: 'Fortnightly', annually: 'Annually',
}

// ── component ──────────────────────────────────────────────────────────────

export default function ContractValuesPage() {
  const [tab, setTab] = useState<'list' | 'dashboard'>('list')
  const [contracts, setContracts] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Lookups
  const [clients, setClients] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])

  // Filters
  const [clientFilter, setClientFilter] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({
    client_id: '', site_id: '', contract_number: '', monthly_value: '',
    billing_frequency: 'monthly', hourly_bill_rate: '', wage_budget_pct: '',
    monthly_wage_budget: '', start_date: '', end_date: '', notes: '',
  })

  // ── loaders ──

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (clientFilter) params.client_id = Number(clientFilter)
      const { data } = await contractValuesApi.list(params)
      setContracts(data.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [clientFilter])

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await contractValuesApi.dashboard()
      setDashboard(data)
    } catch { /* ignore */ }
  }, [])

  const loadLookups = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([clientsApi.getAll(), sitesApi.getAll()])
      setClients(c.data?.clients || c.data?.items || c.data || [])
      setSites(s.data?.sites || s.data?.items || s.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadContracts(); loadDashboard(); loadLookups() }, [loadContracts, loadDashboard, loadLookups])

  // ── actions ──

  const openCreate = () => {
    setEditItem(null)
    setForm({ client_id: '', site_id: '', contract_number: '', monthly_value: '', billing_frequency: 'monthly', hourly_bill_rate: '', wage_budget_pct: '', monthly_wage_budget: '', start_date: '', end_date: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (cv: any) => {
    setEditItem(cv)
    setForm({
      client_id: String(cv.client_id), site_id: cv.site_id ? String(cv.site_id) : '',
      contract_number: cv.contract_number || '', monthly_value: cv.monthly_value ? String(cv.monthly_value) : '',
      billing_frequency: cv.billing_frequency || 'monthly',
      hourly_bill_rate: cv.hourly_bill_rate ? String(cv.hourly_bill_rate) : '',
      wage_budget_pct: cv.wage_budget_pct ? String(cv.wage_budget_pct) : '',
      monthly_wage_budget: cv.monthly_wage_budget ? String(cv.monthly_wage_budget) : '',
      start_date: cv.start_date ? cv.start_date.slice(0, 10) : '',
      end_date: cv.end_date ? cv.end_date.slice(0, 10) : '',
      notes: cv.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      const payload: any = {
        client_id: Number(form.client_id),
        site_id: form.site_id ? Number(form.site_id) : null,
        contract_number: form.contract_number || null,
        monthly_value: form.monthly_value ? Number(form.monthly_value) : 0,
        billing_frequency: form.billing_frequency,
        hourly_bill_rate: form.hourly_bill_rate ? Number(form.hourly_bill_rate) : null,
        wage_budget_pct: form.wage_budget_pct ? Number(form.wage_budget_pct) : null,
        monthly_wage_budget: form.monthly_wage_budget ? Number(form.monthly_wage_budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
      }
      if (editItem) {
        await contractValuesApi.update(editItem.contract_value_id, payload)
      } else {
        await contractValuesApi.create(payload)
      }
      setShowModal(false)
      loadContracts()
      loadDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this contract value?')) return
    try { await contractValuesApi.remove(id); loadContracts(); loadDashboard() } catch { /* ignore */ }
  }

  // ── render ──

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-400" /> Contract Values
          </h1>
          <p className="text-slate-400 text-sm mt-1">Financial contract tracking, billing rates, and profitability targets</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Contract
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {(['list', 'dashboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t === 'list' ? 'Contracts' : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Clients</option>
              {clients.map((c: any) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
            </select>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Site</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Contract #</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Monthly Value</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Bill Rate/hr</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Wage %</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Wage Budget</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Period</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                  ) : contracts.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No contract values found</td></tr>
                  ) : contracts.map((cv: any) => {
                    const isExpired = cv.end_date && new Date(cv.end_date) <= new Date()
                    const isExpiring = cv.end_date && !isExpired && ((new Date(cv.end_date).getTime() - Date.now()) / 86400000) <= 90
                    return (
                      <tr key={cv.contract_value_id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{cv.client_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{cv.site_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{cv.contract_number || '—'}</td>
                        <td className="px-4 py-3 text-right text-green-400 font-semibold">{fmtZAR(cv.monthly_value)}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{cv.hourly_bill_rate ? fmtZAR(cv.hourly_bill_rate) : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{cv.wage_budget_pct ? `${cv.wage_budget_pct}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{cv.monthly_wage_budget ? fmtZAR(cv.monthly_wage_budget) : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            {isExpired && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            {isExpiring && <Clock className="w-3 h-3 text-amber-400" />}
                            <span className={isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-slate-400'}>
                              {fmtDate(cv.start_date)} — {fmtDate(cv.end_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(cv)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(cv.contract_value_id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Contracts', value: dashboard.total_contracts, icon: Building, colour: 'blue' },
              { label: 'Monthly Revenue', value: fmtZAR(dashboard.total_monthly_revenue), icon: DollarSign, colour: 'green' },
              { label: 'Annual Revenue', value: fmtZAR(dashboard.annual_revenue), icon: TrendingUp, colour: 'emerald' },
              { label: 'Avg Wage Target', value: `${dashboard.avg_wage_budget_pct}%`, icon: BarChart3, colour: 'purple' },
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs font-medium">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 text-${kpi.colour}-400`} />
                </div>
                <p className="text-xl font-bold text-white truncate">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{fmtZAR(dashboard.total_wage_budget)}</p>
              <p className="text-slate-400 text-xs mt-1">Total Wage Budget / month</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{dashboard.expiring_soon}</p>
              <p className="text-slate-400 text-xs mt-1">Expiring (90 days)</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{dashboard.expired}</p>
              <p className="text-slate-400 text-xs mt-1">Expired</p>
            </div>
          </div>

          {/* By Client */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400" /> Revenue by Client
            </h3>
            {(dashboard.by_client || []).length === 0 ? (
              <p className="text-slate-500 text-sm">No contract data yet</p>
            ) : (
              <div className="space-y-3">
                {dashboard.by_client.map((c: any) => (
                  <div key={c.client_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-300">{c.client_name} <span className="text-slate-500">({c.contracts} contracts)</span></span>
                      <span className="text-green-400 font-medium">{fmtZAR(c.monthly_total)}/mo</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (c.monthly_total / dashboard.total_monthly_revenue) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{editItem ? 'Edit Contract Value' : 'Add Contract Value'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Client *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select client…</option>
                  {clients.map((c: any) => <option key={c.client_id} value={c.client_id}>{c.client_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Site</label>
                  <select value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">— All sites —</option>
                    {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Contract Number</label>
                  <input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. SEC-2026-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Monthly Value (ZAR) *</label>
                  <input type="number" step="0.01" value={form.monthly_value} onChange={e => setForm({ ...form, monthly_value: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Billing Frequency</label>
                  <select value={form.billing_frequency} onChange={e => setForm({ ...form, billing_frequency: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bill Rate/hr (ZAR)</label>
                  <input type="number" step="0.01" value={form.hourly_bill_rate} onChange={e => setForm({ ...form, hourly_bill_rate: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Wage Target %</label>
                  <input type="number" step="0.1" value={form.wage_budget_pct} onChange={e => setForm({ ...form, wage_budget_pct: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. 65" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Wage Budget (ZAR)</label>
                  <input type="number" step="0.01" value={form.monthly_wage_budget} onChange={e => setForm({ ...form, monthly_wage_budget: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Auto from %" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.client_id || !form.monthly_value} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {editItem ? 'Save Changes' : 'Add Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
