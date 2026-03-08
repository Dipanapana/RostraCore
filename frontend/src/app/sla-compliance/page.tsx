'use client'

import { useState, useEffect, useCallback } from 'react'
import { slaApi } from '@/services/api'
import { sitesApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Target, Plus, BarChart3, Edit, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function statusBadge(s: string) {
  if (s === 'compliant') return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">Compliant</span>
  if (s === 'at_risk') return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">At Risk</span>
  if (s === 'breached') return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Breached</span>
  return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{s}</span>
}

function statusIcon(s: string) {
  if (s === 'compliant') return <CheckCircle className="w-5 h-5 text-green-500" />
  if (s === 'at_risk') return <AlertTriangle className="w-5 h-5 text-yellow-500" />
  return <XCircle className="w-5 h-5 text-red-500" />
}

export default function SLACompliancePage() {
  const [tab, setTab] = useState<'records'|'dashboard'>('records')
  const [records, setRecords] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const [form, setForm] = useState({
    site_id: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    coverage_target: 95,
    coverage_actual: '',
    response_target_mins: 30,
    response_avg_mins: '',
    resolution_target_hrs: 24,
    resolution_avg_hrs: '',
    notes: '',
  })

  const fetchRecords = useCallback(async () => {
    try {
      const params: any = {}
      if (filterSite) params.site_id = Number(filterSite)
      if (filterStatus) params.status = filterStatus
      if (filterYear) params.year = filterYear
      const { data } = await slaApi.list(params)
      setRecords(data.items || [])
    } catch { /* ignore */ }
  }, [filterSite, filterStatus, filterYear])

  const fetchSites = useCallback(async () => {
    try {
      const { data } = await sitesApi.list()
      setSites(data.items || data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await slaApi.dashboard(filterYear)
      setDashboard(data)
    } catch { /* ignore */ }
  }, [filterYear])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchRecords(), fetchSites(), fetchDashboard()]).finally(() => setLoading(false))
  }, [fetchRecords, fetchSites, fetchDashboard])

  const handleCreate = async () => {
    try {
      await slaApi.create({
        site_id: Number(form.site_id),
        period_month: form.period_month,
        period_year: form.period_year,
        coverage_target: form.coverage_target,
        coverage_actual: form.coverage_actual ? Number(form.coverage_actual) : null,
        response_target_mins: form.response_target_mins,
        response_avg_mins: form.response_avg_mins ? Number(form.response_avg_mins) : null,
        resolution_target_hrs: form.resolution_target_hrs,
        resolution_avg_hrs: form.resolution_avg_hrs ? Number(form.resolution_avg_hrs) : null,
        notes: form.notes || null,
      })
      setShowCreate(false)
      resetForm()
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleUpdate = async () => {
    if (!showEdit) return
    try {
      await slaApi.update(showEdit.record_id, {
        coverage_target: form.coverage_target,
        coverage_actual: form.coverage_actual ? Number(form.coverage_actual) : null,
        response_target_mins: form.response_target_mins,
        response_avg_mins: form.response_avg_mins ? Number(form.response_avg_mins) : null,
        resolution_target_hrs: form.resolution_target_hrs,
        resolution_avg_hrs: form.resolution_avg_hrs ? Number(form.resolution_avg_hrs) : null,
        notes: form.notes || null,
      })
      setShowEdit(null)
      resetForm()
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this SLA record?')) return
    try {
      await slaApi.remove(id)
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const resetForm = () => setForm({
    site_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(),
    coverage_target: 95, coverage_actual: '', response_target_mins: 30, response_avg_mins: '',
    resolution_target_hrs: 24, resolution_avg_hrs: '', notes: '',
  })

  const openEdit = (r: any) => {
    setForm({
      site_id: r.site_id,
      period_month: r.period_month,
      period_year: r.period_year,
      coverage_target: r.coverage_target || 95,
      coverage_actual: r.coverage_actual ?? '',
      response_target_mins: r.response_target_mins || 30,
      response_avg_mins: r.response_avg_mins ?? '',
      resolution_target_hrs: r.resolution_target_hrs || 24,
      resolution_avg_hrs: r.resolution_avg_hrs ?? '',
      notes: r.notes || '',
    })
    setShowEdit(r)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">SLA Compliance</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('records')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'records' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Records</button>
          <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            <BarChart3 className="w-4 h-4 inline mr-1" />Dashboard
          </button>
        </div>
      </div>

      {tab === 'records' && (
        <>
          {/* Filters & Create */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Sites</option>
              {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="at_risk">At Risk</option>
              <option value="breached">Breached</option>
            </select>
            <input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm w-24" />
            <div className="flex-1" />
            <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" />Add Record
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Coverage</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Response</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Resolution</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Score</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No SLA records found</td></tr>
                )}
                {records.map((r: any) => (
                  <tr key={r.record_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.site_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{MONTHS[r.period_month - 1]} {r.period_year}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs text-gray-500">{r.coverage_actual != null ? `${r.coverage_actual}%` : '—'} / {r.coverage_target}%</div>
                      {statusBadge(r.coverage_status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs text-gray-500">{r.response_avg_mins != null ? `${r.response_avg_mins}m` : '—'} / {r.response_target_mins}m</div>
                      {statusBadge(r.response_status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs text-gray-500">{r.resolution_avg_hrs != null ? `${r.resolution_avg_hrs}h` : '—'} / {r.resolution_target_hrs}h</div>
                      {statusBadge(r.resolution_status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-gray-900">{r.overall_score ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(r.overall_status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 mr-2"><Edit className="w-4 h-4 inline" /></button>
                      <button onClick={() => handleDelete(r.record_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Year selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Year:</label>
            <input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm w-24" />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold text-gray-900">{dashboard.total_records}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-green-600">Compliant</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.compliant}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-yellow-600">At Risk</div>
              <div className="text-2xl font-bold text-yellow-600">{dashboard.at_risk}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-red-600">Breached</div>
              <div className="text-2xl font-bold text-red-600">{dashboard.breached}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Avg Score</div>
              <div className="text-2xl font-bold text-blue-600">{dashboard.avg_score ?? '—'}</div>
            </div>
          </div>

          {/* Average coverage */}
          {dashboard.avg_coverage != null && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm text-gray-500 mb-2">Average Coverage</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(dashboard.avg_coverage, 100)}%` }} />
                </div>
                <span className="text-lg font-bold text-gray-900">{dashboard.avg_coverage}%</span>
              </div>
            </div>
          )}

          {/* By Site */}
          {dashboard.by_site?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">SLA by Site (Latest Month)</h3>
              <div className="space-y-2">
                {dashboard.by_site.map((s: any) => (
                  <div key={s.site_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      {statusIcon(s.overall_status)}
                      <span className="text-sm font-medium text-gray-900">{s.site_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Coverage: {s.coverage_actual != null ? `${s.coverage_actual}%` : '—'}</span>
                      <span className="text-sm font-bold text-gray-900">{s.overall_score ?? '—'}</span>
                      {statusBadge(s.overall_status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Trend */}
          {dashboard.monthly_trend?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Monthly Trend</h3>
              <div className="flex items-end gap-2 h-32">
                {dashboard.monthly_trend.map((m: any) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">{m.avg_score ?? '—'}</span>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(m.avg_score || 0)}%` }} />
                    <span className="text-xs text-gray-400 mt-1">{MONTHS[m.month - 1]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">New SLA Record</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select site</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select value={form.period_month} onChange={e => setForm({...form, period_month: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={form.period_year} onChange={e => setForm({...form, period_year: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 pt-2">Coverage (%)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" step="0.1" value={form.coverage_target} onChange={e => setForm({...form, coverage_target: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Actual</label>
                  <input type="number" step="0.1" value={form.coverage_actual} onChange={e => setForm({...form, coverage_actual: e.target.value})} placeholder="—" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 pt-2">Response Time (minutes)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" value={form.response_target_mins} onChange={e => setForm({...form, response_target_mins: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avg Actual</label>
                  <input type="number" value={form.response_avg_mins} onChange={e => setForm({...form, response_avg_mins: e.target.value})} placeholder="—" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 pt-2">Incident Resolution (hours)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" value={form.resolution_target_hrs} onChange={e => setForm({...form, resolution_target_hrs: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avg Actual</label>
                  <input type="number" value={form.resolution_avg_hrs} onChange={e => setForm({...form, resolution_avg_hrs: e.target.value})} placeholder="—" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={!form.site_id} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Edit SLA — {showEdit.site_name} ({MONTHS[showEdit.period_month - 1]} {showEdit.period_year})</h2>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600">Coverage (%)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" step="0.1" value={form.coverage_target} onChange={e => setForm({...form, coverage_target: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Actual</label>
                  <input type="number" step="0.1" value={form.coverage_actual} onChange={e => setForm({...form, coverage_actual: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 pt-2">Response Time (minutes)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" value={form.response_target_mins} onChange={e => setForm({...form, response_target_mins: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avg Actual</label>
                  <input type="number" value={form.response_avg_mins} onChange={e => setForm({...form, response_avg_mins: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 pt-2">Incident Resolution (hours)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target</label>
                  <input type="number" value={form.resolution_target_hrs} onChange={e => setForm({...form, resolution_target_hrs: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avg Actual</label>
                  <input type="number" value={form.resolution_avg_hrs} onChange={e => setForm({...form, resolution_avg_hrs: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEdit(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
