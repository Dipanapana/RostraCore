'use client'

import { useState, useEffect, useCallback } from 'react'
import { geofenceApi } from '@/services/api'
import {
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  ChevronDown,
  X,
} from 'lucide-react'

interface SiteGeofence {
  site_id: number
  site_name: string
  client_name: string
  gps_lat: number | null
  gps_lng: number | null
  geofence_enabled: boolean
  geofence_radius: number
  has_coordinates: boolean
}

interface Violation {
  violation_id: number
  site_id: number
  site_name: string
  employee_id: number
  employee_name: string
  violation_type: string
  lat: number
  lng: number
  distance_from_site: number
  resolved: string
  notes: string | null
  created_at: string
  resolved_at: string | null
}

interface Dashboard {
  period_days: number
  total_violations: number
  unresolved: number
  acknowledged: number
  dismissed: number
  enabled_sites: number
  total_sites: number
  sites: { site_id: number; site_name: string; total: number; unresolved: number }[]
  top_offenders: { employee_id: number; employee_name: string; count: number }[]
}

export default function GeofencingPage() {
  const [tab, setTab] = useState<'violations' | 'sites' | 'dashboard'>('violations')

  // Violations state
  const [violations, setViolations] = useState<Violation[]>([])
  const [violationTotal, setViolationTotal] = useState(0)
  const [resolvedFilter, setResolvedFilter] = useState<string>('')
  const [resolveModal, setResolveModal] = useState<Violation | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolution: 'acknowledged', notes: '' })

  // Sites state
  const [sites, setSites] = useState<SiteGeofence[]>([])
  const [editSite, setEditSite] = useState<SiteGeofence | null>(null)
  const [editForm, setEditForm] = useState({ geofence_enabled: false, geofence_radius: 200 })

  // Dashboard state
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  const [loading, setLoading] = useState(false)

  // ── Fetch violations ─────────────────────────────────────────────────────
  const fetchViolations = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (resolvedFilter) params.resolved = resolvedFilter
      const res = await geofenceApi.listViolations(params)
      setViolations(res.data.items)
      setViolationTotal(res.data.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [resolvedFilter])

  // ── Fetch sites ──────────────────────────────────────────────────────────
  const fetchSites = useCallback(async () => {
    setLoading(true)
    try {
      const res = await geofenceApi.listSites()
      setSites(res.data)
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
      const res = await geofenceApi.dashboard(30)
      setDashboard(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'violations') fetchViolations()
    else if (tab === 'sites') fetchSites()
    else if (tab === 'dashboard') fetchDashboard()
  }, [tab, fetchViolations, fetchSites, fetchDashboard])

  // ── Resolve violation ────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!resolveModal) return
    try {
      await geofenceApi.resolveViolation(resolveModal.violation_id, resolveForm)
      setResolveModal(null)
      setResolveForm({ resolution: 'acknowledged', notes: '' })
      fetchViolations()
    } catch {
      // ignore
    }
  }

  // ── Update site geofence ─────────────────────────────────────────────────
  const handleUpdateSite = async () => {
    if (!editSite) return
    try {
      await geofenceApi.updateSite(editSite.site_id, editForm)
      setEditSite(null)
      fetchSites()
    } catch {
      // ignore
    }
  }

  // ── Toggle site geofence quickly ─────────────────────────────────────────
  const toggleGeofence = async (site: SiteGeofence) => {
    try {
      await geofenceApi.updateSite(site.site_id, { geofence_enabled: !site.geofence_enabled })
      fetchSites()
    } catch {
      // ignore
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geofencing</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Monitor guard locations and site boundary compliance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'violations', label: 'Violations', icon: AlertTriangle },
            { key: 'sites', label: 'Site Config', icon: Settings },
            { key: 'dashboard', label: 'Dashboard', icon: Shield },
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

      {/* ── VIOLATIONS TAB ─────────────────────────────────────────────────── */}
      {tab === 'violations' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-3 items-center">
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="unresolved">Unresolved</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {violationTotal} violation{violationTotal !== 1 ? 's' : ''}
            </span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {violations.filter((v) => v.resolved === 'unresolved').length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unresolved</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {violations.filter((v) => v.resolved === 'acknowledged').length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledged</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{violationTotal}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total (30d)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Violations Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Guard</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Distance</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">When</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No geofence violations found'}
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr key={v.violation_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{v.employee_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.site_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {v.violation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {v.distance_from_site ? `${v.distance_from_site}m` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            v.resolved === 'unresolved'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : v.resolved === 'acknowledged'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {v.resolved}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(v.created_at)}</td>
                      <td className="px-4 py-3">
                        {v.resolved === 'unresolved' && (
                          <button
                            onClick={() => {
                              setResolveModal(v)
                              setResolveForm({ resolution: 'acknowledged', notes: '' })
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium"
                          >
                            Resolve
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

      {/* ── SITES CONFIG TAB ───────────────────────────────────────────────── */}
      {tab === 'sites' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure geofence boundaries per site. Sites need GPS coordinates to enable geofencing.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">GPS</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Radius</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Enabled</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No sites found'}
                    </td>
                  </tr>
                ) : (
                  sites.map((s) => (
                    <tr key={s.site_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{s.site_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.client_name}</td>
                      <td className="px-4 py-3">
                        {s.has_coordinates ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                            <MapPin className="w-3 h-3" />
                            {s.gps_lat?.toFixed(4)}, {s.gps_lng?.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">No GPS</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.geofence_radius}m</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleGeofence(s)}
                          disabled={!s.has_coordinates}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            s.geofence_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          } ${!s.has_coordinates ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              s.geofence_enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setEditSite(s)
                            setEditForm({
                              geofence_enabled: s.geofence_enabled,
                              geofence_radius: s.geofence_radius,
                            })
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium"
                        >
                          Configure
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Violations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_violations}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unresolved</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboard.unresolved}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Enabled Sites</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dashboard.enabled_sites}/{dashboard.total_sites}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.period_days}d</p>
            </div>
          </div>

          {/* Two-column: Sites + Offenders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Per-Site Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Violations by Site</h3>
              {dashboard.sites.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.sites.map((s) => (
                    <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.site_name}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{s.total} total</span>
                        {s.unresolved > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {s.unresolved} open
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Offenders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Offenders</h3>
              {dashboard.top_offenders.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_offenders.map((e, idx) => (
                    <div key={e.employee_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{e.employee_name}</span>
                      </div>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">{e.count} violations</span>
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

      {/* ── RESOLVE MODAL ──────────────────────────────────────────────────── */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Resolve Violation</h3>
              <button onClick={() => setResolveModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Guard:</strong> {resolveModal.employee_name}</p>
                <p><strong>Site:</strong> {resolveModal.site_name}</p>
                <p><strong>Distance:</strong> {resolveModal.distance_from_site}m from site</p>
                <p><strong>When:</strong> {formatDate(resolveModal.created_at)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label>
                <select
                  value={resolveForm.resolution}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="acknowledged">Acknowledged</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={resolveForm.notes}
                  onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SITE MODAL ────────────────────────────────────────────────── */}
      {editSite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Configure Geofence</h3>
              <button onClick={() => setEditSite(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Site:</strong> {editSite.site_name || editSite.client_name}</p>
                {editSite.has_coordinates ? (
                  <p className="text-green-600 dark:text-green-400">
                    GPS: {editSite.gps_lat?.toFixed(6)}, {editSite.gps_lng?.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-red-500">No GPS coordinates set. Add GPS to the site first.</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Geofence Enabled</label>
                <button
                  onClick={() => setEditForm({ ...editForm, geofence_enabled: !editForm.geofence_enabled })}
                  disabled={!editSite.has_coordinates}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.geofence_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  } ${!editSite.has_coordinates ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.geofence_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Radius (meters): {editForm.geofence_radius}m
                </label>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={editForm.geofence_radius}
                  onChange={(e) => setEditForm({ ...editForm, geofence_radius: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>50m</span>
                  <span>500m</span>
                  <span>1000m</span>
                  <span>2000m</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setEditSite(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSite}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
