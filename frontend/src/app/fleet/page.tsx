'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Car, Plus, Search, X, Trash2, Edit2,
  AlertTriangle, Clock, Wrench, MapPin, BarChart3, Fuel,
} from 'lucide-react'
import { fleetApi, sitesApi, employeesApi } from '@/services/api'

// ── helpers ────────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  const m: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    in_service: 'bg-amber-500/20 text-amber-400',
    decommissioned: 'bg-slate-500/20 text-slate-400',
  }
  return m[s] || 'bg-slate-500/20 text-slate-400'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', in_service: 'In Service', decommissioned: 'Decommissioned',
}

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid']

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtKm(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toLocaleString()} km`
}

function isExpiring(d: string | null | undefined, days = 30): boolean {
  if (!d) return false
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  return diff > 0 && diff <= days
}

function isExpired(d: string | null | undefined): boolean {
  if (!d) return false
  return new Date(d) <= new Date()
}

// ── component ──────────────────────────────────────────────────────────────

export default function FleetPage() {
  const [tab, setTab] = useState<'list' | 'dashboard'>('list')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Lookups
  const [sites, setSites] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({
    registration: '', make: '', model: '', year: '', colour: '',
    vin: '', fleet_number: '', assigned_site_id: '', assigned_employee_id: '',
    current_mileage: '', fuel_type: '', license_expiry: '',
    service_due_date: '', service_due_mileage: '', notes: '',
  })

  // ── loaders ──

  const loadVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (siteFilter) params.assigned_site_id = Number(siteFilter)
      const { data } = await fleetApi.list(params)
      setVehicles(data.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [search, statusFilter, siteFilter])

  const loadDashboard = useCallback(async () => {
    try { const { data } = await fleetApi.dashboard(); setDashboard(data) } catch { /* ignore */ }
  }, [])

  const loadLookups = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([sitesApi.getAll(), employeesApi.getAll({ status: 'active', limit: 1000 })])
      setSites(s.data?.sites || s.data?.items || s.data || [])
      setEmployees(e.data?.employees || e.data?.items || e.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadVehicles(); loadDashboard(); loadLookups() }, [loadVehicles, loadDashboard, loadLookups])

  // ── actions ──

  const openCreate = () => {
    setEditItem(null)
    setForm({ registration: '', make: '', model: '', year: '', colour: '', vin: '', fleet_number: '', assigned_site_id: '', assigned_employee_id: '', current_mileage: '', fuel_type: '', license_expiry: '', service_due_date: '', service_due_mileage: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (v: any) => {
    setEditItem(v)
    setForm({
      registration: v.registration || '', make: v.make || '', model: v.model || '',
      year: v.year ? String(v.year) : '', colour: v.colour || '', vin: v.vin || '',
      fleet_number: v.fleet_number || '',
      assigned_site_id: v.assigned_site_id ? String(v.assigned_site_id) : '',
      assigned_employee_id: v.assigned_employee_id ? String(v.assigned_employee_id) : '',
      current_mileage: v.current_mileage ? String(v.current_mileage) : '',
      fuel_type: v.fuel_type || '',
      license_expiry: v.license_expiry ? v.license_expiry.slice(0, 10) : '',
      service_due_date: v.service_due_date ? v.service_due_date.slice(0, 10) : '',
      service_due_mileage: v.service_due_mileage ? String(v.service_due_mileage) : '',
      notes: v.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      const payload: any = {
        registration: form.registration,
        make: form.make || null, model: form.model || null,
        year: form.year ? Number(form.year) : null, colour: form.colour || null,
        vin: form.vin || null, fleet_number: form.fleet_number || null,
        assigned_site_id: form.assigned_site_id ? Number(form.assigned_site_id) : null,
        assigned_employee_id: form.assigned_employee_id ? Number(form.assigned_employee_id) : null,
        current_mileage: form.current_mileage ? Number(form.current_mileage) : null,
        fuel_type: form.fuel_type || null,
        license_expiry: form.license_expiry || null,
        service_due_date: form.service_due_date || null,
        service_due_mileage: form.service_due_mileage ? Number(form.service_due_mileage) : null,
        notes: form.notes || null,
      }
      if (editItem) {
        await fleetApi.update(editItem.vehicle_id, payload)
      } else {
        await fleetApi.create(payload)
      }
      setShowModal(false)
      loadVehicles()
      loadDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Decommission this vehicle?')) return
    try { await fleetApi.remove(id); loadVehicles(); loadDashboard() } catch { /* ignore */ }
  }

  // ── render ──

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Car className="w-7 h-7 text-blue-400" /> Fleet Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Vehicle tracking, assignments, and service management</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {(['list', 'dashboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t === 'list' ? 'Vehicles' : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search registration, make, model…" className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">All Sites</option>
              {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Registration</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Site</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Driver</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Mileage</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">License Expiry</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Service Due</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading…</td></tr>
                  ) : vehicles.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No vehicles found</td></tr>
                  ) : vehicles.map((v: any) => (
                    <tr key={v.vehicle_id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{v.registration}</span>
                        {v.fleet_number && <span className="text-slate-500 text-xs ml-2">#{v.fleet_number}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {[v.make, v.model, v.year].filter(Boolean).join(' ') || '—'}
                        {v.colour && <span className="text-slate-500 text-xs ml-1">({v.colour})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(v.status)}`}>
                          {STATUS_LABELS[v.status] || v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{v.assigned_site_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{v.assigned_employee_name || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{fmtKm(v.current_mileage)}</td>
                      <td className="px-4 py-3">
                        {v.license_expiry ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${isExpired(v.license_expiry) ? 'text-red-400' : isExpiring(v.license_expiry) ? 'text-amber-400' : 'text-slate-400'}`}>
                            {isExpired(v.license_expiry) && <AlertTriangle className="w-3 h-3" />}
                            {isExpiring(v.license_expiry) && <Clock className="w-3 h-3" />}
                            {fmtDate(v.license_expiry)}
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {v.service_due_date ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${isExpired(v.service_due_date) ? 'text-red-400' : isExpiring(v.service_due_date) ? 'text-amber-400' : 'text-slate-400'}`}>
                            {isExpired(v.service_due_date) && <Wrench className="w-3 h-3" />}
                            {fmtDate(v.service_due_date)}
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(v.vehicle_id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Vehicles', value: dashboard.total, icon: Car, colour: 'blue' },
              { label: 'Active', value: dashboard.active, icon: Car, colour: 'green' },
              { label: 'In Service', value: dashboard.in_service, icon: Wrench, colour: 'amber' },
              { label: 'Decommissioned', value: dashboard.decommissioned, icon: Car, colour: 'slate' },
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs font-medium">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 text-${kpi.colour}-400`} />
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'License Expiring', value: dashboard.license_expiring, colour: 'text-amber-400' },
              { label: 'License Expired', value: dashboard.license_expired, colour: 'text-red-400' },
              { label: 'Service Due', value: dashboard.service_due, colour: 'text-amber-400' },
              { label: 'Service Overdue', value: dashboard.service_overdue, colour: 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${item.colour}`}>{item.value}</p>
                <p className="text-slate-400 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-400" /> By Fuel Type
              </h3>
              {(dashboard.by_fuel || []).length === 0 ? (
                <p className="text-slate-500 text-sm">No fuel data</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.by_fuel.map(([fuel, count]: [string, number]) => (
                    <div key={fuel} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 capitalize">{fuel}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" /> By Site
              </h3>
              {(dashboard.by_site || []).length === 0 ? (
                <p className="text-slate-500 text-sm">No site assignments</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.by_site.map((s: any) => (
                    <div key={s.site_id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{s.site_name}</span>
                      <span className="text-white font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{editItem ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Registration *</label>
                  <input value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. GP 123-456" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fleet Number</label>
                  <input value={form.fleet_number} onChange={e => setForm({ ...form, fleet_number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. V-001" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Make</label>
                  <input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Toyota" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Model</label>
                  <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Hilux" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Colour</label>
                  <input value={form.colour} onChange={e => setForm({ ...form, colour: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">—</option>
                    {FUEL_TYPES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Assigned Site</label>
                  <select value={form.assigned_site_id} onChange={e => setForm({ ...form, assigned_site_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">— None —</option>
                    {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Assigned Driver</label>
                  <select value={form.assigned_employee_id} onChange={e => setForm({ ...form, assigned_employee_id: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">— None —</option>
                    {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Mileage (km)</label>
                  <input type="number" value={form.current_mileage} onChange={e => setForm({ ...form, current_mileage: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">License Expiry</label>
                  <input type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Service Due</label>
                  <input type="date" value={form.service_due_date} onChange={e => setForm({ ...form, service_due_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.registration} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {editItem ? 'Save Changes' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
