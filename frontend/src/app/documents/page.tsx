'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Plus, Search, X, Trash2, Edit2, Download,
  AlertTriangle, Clock, BarChart3, File, Users,
} from 'lucide-react'
import { documentsApi } from '@/services/api'
import { employeesApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

// ── helpers ────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  'contract', 'id_document', 'certificate', 'sop', 'policy',
  'report', 'letter', 'photo', 'other',
]

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contract',
  id_document: 'ID Document',
  certificate: 'Certificate',
  sop: 'SOP',
  policy: 'Policy',
  report: 'Report',
  letter: 'Letter',
  photo: 'Photo',
  other: 'Other',
}

function typeBadge(t: string) {
  const colours: Record<string, string> = {
    contract: 'bg-blue-500/20 text-blue-400',
    id_document: 'bg-purple-500/20 text-purple-400',
    certificate: 'bg-green-500/20 text-green-400',
    sop: 'bg-yellow-500/20 text-yellow-400',
    policy: 'bg-orange-500/20 text-orange-400',
    report: 'bg-cyan-500/20 text-cyan-400',
    letter: 'bg-pink-500/20 text-pink-400',
    photo: 'bg-indigo-500/20 text-indigo-400',
  }
  return colours[t] || 'bg-gray-100 text-gray-500'
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(d: string | null | undefined): boolean {
  if (!d) return false
  return new Date(d) <= new Date()
}

function isExpiringSoon(d: string | null | undefined, days = 30): boolean {
  if (!d) return false
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  return diff > 0 && diff <= days
}

// ── component ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [tab, setTab] = useState<'list' | 'dashboard'>('list')
  const [docs, setDocs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editDoc, setEditDoc] = useState<any>(null)

  // Employees dropdown
  const [employees, setEmployees] = useState<any[]>([])

  // Form
  const [form, setForm] = useState({
    filename: '', document_type: 'other', employee_id: '',
    file_size: '', mime_type: '', tags: '', expires_at: '',
  })

  // ── loaders ──

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (typeFilter) params.document_type = typeFilter
      if (employeeFilter) params.employee_id = Number(employeeFilter)
      const { data } = await documentsApi.list(params)
      setDocs(data.items || [])
      setTotal(data.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [search, typeFilter, employeeFilter])

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await documentsApi.summary()
      setSummary(data)
    } catch { /* ignore */ }
  }, [])

  const loadEmployees = useCallback(async () => {
    try {
      const { data } = await employeesApi.getAll({ status: 'active', limit: 1000 })
      setEmployees(data.employees || data.items || data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadDocs(); loadSummary(); loadEmployees() }, [loadDocs, loadSummary, loadEmployees])

  // ── actions ──

  const openCreate = () => {
    setEditDoc(null)
    setForm({ filename: '', document_type: 'other', employee_id: '', file_size: '', mime_type: '', tags: '', expires_at: '' })
    setShowModal(true)
  }

  const openEdit = (d: any) => {
    setEditDoc(d)
    setForm({
      filename: d.filename || '',
      document_type: d.document_type || 'other',
      employee_id: d.employee_id ? String(d.employee_id) : '',
      file_size: d.file_size ? String(d.file_size) : '',
      mime_type: d.mime_type || '',
      tags: (d.tags || []).join(', '),
      expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    try {
      const payload: any = {
        filename: form.filename || null,
        document_type: form.document_type,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
        file_size: form.file_size ? Number(form.file_size) : null,
        mime_type: form.mime_type || null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        expires_at: form.expires_at || null,
      }
      if (editDoc) {
        await documentsApi.update(editDoc.document_id, payload)
      } else {
        await documentsApi.create(payload)
      }
      setShowModal(false)
      loadDocs()
      loadSummary()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document record?')) return
    try {
      await documentsApi.remove(id)
      loadDocs()
      loadSummary()
    } catch { /* ignore */ }
  }

  // ── render ──

  return (
    <DashboardLayout>
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-400" /> Document Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Employee and organisational document records
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg p-1 w-fit">
        {(['list', 'dashboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
            {t === 'list' ? 'Documents' : 'Dashboard'}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search filename…"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500">
              <option value="">All Types</option>
              {DOC_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
            <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500">
              <option value="">All Employees</option>
              {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Filename</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Size</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Expires</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Uploaded</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Tags</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
                  ) : docs.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No documents found</td></tr>
                  ) : docs.map((d: any) => (
                    <tr key={d.document_id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900 font-medium truncate max-w-[200px]">{d.filename || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(d.document_type)}`}>
                          {TYPE_LABELS[d.document_type] || d.document_type || 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{d.employee_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatBytes(d.file_size)}</td>
                      <td className="px-4 py-3">
                        {d.expires_at ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${isExpired(d.expires_at) ? 'text-red-400' : isExpiringSoon(d.expires_at) ? 'text-amber-400' : 'text-gray-500'}`}>
                            {isExpired(d.expires_at) && <AlertTriangle className="w-3 h-3" />}
                            {isExpiringSoon(d.expires_at) && <Clock className="w-3 h-3" />}
                            {fmtDate(d.expires_at)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(d.uploaded_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(d.tags || []).slice(0, 3).map((tag: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px]">{tag}</span>
                          ))}
                          {(d.tags || []).length > 3 && <span className="text-gray-400 text-[10px]">+{d.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(d)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(d.document_id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
                Showing {docs.length} of {total} documents
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && summary && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Documents', value: summary.total, icon: FileText, colour: 'blue' },
              { label: 'Employee Docs', value: summary.employee_docs, icon: Users, colour: 'green' },
              { label: 'Expiring Soon', value: summary.expiring_soon, icon: Clock, colour: 'amber' },
              { label: 'Expired', value: summary.expired, icon: AlertTriangle, colour: 'red' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-medium">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 text-${kpi.colour}-400`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* By Type + Storage */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* By Type */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" /> Documents by Type
              </h3>
              {(summary.by_type || []).length === 0 ? (
                <p className="text-gray-400 text-sm">No documents yet</p>
              ) : (
                <div className="space-y-3">
                  {summary.by_type.map(([type, count]: [string, number]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{TYPE_LABELS[type] || type}</span>
                        <span className="text-gray-900 font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count / summary.total) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Storage Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-green-400" /> Storage Overview
              </h3>
              <div className="space-y-4">
                <div className="text-center py-6">
                  <p className="text-4xl font-bold text-gray-900">{formatBytes(summary.total_size_bytes)}</p>
                  <p className="text-gray-500 text-sm mt-1">Total storage used</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{summary.employee_docs}</p>
                    <p className="text-gray-500 text-xs">Employee Docs</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{summary.general_docs}</p>
                    <p className="text-gray-500 text-xs">General Docs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editDoc ? 'Edit Document' : 'Add Document'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Filename *</label>
                <input value={form.filename} onChange={e => setForm({ ...form, filename: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" placeholder="e.g. employment_contract.pdf" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Document Type</label>
                  <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">MIME Type</label>
                  <input value={form.mime_type} onChange={e => setForm({ ...form, mime_type: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" placeholder="e.g. application/pdf" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Employee</label>
                <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500">
                  <option value="">— General (no employee) —</option>
                  {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">File Size (bytes)</label>
                  <input type="number" value={form.file_size} onChange={e => setForm({ ...form, file_size: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Expires At</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" placeholder="e.g. signed, 2024, urgent" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.filename} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {editDoc ? 'Save Changes' : 'Add Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
