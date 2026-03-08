'use client'

import { useState, useEffect, useCallback } from 'react'
import { keysApi, sitesApi, employeesApi } from '@/services/api'
import {
  Key,
  Plus,
  X,
  Search,
  ArrowRightLeft,
  AlertTriangle,
  History,
  CheckCircle,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface KeyRecord {
  key_id: number
  site_id: number
  site_name: string
  key_number: string
  key_type: string
  description: string | null
  status: string
  issued_to_employee_id: number | null
  issued_to_name: string | null
  issued_at: string | null
  notes: string | null
  created_at: string
}

interface KeyLogEntry {
  log_id: number
  action: string
  employee_id: number | null
  employee_name: string | null
  notes: string | null
  created_at: string
}

interface KeySummary {
  total: number
  available: number
  issued: number
  lost: number
  sites: { site_id: number; site_name: string; total: number; available: number; issued: number; lost: number }[]
}

interface SiteOption {
  site_id: number
  site_name: string
  client_name: string
}

interface EmployeeOption {
  employee_id: number
  first_name: string
  last_name: string
}

export default function KeyHoldingPage() {
  const [keys, setKeys] = useState<KeyRecord[]>([])
  const [keyTotal, setKeyTotal] = useState(0)
  const [summary, setSummary] = useState<KeySummary | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [sites, setSites] = useState<SiteOption[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ site_id: 0, key_number: '', key_type: 'master', description: '' })

  const [issueModal, setIssueModal] = useState<KeyRecord | null>(null)
  const [issueForm, setIssueForm] = useState({ employee_id: 0, notes: '' })

  const [historyModal, setHistoryModal] = useState<KeyRecord | null>(null)
  const [historyLog, setHistoryLog] = useState<KeyLogEntry[]>([])

  const [loading, setLoading] = useState(false)

  // ── Load sites & employees ───────────────────────────────────────────────
  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name, client_name: s.client_name,
      })))
    }).catch(() => {})

    employeesApi.list().then((res) => {
      setEmployees((res.data.items || res.data || []).map((e: any) => ({
        employee_id: e.employee_id, first_name: e.first_name, last_name: e.last_name,
      })))
    }).catch(() => {})
  }, [])

  // ── Fetch keys ───────────────────────────────────────────────────────────
  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.key_type = typeFilter
      if (searchQuery) params.search = searchQuery
      const [keysRes, summaryRes] = await Promise.all([
        keysApi.list(params),
        keysApi.summary(),
      ])
      setKeys(keysRes.data.items)
      setKeyTotal(keysRes.data.total)
      setSummary(summaryRes.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, searchQuery])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  // ── Create key ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.site_id || !createForm.key_number) return
    try {
      await keysApi.create(createForm)
      setShowCreate(false)
      setCreateForm({ site_id: 0, key_number: '', key_type: 'master', description: '' })
      fetchKeys()
    } catch { /* ignore */ }
  }

  // ── Issue key ────────────────────────────────────────────────────────────
  const handleIssue = async () => {
    if (!issueModal || !issueForm.employee_id) return
    try {
      await keysApi.issue(issueModal.key_id, issueForm)
      setIssueModal(null)
      setIssueForm({ employee_id: 0, notes: '' })
      fetchKeys()
    } catch { /* ignore */ }
  }

  // ── Return key ───────────────────────────────────────────────────────────
  const handleReturn = async (keyId: number) => {
    try {
      await keysApi.returnKey(keyId)
      fetchKeys()
    } catch { /* ignore */ }
  }

  // ── Report lost ──────────────────────────────────────────────────────────
  const handleLost = async (keyId: number) => {
    try {
      await keysApi.reportLost(keyId)
      fetchKeys()
    } catch { /* ignore */ }
  }

  // ── View history ─────────────────────────────────────────────────────────
  const openHistory = async (k: KeyRecord) => {
    setHistoryModal(k)
    try {
      const res = await keysApi.history(k.key_id)
      setHistoryLog(res.data)
    } catch { setHistoryLog([]) }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const KEY_TYPES = ['master', 'gate', 'office', 'access_card', 'remote', 'padlock']

  const statusColor = (s: string) => {
    switch (s) {
      case 'available': return 'bg-emerald-50 text-emerald-700'
      case 'issued': return 'bg-blue-100 text-blue-700'
      case 'lost': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Key Holding</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage keys and access cards across your sites
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Register Key
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Keys</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Available</p>
            <p className="text-2xl font-bold text-green-600">{summary.available}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Issued</p>
            <p className="text-2xl font-bold text-blue-600">{summary.issued}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Lost</p>
            <p className="text-2xl font-bold text-red-600">{summary.lost}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search key number..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="issued">Issued</option>
          <option value="lost">Lost</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Types</option>
          {KEY_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{keyTotal} key{keyTotal !== 1 ? 's' : ''}</span>
      </div>

      {/* Keys Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Key #</th>
              <th className="px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500">Site</th>
              <th className="px-4 py-3 font-medium text-gray-500">Description</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Holder</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Loading...' : 'No keys registered'}
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.key_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      {k.key_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{k.key_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">{k.site_name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{k.description || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(k.status)}`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{k.issued_to_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {k.status === 'available' && (
                        <button
                          onClick={() => { setIssueModal(k); setIssueForm({ employee_id: 0, notes: '' }) }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          title="Issue to guard"
                        >
                          Issue
                        </button>
                      )}
                      {k.status === 'issued' && (
                        <>
                          <button
                            onClick={() => handleReturn(k.key_id)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => handleLost(k.key_id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Lost
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openHistory(k)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                        title="View history"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Per-site breakdown */}
      {summary && summary.sites.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Keys by Site</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.sites.map((s) => (
              <div key={s.site_id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700 font-medium">{s.site_name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600">{s.available} avail</span>
                  <span className="text-blue-600">{s.issued} out</span>
                  {s.lost > 0 && <span className="text-red-600">{s.lost} lost</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Register Key</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                <select
                  value={createForm.site_id}
                  onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value={0}>Select site...</option>
                  {sites.map((s) => (
                    <option key={s.site_id} value={s.site_id}>{s.site_name} ({s.client_name})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Number *</label>
                  <input
                    type="text"
                    value={createForm.key_number}
                    onChange={(e) => setCreateForm({ ...createForm, key_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. K-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={createForm.key_type}
                    onChange={(e) => setCreateForm({ ...createForm, key_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {KEY_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g. Main gate master key"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.site_id || !createForm.key_number}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ISSUE MODAL ────────────────────────────────────────────────────── */}
      {issueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Issue Key</h3>
              <button onClick={() => setIssueModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Key:</strong> {issueModal.key_number} ({issueModal.key_type})</p>
                <p><strong>Site:</strong> {issueModal.site_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue to Employee *</label>
                <select
                  value={issueForm.employee_id}
                  onChange={(e) => setIssueForm({ ...issueForm, employee_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value={0}>Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={issueForm.notes}
                  onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setIssueModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={handleIssue}
                disabled={!issueForm.employee_id}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Issue Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY MODAL ──────────────────────────────────────────────────── */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Key History — {historyModal.key_number}</h3>
              <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {historyLog.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No history yet</p>
              ) : (
                <div className="space-y-3">
                  {historyLog.map((log) => (
                    <div key={log.log_id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className={`p-1.5 rounded-full mt-0.5 ${
                        log.action === 'issued' ? 'bg-blue-100' :
                        log.action === 'returned' ? 'bg-emerald-50' :
                        'bg-red-100'
                      }`}>
                        {log.action === 'issued' ? <ArrowRightLeft className="w-3 h-3 text-blue-600" /> :
                         log.action === 'returned' ? <CheckCircle className="w-3 h-3 text-green-600" /> :
                         <AlertTriangle className="w-3 h-3 text-red-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium capitalize">{log.action}</span>
                          {log.employee_name && <span className="text-gray-500"> — {log.employee_name}</span>}
                        </p>
                        {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button onClick={() => setHistoryModal(null)} className="px-4 py-2 text-sm text-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
