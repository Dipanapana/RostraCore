'use client'

import { useState, useEffect, useCallback } from 'react'
import { dobApi, sitesApi } from '@/services/api'
import {
  BookOpen,
  Plus,
  X,
  Search,
  BarChart3,
  Clock,
  MapPin,
} from 'lucide-react'

interface OccurrenceEntry {
  entry_id: number
  site_id: number
  site_name: string
  category: string
  description: string
  action_taken: string | null
  employee_id: number | null
  employee_name: string | null
  shift_id: number | null
  occurred_at: string
  created_at: string
}

interface Dashboard {
  period_days: number
  total: number
  by_category: [string, number][]
  sites: { site_id: number; site_name: string; total: number }[]
  daily_trend: [string, number][]
}

interface SiteOption {
  site_id: number
  site_name: string
  client_name: string
}

const CATEGORIES = [
  'general', 'patrol', 'access_control', 'alarm', 'incident',
  'maintenance', 'handover', 'weather', 'visitor', 'delivery', 'vehicle', 'other',
]

export default function OccurrenceBookPage() {
  const [tab, setTab] = useState<'entries' | 'dashboard'>('entries')

  const [entries, setEntries] = useState<OccurrenceEntry[]>([])
  const [entryTotal, setEntryTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState(0)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    site_id: 0, category: 'general', description: '', action_taken: '',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name, client_name: s.client_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 7 }
      if (categoryFilter) params.category = categoryFilter
      if (searchQuery) params.search = searchQuery
      if (siteFilter) params.site_id = siteFilter
      const res = await dobApi.list(params)
      setEntries(res.data.items)
      setEntryTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [categoryFilter, searchQuery, siteFilter])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dobApi.dashboard(30)
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'entries') fetchEntries()
    else fetchDashboard()
  }, [tab, fetchEntries, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.site_id || !createForm.description) return
    try {
      await dobApi.create(createForm)
      setShowCreate(false)
      setCreateForm({ site_id: 0, category: 'general', description: '', action_taken: '' })
      fetchEntries()
    } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const categoryColor = (c: string) => {
    const colors: Record<string, string> = {
      incident: 'bg-red-100 text-red-700',
      alarm: 'bg-orange-100 text-orange-700',
      patrol: 'bg-blue-100 text-blue-700',
      handover: 'bg-purple-100 text-purple-700',
      access_control: 'bg-amber-50 text-amber-700',
      maintenance: 'bg-teal-100 text-teal-700',
      visitor: 'bg-emerald-50 text-emerald-700',
    }
    return colors[c] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Occurrence Book</h1>
          <p className="text-gray-500 text-sm mt-1">
            Daily event log for all site occurrences
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
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'entries', label: 'Entries', icon: BookOpen },
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── ENTRIES TAB ────────────────────────────────────────────────────── */}
      {tab === 'entries' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
              />
            </div>
            <select value={siteFilter} onChange={(e) => setSiteFilter(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value={0}>All Sites</option>
              {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <span className="text-sm text-gray-500">{entryTotal} entries (last 7 days)</span>
          </div>

          {/* Entries as timeline */}
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                {loading ? 'Loading...' : 'No occurrence entries found'}
              </div>
            ) : (
              entries.map((e) => (
                <div key={e.entry_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(e.category)}`}>
                          {e.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {e.site_name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{e.description}</p>
                      {e.action_taken && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Action:</strong> {e.action_taken}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(e.occurred_at)}
                      </p>
                      {e.employee_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{e.employee_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Entries ({dashboard.period_days}d)</p>
            <p className="text-3xl font-bold text-gray-900">{dashboard.total}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By Category */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Category</h3>
              {dashboard.by_category.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_category.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(cat)}`}>
                        {cat.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Site */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Site</h3>
              {dashboard.sites.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.sites.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{s.site_name}</span>
                      <span className="text-sm font-medium text-gray-900">{s.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Daily Trend</h3>
              {dashboard.daily_trend.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-1">
                  {dashboard.daily_trend.slice(-7).map(([day, count]) => {
                    const max = Math.max(...dashboard.daily_trend.map(([, c]) => c), 1)
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20 shrink-0">
                          {new Date(day).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Occurrence Entry</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                  <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={0}>Select site...</option>
                    {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Describe what occurred..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                <textarea value={createForm.action_taken} onChange={(e) => setCreateForm({ ...createForm, action_taken: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="What action was taken in response..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.site_id || !createForm.description}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Log Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
