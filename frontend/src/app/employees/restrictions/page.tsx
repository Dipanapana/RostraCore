'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { guardRestrictionsApi, employeesApi, clientsApi } from '@/services/api'
import {
  ShieldBan,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Users,
  Building2,
  MapPin,
  Search,
  X,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Restriction {
  restriction_id: number
  org_id: number
  employee_id: number
  employee_name: string
  client_id: number | null
  client_name: string | null
  site_id: number | null
  site_name: string | null
  reason: string | null
  created_at: string
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  employee_number: string
}

interface Client {
  client_id: number
  client_name: string
}

interface Site {
  site_id: number
  site_name: string
  client_id: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuardRestrictionsPage() {
  const [loading, setLoading] = useState(true)
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Add modal state
  const [showAdd, setShowAdd] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loadingRef, setLoadingRef] = useState(false)

  // Form state
  const [formEmployee, setFormEmployee] = useState('')
  const [formClient, setFormClient] = useState('')
  const [formSite, setFormSite] = useState('')
  const [formReason, setFormReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchRestrictions = useCallback(async () => {
    try {
      const res = await guardRestrictionsApi.list()
      setRestrictions(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load restrictions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRestrictions() }, [fetchRestrictions])

  const openAddModal = async () => {
    setShowAdd(true)
    setFormEmployee('')
    setFormClient('')
    setFormSite('')
    setFormReason('')
    setFormError(null)

    if (employees.length === 0) {
      setLoadingRef(true)
      try {
        const [empRes, cliRes] = await Promise.all([
          employeesApi.getAll(),
          clientsApi.getAll(),
        ])
        setEmployees(empRes.data)
        setClients(cliRes.data)
      } catch {
        // Non-critical — form will still work
      } finally {
        setLoadingRef(false)
      }
    }
  }

  // Load sites when client changes
  useEffect(() => {
    if (!formClient) {
      setSites([])
      setFormSite('')
      return
    }
    const loadSites = async () => {
      try {
        const res = await clientsApi.getSites(Number(formClient))
        setSites(res.data)
      } catch {
        setSites([])
      }
    }
    loadSites()
  }, [formClient])

  const handleAdd = async () => {
    if (!formEmployee) {
      setFormError('Please select an employee')
      return
    }
    if (!formClient && !formSite) {
      setFormError('Please select a client or site (or both)')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await guardRestrictionsApi.create({
        employee_id: Number(formEmployee),
        client_id: formClient ? Number(formClient) : undefined,
        site_id: formSite ? Number(formSite) : undefined,
        reason: formReason || undefined,
      })
      setShowAdd(false)
      fetchRestrictions()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to add restriction')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await guardRestrictionsApi.remove(id)
      setRestrictions((prev) => prev.filter((r) => r.restriction_id !== id))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove restriction')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = restrictions.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.employee_name.toLowerCase().includes(q) ||
      (r.client_name && r.client_name.toLowerCase().includes(q)) ||
      (r.site_name && r.site_name.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    )
  })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldBan className="w-6 h-6 text-red-500" />
              Guard Restrictions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage personnel blacklists — prevent specific guards from being assigned to clients or sites.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Restriction
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh] text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading restrictions…
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Restrictions', value: restrictions.length, icon: ShieldBan, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                {
                  label: 'Guards Affected',
                  value: new Set(restrictions.map((r) => r.employee_id)).size,
                  icon: Users,
                  color: 'text-slate-600',
                  bg: 'bg-slate-50 dark:bg-slate-900/30',
                },
                {
                  label: 'Clients Affected',
                  value: new Set(restrictions.filter((r) => r.client_id).map((r) => r.client_id)).size,
                  icon: Building2,
                  color: 'text-violet-500',
                  bg: 'bg-violet-50 dark:bg-violet-900/20',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            {/* Search bar */}
            {restrictions.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by guard, client, site, or reason…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
              </div>
            )}

            {/* Restrictions table */}
            {filtered.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                        {['Guard', 'Client', 'Site', 'Reason', 'Date Added', ''].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                      {filtered.map((r) => (
                        <tr key={r.restriction_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              href={`/employees/${r.employee_id}`}
                              className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              {r.employee_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.client_id ? (
                              <Link
                                href={`/clients/${r.client_id}`}
                                className="text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                              >
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {r.client_name}
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {r.site_id ? (
                              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {r.site_name}
                              </span>
                            ) : (
                              <span className="text-slate-400">All sites</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                            {r.reason || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                            {fmtDate(r.created_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDelete(r.restriction_id)}
                              disabled={deleting === r.restriction_id}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                              title="Remove restriction"
                            >
                              {deleting === r.restriction_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : restrictions.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No restrictions match your search.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <ShieldBan className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No guard restrictions configured.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add restrictions to prevent specific guards from being assigned to certain clients or sites.
                </p>
              </div>
            )}
          </>
        )}

        {/* Add Restriction Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldBan className="w-5 h-5 text-red-500" /> Add Restriction
                </h2>
                <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {loadingRef ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading data…
                  </div>
                ) : (
                  <>
                    {/* Employee */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Guard *</label>
                      <select
                        value={formEmployee}
                        onChange={(e) => setFormEmployee(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none text-slate-800 dark:text-slate-200"
                      >
                        <option value="">Select employee…</option>
                        {employees.map((e) => (
                          <option key={e.employee_id} value={e.employee_id}>
                            {e.first_name} {e.last_name} (#{e.employee_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Client */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client</label>
                      <select
                        value={formClient}
                        onChange={(e) => setFormClient(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none text-slate-800 dark:text-slate-200"
                      >
                        <option value="">All clients (select to filter)…</option>
                        {clients.map((c) => (
                          <option key={c.client_id} value={c.client_id}>
                            {c.client_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Site (only if client selected) */}
                    {formClient && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Site (optional — leave blank for all sites)</label>
                        <select
                          value={formSite}
                          onChange={(e) => setFormSite(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                          <option value="">All sites for this client</option>
                          {sites.map((s) => (
                            <option key={s.site_id} value={s.site_id}>
                              {s.site_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reason</label>
                      <textarea
                        value={formReason}
                        onChange={(e) => setFormReason(e.target.value)}
                        rows={2}
                        placeholder="Optional — e.g., client complaint, performance issue…"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none"
                      />
                    </div>

                    {formError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={submitting || loadingRef}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Restriction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
