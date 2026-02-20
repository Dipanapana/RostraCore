'use client'

import { useState, useEffect, useCallback } from 'react'
import { commLogApi, sitesApi } from '@/services/api'
import {
  Radio,
  Plus,
  X,
  Search,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  BarChart3,
} from 'lucide-react'

interface CommEntry {
  log_id: number
  site_id: number | null
  site_name: string | null
  comm_type: string
  priority: string
  subject: string
  message: string | null
  from_name: string | null
  to_name: string | null
  employee_id: number | null
  employee_name: string | null
  resolved: string
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
}

interface Dashboard {
  period_days: number
  total: number
  open: number
  resolved: number
  escalated: number
  by_type: [string, number][]
  by_priority: Record<string, number>
  sites: { site_id: number; site_name: string; total: number; open: number }[]
}

interface SiteOption {
  site_id: number
  site_name: string
  client_name: string
}

const COMM_TYPES = ['radio', 'phone', 'email', 'whatsapp', 'in_person', 'alarm', 'cctv', 'other']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']

export default function CommLogPage() {
  const [tab, setTab] = useState<'log' | 'dashboard'>('log')

  const [entries, setEntries] = useState<CommEntry[]>([])
  const [entryTotal, setEntryTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  const [sites, setSites] = useState<SiteOption[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    site_id: 0, comm_type: 'radio', priority: 'normal',
    subject: '', message: '', from_name: '', to_name: '',
  })

  const [resolveModal, setResolveModal] = useState<CommEntry | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolved: 'resolved', resolution_notes: '' })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name, client_name: s.client_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchLog = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 30 }
      if (typeFilter) params.comm_type = typeFilter
      if (priorityFilter) params.priority = priorityFilter
      if (resolvedFilter) params.resolved = resolvedFilter
      if (searchQuery) params.search = searchQuery
      const res = await commLogApi.list(params)
      setEntries(res.data.items)
      setEntryTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [typeFilter, priorityFilter, resolvedFilter, searchQuery])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await commLogApi.dashboard(30)
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'log') fetchLog()
    else fetchDashboard()
  }, [tab, fetchLog, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.subject) return
    const data = { ...createForm, site_id: createForm.site_id || undefined }
    try {
      await commLogApi.create(data)
      setShowCreate(false)
      setCreateForm({ site_id: 0, comm_type: 'radio', priority: 'normal', subject: '', message: '', from_name: '', to_name: '' })
      fetchLog()
    } catch { /* ignore */ }
  }

  const handleResolve = async () => {
    if (!resolveModal) return
    try {
      await commLogApi.resolve(resolveModal.log_id, resolveForm)
      setResolveModal(null)
      fetchLog()
    } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'normal': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const resolvedColor = (r: string) => {
    switch (r) {
      case 'open': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'escalated': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const typeIcon = (t: string) => {
    switch (t) {
      case 'radio': return <Radio className="w-3 h-3" />
      case 'phone': return <Phone className="w-3 h-3" />
      case 'email': return <Mail className="w-3 h-3" />
      case 'whatsapp': return <MessageSquare className="w-3 h-3" />
      default: return <Radio className="w-3 h-3" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communication Log</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Control room communications, alerts, and escalations
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'log', label: 'Log', icon: Radio },
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── LOG TAB ────────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Types</option>
              {COMM_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={resolvedFilter} onChange={(e) => setResolvedFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">{entryTotal} entries</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">From / To</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">When</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No communication logs found'}
                    </td>
                  </tr>
                ) : (
                  entries.map((c) => (
                    <tr key={c.log_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          {typeIcon(c.comm_type)}
                          <span className="capitalize text-xs">{c.comm_type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(c.priority)}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium max-w-[250px] truncate">{c.subject}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.site_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {c.from_name && <span>{c.from_name}</span>}
                        {c.from_name && c.to_name && <span> → </span>}
                        {c.to_name && <span>{c.to_name}</span>}
                        {!c.from_name && !c.to_name && '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resolvedColor(c.resolved)}`}>
                          {c.resolved}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        {c.resolved === 'open' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setResolveModal(c); setResolveForm({ resolved: 'resolved', resolution_notes: '' }) }}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 text-xs font-medium"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => { setResolveModal(c); setResolveForm({ resolved: 'escalated', resolution_notes: '' }) }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium"
                            >
                              Escalate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Open</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboard.open}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboard.resolved}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Escalated</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboard.escalated}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By Type */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By Type</h3>
              {dashboard.by_type.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_type.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Priority */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By Priority</h3>
              {PRIORITIES.map((p) => (
                <div key={p} className="flex items-center justify-between py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(p)}`}>{p}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{dashboard.by_priority[p] || 0}</span>
                </div>
              ))}
            </div>

            {/* By Site */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By Site</h3>
              {dashboard.sites.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.sites.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.site_name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{s.total}</span>
                        {s.open > 0 && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                            {s.open} open
                          </span>
                        )}
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

      {/* ── CREATE MODAL ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">New Communication Log</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={createForm.comm_type} onChange={(e) => setCreateForm({ ...createForm, comm_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {COMM_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site</label>
                <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value={0}>General (no site)</option>
                  {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <input type="text" value={createForm.subject} onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea value={createForm.message} onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                  <input type="text" value={createForm.from_name} onChange={(e) => setCreateForm({ ...createForm, from_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                  <input type="text" value={createForm.to_name} onChange={(e) => setCreateForm({ ...createForm, to_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.subject}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Log Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESOLVE MODAL ──────────────────────────────────────────────────── */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {resolveForm.resolved === 'escalated' ? 'Escalate' : 'Resolve'} Entry
              </h3>
              <button onClick={() => setResolveModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Subject:</strong> {resolveModal.subject}</p>
                <p><strong>Type:</strong> {resolveModal.comm_type} | <strong>Priority:</strong> {resolveModal.priority}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label>
                <select value={resolveForm.resolved} onChange={(e) => setResolveForm({ ...resolveForm, resolved: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={resolveForm.resolution_notes} onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
              <button onClick={handleResolve}
                className={`px-4 py-2 text-sm text-white rounded-lg ${resolveForm.resolved === 'escalated' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {resolveForm.resolved === 'escalated' ? 'Escalate' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
