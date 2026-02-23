'use client'

import { useState, useEffect, useCallback } from 'react'
import { assetsApi, employeesApi, sitesApi } from '@/services/api'
import {
  Package,
  Plus,
  RefreshCw,
  Filter,
  X,
  Search,
  ArrowRightLeft,
  CornerDownLeft,
  History,
  BarChart3,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssetItem {
  asset_id: number
  asset_number: string
  name: string
  category: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  purchase_cost: number
  current_book_value: number
  status: string
  condition: string
  assigned_to_employee_id: number | null
  assigned_employee_name: string | null
  acquired_date: string | null
  notes: string | null
  created_at: string
}

interface SummaryData {
  total: number
  by_status: Record<string, number>
  by_category: Record<string, number>
  total_value: number
  issued: number
  available: number
  maintenance: number
  lost_or_damaged: number
}

interface HistoryItem {
  history_id: number
  action: string
  employee_name: string | null
  performed_by_name: string | null
  notes: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  firearm: 'Firearm', radio: 'Radio', torch: 'Torch', keys: 'Keys',
  vest: 'Vest', phone: 'Phone', baton: 'Baton', handcuffs: 'Handcuffs',
  first_aid: 'First Aid', vehicle: 'Vehicle', other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  issued: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  lost: 'bg-red-100 text-red-700',
  damaged: 'bg-orange-100 text-orange-700',
  retired: 'bg-gray-100 text-gray-500',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryData | null>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [showIssue, setShowIssue] = useState<AssetItem | null>(null)
  const [showHistory, setShowHistory] = useState<AssetItem | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Create form
  const [employees, setEmployees] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [form, setForm] = useState({
    asset_number: '', name: '', category: 'other',
    serial_number: '', manufacturer: '', model: '', purchase_cost: '', notes: '',
  })

  // Issue form
  const [issueEmpId, setIssueEmpId] = useState(0)
  const [issueSiteId, setIssueSiteId] = useState(0)
  const [issueNotes, setIssueNotes] = useState('')

  // ── Fetch assets ────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 200 }
      if (categoryFilter) params.category = categoryFilter
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const { data } = await assetsApi.list(params)
      setAssets(data.items || [])
      setTotal(data.total || 0)
    } catch { setAssets([]) }
    finally { setLoading(false) }
  }, [categoryFilter, statusFilter, search])

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await assetsApi.summary()
      setSummary(data)
    } catch { setSummary(null) }
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])
  useEffect(() => { fetchSummary() }, [fetchSummary])

  // ── Load employees/sites for modals ─────────────────────────
  const loadDropdowns = async () => {
    try {
      const [empRes, siteRes] = await Promise.all([
        employeesApi.getAll({ limit: 500 }),
        sitesApi.getAll(),
      ])
      setEmployees(empRes.data?.items || empRes.data || [])
      setSites(siteRes.data || [])
    } catch {}
  }

  // ── Create asset ────────────────────────────────────────────
  const openCreate = () => {
    loadDropdowns()
    setForm({ asset_number: '', name: '', category: 'other', serial_number: '', manufacturer: '', model: '', purchase_cost: '', notes: '' })
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!form.asset_number || !form.name) return
    setActionLoading(true)
    try {
      await assetsApi.create({
        ...form,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : undefined,
      })
      setShowCreate(false)
      fetchAssets()
      fetchSummary()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create asset')
    } finally { setActionLoading(false) }
  }

  // ── Issue asset ─────────────────────────────────────────────
  const openIssue = (asset: AssetItem) => {
    loadDropdowns()
    setIssueEmpId(0)
    setIssueSiteId(0)
    setIssueNotes('')
    setShowIssue(asset)
  }

  const handleIssue = async () => {
    if (!showIssue || !issueEmpId) return
    setActionLoading(true)
    try {
      await assetsApi.issue(showIssue.asset_id, {
        employee_id: issueEmpId,
        site_id: issueSiteId || undefined,
        notes: issueNotes || undefined,
      })
      setShowIssue(null)
      fetchAssets()
      fetchSummary()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to issue asset')
    } finally { setActionLoading(false) }
  }

  // ── Return asset ────────────────────────────────────────────
  const handleReturn = async (asset: AssetItem) => {
    if (!confirm(`Return "${asset.name}" from ${asset.assigned_employee_name}?`)) return
    setActionLoading(true)
    try {
      await assetsApi.returnAsset(asset.asset_id)
      fetchAssets()
      fetchSummary()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to return asset')
    } finally { setActionLoading(false) }
  }

  // ── View history ────────────────────────────────────────────
  const openHistory = async (asset: AssetItem) => {
    setShowHistory(asset)
    try {
      const { data } = await assetsApi.history(asset.asset_id)
      setHistoryItems(data || [])
    } catch { setHistoryItems([]) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-600" />
            Asset Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track equipment issued to guards — radios, firearms, keys, vests, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchAssets(); fetchSummary() }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-emerald-600 uppercase tracking-wide">Available</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.available}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide">Issued</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary.issued}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Maintenance</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.maintenance}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">R{summary.total_value.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, tag, serial..."
            className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 w-64"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="issued">Issued</option>
          <option value="maintenance">Maintenance</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
          <option value="retired">Retired</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{total} assets</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No assets registered</p>
            <p className="text-sm mt-1">Register equipment to start tracking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Asset #</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Serial #</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map(a => (
                  <tr key={a.asset_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.asset_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[a.category] || a.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || STATUS_COLORS.retired}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.assigned_employee_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{a.condition || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.serial_number || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'available' && (
                          <button
                            onClick={() => openIssue(a)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Issue to guard"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </button>
                        )}
                        {a.status === 'issued' && (
                          <button
                            onClick={() => handleReturn(a)}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                            title="Return asset"
                          >
                            <CornerDownLeft className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => openHistory(a)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          title="View history"
                        >
                          <History className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Register New Asset</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asset Number *</label>
                  <input value={form.asset_number} onChange={e => setForm({ ...form, asset_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" placeholder="e.g. RAD-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" placeholder="e.g. Motorola DP4801e Radio" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                  <input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Cost (R)</label>
                  <input type="number" value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700">Cancel</button>
              <button onClick={handleCreate} disabled={actionLoading || !form.asset_number || !form.name}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'Creating...' : 'Register Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Issue Modal ───────────────────────────────────────── */}
      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Issue Asset</h2>
              <button onClick={() => setShowIssue(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Issuing <span className="font-medium text-gray-900">{showIssue.name}</span> ({showIssue.asset_number})
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Guard *</label>
                <select value={issueEmpId} onChange={e => setIssueEmpId(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm">
                  <option value={0}>Select guard...</option>
                  {employees.map((emp: any) => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Site (optional)</label>
                <select value={issueSiteId} onChange={e => setIssueSiteId(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm">
                  <option value={0}>No specific site</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={issueNotes} onChange={e => setIssueNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowIssue(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700">Cancel</button>
              <button onClick={handleIssue} disabled={actionLoading || !issueEmpId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'Issuing...' : 'Issue Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ─────────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Asset History — {showHistory.name}
              </h2>
              <button onClick={() => setShowHistory(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {historyItems.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No history records.</p>
            ) : (
              <div className="space-y-3">
                {historyItems.map(h => (
                  <div key={h.history_id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 capitalize">{h.action}</span>
                      {h.employee_name && <span className="text-gray-500"> — {h.employee_name}</span>}
                      {h.notes && <p className="text-xs text-gray-400 mt-0.5">{h.notes}</p>}
                      <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
                      {h.performed_by_name && <p className="text-xs text-gray-400">by {h.performed_by_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
