'use client'

import { useState, useEffect, useCallback } from 'react'
import { visitorsApi, sitesApi } from '@/services/api'
import {
  UserCheck,
  UserX,
  Users,
  Building2,
  Clock,
  Search,
  Plus,
  X,
  LogOut,
} from 'lucide-react'

interface VisitorRecord {
  visitor_id: number
  site_id: number
  site_name: string
  full_name: string
  id_number: string | null
  company: string | null
  phone: string | null
  vehicle_reg: string | null
  purpose: string
  visiting_person: string | null
  badge_number: string | null
  status: string
  signed_in_at: string
  signed_out_at: string | null
  expected_out_at: string | null
  processed_by_name: string | null
  notes: string | null
}

interface SiteOption {
  site_id: number
  site_name: string
  client_name: string
}

interface Dashboard {
  period_days: number
  total_visitors: number
  currently_in: number
  signed_out: number
  sites: { site_id: number; site_name: string; total: number; currently_in: number }[]
  busiest_hours: [number, number][]
  top_companies: [string, number][]
}

export default function VisitorsPage() {
  const [tab, setTab] = useState<'log' | 'on-site' | 'dashboard'>('log')

  // Log state
  const [visitors, setVisitors] = useState<VisitorRecord[]>([])
  const [visitorTotal, setVisitorTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // On-site state
  const [onSiteVisitors, setOnSiteVisitors] = useState<VisitorRecord[]>([])
  const [onSiteCount, setOnSiteCount] = useState(0)

  // Dashboard
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  // Sites for dropdown
  const [sites, setSites] = useState<SiteOption[]>([])

  // Sign-in modal
  const [showSignIn, setShowSignIn] = useState(false)
  const [signInForm, setSignInForm] = useState({
    site_id: 0,
    full_name: '',
    id_number: '',
    company: '',
    phone: '',
    vehicle_reg: '',
    purpose: '',
    visiting_person: '',
    badge_number: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)

  // ── Fetch sites ──────────────────────────────────────────────────────────
  useEffect(() => {
    sitesApi.list().then((res) => {
      const s = (res.data.items || res.data || []).map((s: any) => ({
        site_id: s.site_id,
        site_name: s.site_name || s.client_name,
        client_name: s.client_name,
      }))
      setSites(s)
    }).catch(() => {})
  }, [])

  // ── Fetch visitor log ────────────────────────────────────────────────────
  const fetchLog = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100, days: 30 }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      const res = await visitorsApi.list(params)
      setVisitors(res.data.items)
      setVisitorTotal(res.data.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  // ── Fetch on-site ────────────────────────────────────────────────────────
  const fetchOnSite = useCallback(async () => {
    setLoading(true)
    try {
      const res = await visitorsApi.onSite()
      setOnSiteVisitors(res.data.visitors)
      setOnSiteCount(res.data.count)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch dashboard ──────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await visitorsApi.dashboard(30)
      setDashboard(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'log') fetchLog()
    else if (tab === 'on-site') fetchOnSite()
    else if (tab === 'dashboard') fetchDashboard()
  }, [tab, fetchLog, fetchOnSite, fetchDashboard])

  // ── Sign in visitor ──────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!signInForm.site_id || !signInForm.full_name || !signInForm.purpose) return
    try {
      await visitorsApi.signIn(signInForm)
      setShowSignIn(false)
      setSignInForm({
        site_id: 0, full_name: '', id_number: '', company: '', phone: '',
        vehicle_reg: '', purpose: '', visiting_person: '', badge_number: '', notes: '',
      })
      if (tab === 'log') fetchLog()
      else if (tab === 'on-site') fetchOnSite()
    } catch {
      // ignore
    }
  }

  // ── Sign out visitor ─────────────────────────────────────────────────────
  const handleSignOut = async (visitorId: number) => {
    try {
      await visitorsApi.signOut(visitorId)
      if (tab === 'log') fetchLog()
      else if (tab === 'on-site') fetchOnSite()
    } catch {
      // ignore
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const formatHour = (h: number) => {
    if (h === 0) return '12 AM'
    if (h < 12) return `${h} AM`
    if (h === 12) return '12 PM'
    return `${h - 12} PM`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visitor Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Sign visitors in and out at your sites
          </p>
        </div>
        <button
          onClick={() => setShowSignIn(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Sign In Visitor
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'log', label: 'Visitor Log', icon: Users },
            { key: 'on-site', label: 'Currently On Site', icon: UserCheck },
            { key: 'dashboard', label: 'Dashboard', icon: Building2 },
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
              {key === 'on-site' && onSiteCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                  {onSiteCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── VISITOR LOG TAB ────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, company, ID..."
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="signed_in">Signed In</option>
              <option value="signed_out">Signed Out</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {visitorTotal} record{visitorTotal !== 1 ? 's' : ''} (last 30 days)
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Visitor</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Signed In</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Signed Out</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No visitor records found'}
                    </td>
                  </tr>
                ) : (
                  visitors.map((v) => (
                    <tr key={v.visitor_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white font-medium">{v.full_name}</div>
                        {v.id_number && <div className="text-xs text-gray-400">ID: {v.id_number}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.company || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.site_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{v.purpose}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            v.status === 'signed_in'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {v.status === 'signed_in' ? 'On Site' : 'Left'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(v.signed_in_at)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(v.signed_out_at)}</td>
                      <td className="px-4 py-3">
                        {v.status === 'signed_in' && (
                          <button
                            onClick={() => handleSignOut(v.visitor_id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium"
                          >
                            <LogOut className="w-3 h-3" />
                            Sign Out
                          </button>
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

      {/* ── ON-SITE TAB ────────────────────────────────────────────────────── */}
      {tab === 'on-site' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{onSiteCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Visitors Currently On Site</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Visitor</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Purpose</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Vehicle</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Signed In</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {onSiteVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No visitors currently on site'}
                    </td>
                  </tr>
                ) : (
                  onSiteVisitors.map((v) => (
                    <tr key={v.visitor_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-white font-medium">{v.full_name}</div>
                        {v.phone && <div className="text-xs text-gray-400">{v.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.company || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.site_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.purpose}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.vehicle_reg || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(v.signed_in_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSignOut(v.visitor_id)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium"
                        >
                          <LogOut className="w-3 h-3" />
                          Sign Out
                        </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Visitors ({dashboard.period_days}d)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_visitors}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently On Site</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboard.currently_in}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Signed Out</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{dashboard.signed_out}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Per-Site */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Visitors by Site</h3>
              {dashboard.sites.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.sites.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.site_name}</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{s.total}</span>
                        {s.currently_in > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {s.currently_in} in
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Companies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Companies</h3>
              {dashboard.top_companies.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_companies.map(([name, count], idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{count} visits</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Busiest Hours */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Busiest Hours</h3>
              {dashboard.busiest_hours.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.busiest_hours.map(([hour, count], idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatHour(hour)}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{count} visitors</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && !dashboard && (
        <div className="text-center py-12 text-gray-400">{loading ? 'Loading dashboard...' : 'No data available'}</div>
      )}

      {/* ── SIGN-IN MODAL ──────────────────────────────────────────────────── */}
      {showSignIn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Sign In Visitor</h3>
              <button onClick={() => setShowSignIn(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site *</label>
                <select
                  value={signInForm.site_id}
                  onChange={(e) => setSignInForm({ ...signInForm, site_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value={0}>Select site...</option>
                  {sites.map((s) => (
                    <option key={s.site_id} value={s.site_id}>
                      {s.site_name} ({s.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={signInForm.full_name}
                    onChange={(e) => setSignInForm({ ...signInForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID / Passport</label>
                  <input
                    type="text"
                    value={signInForm.id_number}
                    onChange={(e) => setSignInForm({ ...signInForm, id_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <input
                    type="text"
                    value={signInForm.company}
                    onChange={(e) => setSignInForm({ ...signInForm, company: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={signInForm.phone}
                    onChange={(e) => setSignInForm({ ...signInForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Reg</label>
                  <input
                    type="text"
                    value={signInForm.vehicle_reg}
                    onChange={(e) => setSignInForm({ ...signInForm, vehicle_reg: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Badge Number</label>
                  <input
                    type="text"
                    value={signInForm.badge_number}
                    onChange={(e) => setSignInForm({ ...signInForm, badge_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose of Visit *</label>
                <input
                  type="text"
                  value={signInForm.purpose}
                  onChange={(e) => setSignInForm({ ...signInForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Delivery, Meeting, Maintenance..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Person Being Visited</label>
                <input
                  type="text"
                  value={signInForm.visiting_person}
                  onChange={(e) => setSignInForm({ ...signInForm, visiting_person: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={signInForm.notes}
                  onChange={(e) => setSignInForm({ ...signInForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSignIn(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSignIn}
                disabled={!signInForm.site_id || !signInForm.full_name || !signInForm.purpose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
