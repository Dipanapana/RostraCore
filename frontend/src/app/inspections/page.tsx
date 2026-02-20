'use client'

import { useState, useEffect, useCallback } from 'react'
import { inspectionsApi, sitesApi } from '@/services/api'
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  Filter,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  template_id: number
  site_id: number | null
  site_name: string
  name: string
  description: string | null
  is_active: boolean
  items: { key: string; label: string; required: boolean }[]
  item_count: number
  created_at: string
}

interface InspectionItem {
  inspection_id: number
  template_id: number
  template_name: string
  site_id: number
  site_name: string
  employee_id: number
  employee_name: string
  status: string
  responses: Record<string, { checked: boolean; note?: string }>
  overall_notes: string | null
  score_pct: number | null
  started_at: string
  completed_at: string | null
}

interface DashboardData {
  period_days: number
  total: number
  completed: number
  flagged: number
  in_progress: number
  avg_score: number
  sites: { site_id: number; site_name: string; total: number; completed: number; flagged: number; avg_score: number }[]
}

interface Site {
  site_id: number
  site_name: string
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', icon: Clock },
  completed:   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle },
  flagged:     { label: 'Flagged',     color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: AlertTriangle },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionsPage() {
  // Tabs
  const [tab, setTab] = useState<'inspections' | 'templates' | 'dashboard'>('inspections')

  // Inspections state
  const [inspections, setInspections] = useState<InspectionItem[]>([])
  const [inspTotal, setInspTotal] = useState(0)
  const [inspLoading, setInspLoading] = useState(true)
  const [inspStatus, setInspStatus] = useState('')

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([])
  const [tmplLoading, setTmplLoading] = useState(true)
  const [showCreateTmpl, setShowCreateTmpl] = useState(false)

  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashLoading, setDashLoading] = useState(true)

  // Shared
  const [sites, setSites] = useState<Site[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Create template form
  const [tmplForm, setTmplForm] = useState({ name: '', description: '', site_id: 0, items: [{ key: '', label: '', required: true }] })

  // ── Load sites once ─────────────────────────────────────────
  useEffect(() => {
    sitesApi.getAll().then(r => setSites(r.data || [])).catch(() => {})
  }, [])

  // ── Load inspections ────────────────────────────────────────
  const fetchInspections = useCallback(async () => {
    setInspLoading(true)
    try {
      const params: any = { limit: 100 }
      if (inspStatus) params.status = inspStatus
      const { data } = await inspectionsApi.list(params)
      setInspections(data.items || [])
      setInspTotal(data.total || 0)
    } catch { setInspections([]) }
    finally { setInspLoading(false) }
  }, [inspStatus])

  useEffect(() => { if (tab === 'inspections') fetchInspections() }, [tab, fetchInspections])

  // ── Load templates ──────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setTmplLoading(true)
    try {
      const { data } = await inspectionsApi.listTemplates({ active_only: false })
      setTemplates(data || [])
    } catch { setTemplates([]) }
    finally { setTmplLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'templates') fetchTemplates() }, [tab, fetchTemplates])

  // ── Load dashboard ──────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      const { data } = await inspectionsApi.dashboard(30)
      setDashboard(data)
    } catch { setDashboard(null) }
    finally { setDashLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'dashboard') fetchDashboard() }, [tab, fetchDashboard])

  // ── Create template ─────────────────────────────────────────
  const handleCreateTemplate = async () => {
    if (!tmplForm.name || tmplForm.items.some(i => !i.key || !i.label)) return
    setActionLoading(true)
    try {
      await inspectionsApi.createTemplate({
        name: tmplForm.name,
        description: tmplForm.description || undefined,
        site_id: tmplForm.site_id || undefined,
        items: tmplForm.items,
      })
      setShowCreateTmpl(false)
      setTmplForm({ name: '', description: '', site_id: 0, items: [{ key: '', label: '', required: true }] })
      fetchTemplates()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create template')
    } finally { setActionLoading(false) }
  }

  // ── Delete template ─────────────────────────────────────────
  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Deactivate this template?')) return
    try {
      await inspectionsApi.deleteTemplate(id)
      fetchTemplates()
    } catch { }
  }

  // ── Template form helpers ───────────────────────────────────
  const addItem = () => setTmplForm({ ...tmplForm, items: [...tmplForm.items, { key: '', label: '', required: true }] })
  const removeItem = (idx: number) => setTmplForm({ ...tmplForm, items: tmplForm.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, field: string, val: any) => {
    const items = [...tmplForm.items]
    items[idx] = { ...items[idx], [field]: val }
    // Auto-generate key from label
    if (field === 'label') {
      items[idx].key = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }
    setTmplForm({ ...tmplForm, items })
  }

  // ── Score color ─────────────────────────────────────────────
  const scoreColor = (pct: number | null) => {
    if (pct === null) return 'text-gray-400'
    if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (pct >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            Site Inspections
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage checklist templates and review completed inspections.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['inspections', 'templates', 'dashboard'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t === 'inspections' ? 'Inspections' : t === 'templates' ? 'Templates' : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* ════════════════════ INSPECTIONS TAB ════════════════════ */}
      {tab === 'inspections' && (
        <>
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={inspStatus}
              onChange={e => setInspStatus(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="flagged">Flagged</option>
            </select>
            <button onClick={fetchInspections} className="p-1.5 text-gray-400 hover:text-gray-600">
              <RefreshCw className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-400 ml-auto">{inspTotal} total</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {inspLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No inspections found</p>
                <p className="text-sm mt-1">Guards can start inspections from the mobile app or templates tab.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Template</th>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Guard</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Started</th>
                      <th className="px-4 py-3">Completed</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {inspections.map(insp => {
                      const cfg = STATUS_CFG[insp.status] || STATUS_CFG.in_progress
                      const Icon = cfg.icon
                      return (
                        <tr key={insp.inspection_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                              <Icon className="h-3 w-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{insp.template_name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{insp.site_name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{insp.employee_name}</td>
                          <td className={`px-4 py-3 font-semibold ${scoreColor(insp.score_pct)}`}>
                            {insp.score_pct !== null ? `${insp.score_pct}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(insp.started_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {insp.completed_at ? new Date(insp.completed_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                            {insp.overall_notes || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════ TEMPLATES TAB ════════════════════ */}
      {tab === 'templates' && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={fetchTemplates} className="p-1.5 text-gray-400 hover:text-gray-600">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowCreateTmpl(true)}
              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tmplLoading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No templates yet</p>
                <p className="text-sm mt-1">Create a checklist template to get started.</p>
              </div>
            ) : templates.map(tmpl => (
              <div key={tmpl.template_id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${tmpl.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{tmpl.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tmpl.site_name}</p>
                  </div>
                  <div className="flex gap-1">
                    {!tmpl.is_active && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded">Inactive</span>
                    )}
                    <button onClick={() => handleDeleteTemplate(tmpl.template_id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {tmpl.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{tmpl.description}</p>}
                <div className="mt-3 space-y-1">
                  {(tmpl.items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-3.5 h-3.5 rounded border ${item.required ? 'border-teal-500' : 'border-gray-300 dark:border-gray-600'}`} />
                      <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                      {item.required && <span className="text-red-400 text-[10px]">*</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">{tmpl.item_count} items</p>
              </div>
            ))}
          </div>

          {/* Create Template Modal */}
          {showCreateTmpl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Inspection Template</h2>
                  <button onClick={() => setShowCreateTmpl(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                    <input
                      value={tmplForm.name}
                      onChange={e => setTmplForm({ ...tmplForm, name: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="e.g. Night Shift Security Check"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site (optional)</label>
                    <select
                      value={tmplForm.site_id}
                      onChange={e => setTmplForm({ ...tmplForm, site_id: Number(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value={0}>All Sites (global template)</option>
                      {sites.map(s => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      value={tmplForm.description}
                      onChange={e => setTmplForm({ ...tmplForm, description: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="Brief description of when to use this checklist..."
                    />
                  </div>

                  {/* Checklist items */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Checklist Items</label>
                    <div className="space-y-2">
                      {tmplForm.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={item.label}
                            onChange={e => updateItem(idx, 'label', e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="e.g. Fire extinguisher present and tagged"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={item.required}
                              onChange={e => updateItem(idx, 'required', e.target.checked)}
                              className="rounded"
                            />
                            Req
                          </label>
                          {tmplForm.items.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addItem} className="mt-2 text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Add item
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowCreateTmpl(false)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={actionLoading || !tmplForm.name || tmplForm.items.every(i => !i.label)}
                    className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Creating...' : 'Create Template'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════ DASHBOARD TAB ════════════════════ */}
      {tab === 'dashboard' && (
        <>
          {dashLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !dashboard ? (
            <p className="text-center text-gray-500 py-8">No inspection data available.</p>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboard.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{dashboard.completed}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">Flagged</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{dashboard.flagged}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">In Progress</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{dashboard.in_progress}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Avg Score</p>
                  <p className={`text-2xl font-bold mt-1 ${scoreColor(dashboard.avg_score)}`}>{dashboard.avg_score}%</p>
                </div>
              </div>

              {/* Per-site breakdown */}
              {dashboard.sites.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-teal-500" />
                      Completion by Site (Last {dashboard.period_days} days)
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-2">Site</th>
                        <th className="px-4 py-2">Total</th>
                        <th className="px-4 py-2">Completed</th>
                        <th className="px-4 py-2">Flagged</th>
                        <th className="px-4 py-2">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {dashboard.sites.map(s => (
                        <tr key={s.site_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{s.site_name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{s.total}</td>
                          <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">{s.completed}</td>
                          <td className="px-4 py-2 text-red-600 dark:text-red-400">{s.flagged}</td>
                          <td className={`px-4 py-2 font-semibold ${scoreColor(s.avg_score)}`}>{s.avg_score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
