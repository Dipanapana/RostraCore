'use client'

import { useState, useEffect, useCallback } from 'react'
import { announcementsApi, sitesApi } from '@/services/api'
import {
  Megaphone,
  Plus,
  X,
  Search,
  BarChart3,
  Pin,
  Pencil,
  Trash2,
} from 'lucide-react'

interface AnnouncementItem {
  announcement_id: number
  title: string
  content: string
  priority: string
  category: string | null
  site_id: number | null
  site_name: string | null
  is_pinned: boolean
  is_active: boolean
  published_at: string
  expires_at: string | null
  author_user_id: number | null
  author_name: string | null
  created_at: string
}

interface Dashboard {
  total_active: number
  pinned: number
  expired: number
  recent_7d: number
  by_priority: [string, number][]
  by_category: [string, number][]
}

interface SiteOption { site_id: number; site_name: string }

const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const CATEGORIES = ['general', 'policy', 'safety', 'hr', 'operations']

const priorityColor = (p: string) => {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-600',
  }
  return colors[p] || colors.normal
}

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<'list' | 'dashboard'>('list')

  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [total, setTotal] = useState(0)
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '', content: '', priority: 'normal', category: 'general',
    site_id: 0, is_pinned: false, expires_at: '',
  })

  const [editItem, setEditItem] = useState<AnnouncementItem | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '', priority: 'normal', is_pinned: false, is_active: true })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sitesApi.list().then((res) => {
      setSites((res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id, site_name: s.site_name || s.client_name,
      })))
    }).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (priorityFilter) params.priority = priorityFilter
      if (categoryFilter) params.category = categoryFilter
      if (searchQuery) params.search = searchQuery
      const res = await announcementsApi.list(params)
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [priorityFilter, categoryFilter, searchQuery])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await announcementsApi.dashboard()
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'list') fetchList()
    else fetchDashboard()
  }, [tab, fetchList, fetchDashboard])

  const handleCreate = async () => {
    if (!createForm.title || !createForm.content) return
    try {
      const payload: any = {
        title: createForm.title,
        content: createForm.content,
        priority: createForm.priority,
        category: createForm.category,
        is_pinned: createForm.is_pinned,
      }
      if (createForm.site_id) payload.site_id = createForm.site_id
      if (createForm.expires_at) payload.expires_at = createForm.expires_at
      await announcementsApi.create(payload)
      setShowCreate(false)
      setCreateForm({ title: '', content: '', priority: 'normal', category: 'general', site_id: 0, is_pinned: false, expires_at: '' })
      fetchList()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    try {
      await announcementsApi.update(editItem.announcement_id, editForm)
      setEditItem(null)
      fetchList()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await announcementsApi.remove(id)
      fetchList()
    } catch { /* ignore */ }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-ZA', { dateStyle: 'medium' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">
            Company-wide and site-specific announcements
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'list', label: 'Announcements', icon: Megaphone },
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

      {/* ── LIST TAB ──────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-56"
              />
            </div>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <span className="text-sm text-gray-500">{total} active announcements</span>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                {loading ? 'Loading...' : 'No announcements found'}
              </div>
            ) : (
              items.map((a) => (
                <div key={a.announcement_id}
                  className={`bg-white rounded-xl shadow-sm border p-4 ${
                    a.is_pinned
                      ? 'border-blue-300 bg-blue-50/50'
                      : 'border-gray-100'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {a.is_pinned && <Pin className="w-3.5 h-3.5 text-blue-500" />}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(a.priority)}`}>
                          {a.priority}
                        </span>
                        {a.category && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {a.category}
                          </span>
                        )}
                        {a.site_name && (
                          <span className="text-xs text-gray-400">Site: {a.site_name}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>By {a.author_name || 'Unknown'}</span>
                        <span>{formatDate(a.published_at)}</span>
                        {a.expires_at && <span className="text-orange-500">Expires {formatDate(a.expires_at)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-3 shrink-0">
                      <button onClick={() => {
                        setEditItem(a)
                        setEditForm({
                          title: a.title, content: a.content,
                          priority: a.priority, is_pinned: a.is_pinned, is_active: a.is_active,
                        })
                      }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a.announcement_id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active', value: dashboard.total_active, color: 'text-blue-600' },
              { label: 'Pinned', value: dashboard.pinned, color: 'text-purple-600' },
              { label: 'Expired', value: dashboard.expired, color: 'text-orange-600' },
              { label: 'Last 7 Days', value: dashboard.recent_7d, color: 'text-green-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Priority</h3>
              {dashboard.by_priority.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_priority.map(([p, count]) => (
                    <div key={p} className="flex items-center justify-between py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(p)}`}>{p}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Category</h3>
              {dashboard.by_category.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_category.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700 capitalize">{cat}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
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

      {/* ── CREATE MODAL ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Announcement</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Announcement title..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  rows={4} className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Announcement details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site (optional)</label>
                  <select value={createForm.site_id} onChange={(e) => setCreateForm({ ...createForm, site_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={0}>All sites</option>
                    {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                  <input type="date" value={createForm.expires_at}
                    onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={createForm.is_pinned}
                  onChange={(e) => setCreateForm({ ...createForm, is_pinned: e.target.checked })}
                  className="rounded border-gray-300" />
                Pin this announcement
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.title || !createForm.content}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Edit Announcement</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={4} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={editForm.is_pinned}
                      onChange={(e) => setEditForm({ ...editForm, is_pinned: e.target.checked })}
                      className="rounded border-gray-300" />
                    Pinned
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="rounded border-gray-300" />
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleUpdate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
