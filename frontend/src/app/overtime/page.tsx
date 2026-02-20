'use client'

import { useState, useEffect, useCallback } from 'react'
import { overtimeApi, sitesApi, employeesApi } from '@/services/api'
import { Timer, Plus, BarChart3, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'

function formatZAR(cents: number | null) {
  if (cents == null) return '—'
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

function statusBadge(s: string) {
  if (s === 'approved') return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</span>
  if (s === 'rejected') return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>
  return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>
}

export default function OvertimePage() {
  const [tab, setTab] = useState<'records'|'dashboard'>('records')
  const [records, setRecords] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showApprove, setShowApprove] = useState<any>(null)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    employee_id: '', site_id: '', date: new Date().toISOString().split('T')[0],
    hours: '', rate_multiplier: '1.5', hourly_rate: '', reason: '',
  })
  const [approvalStatus, setApprovalStatus] = useState('approved')
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchRecords = useCallback(async () => {
    try {
      const params: any = {}
      if (filterEmployee) params.employee_id = Number(filterEmployee)
      if (filterStatus) params.status = filterStatus
      const { data } = await overtimeApi.list(params)
      setRecords(data.items || [])
    } catch { /* ignore */ }
  }, [filterEmployee, filterStatus])

  const fetchMeta = useCallback(async () => {
    try {
      const [empRes, siteRes] = await Promise.all([employeesApi.list(), sitesApi.list()])
      setEmployees(empRes.data.items || empRes.data || [])
      setSites(siteRes.data.items || siteRes.data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await overtimeApi.dashboard()
      setDashboard(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchRecords(), fetchMeta(), fetchDashboard()]).finally(() => setLoading(false))
  }, [fetchRecords, fetchMeta, fetchDashboard])

  const handleCreate = async () => {
    try {
      await overtimeApi.create({
        employee_id: Number(form.employee_id),
        site_id: form.site_id ? Number(form.site_id) : null,
        date: form.date,
        hours: Number(form.hours),
        rate_multiplier: Number(form.rate_multiplier),
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) * 100 : null, // ZAR to cents
        reason: form.reason || null,
      })
      setShowCreate(false)
      resetForm()
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleApprove = async () => {
    if (!showApprove) return
    try {
      await overtimeApi.approve(showApprove.record_id, {
        status: approvalStatus,
        rejection_reason: approvalStatus === 'rejected' ? rejectionReason : undefined,
      })
      setShowApprove(null)
      setApprovalStatus('approved')
      setRejectionReason('')
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this overtime record?')) return
    try {
      await overtimeApi.remove(id)
      fetchRecords()
      fetchDashboard()
    } catch { /* ignore */ }
  }

  const resetForm = () => setForm({
    employee_id: '', site_id: '', date: new Date().toISOString().split('T')[0],
    hours: '', rate_multiplier: '1.5', hourly_rate: '', reason: '',
  })

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Timer className="w-7 h-7 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overtime Management</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('records')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'records' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Records</button>
          <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
            <BarChart3 className="w-4 h-4 inline mr-1" />Dashboard
          </button>
        </div>
      </div>

      {tab === 'records' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Employees</option>
              {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="flex-1" />
            <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">
              <Plus className="w-4 h-4" />Log Overtime
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Hours</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Cost</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {records.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No overtime records found</td></tr>
                )}
                {records.map((r: any) => (
                  <tr key={r.record_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.employee_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.site_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.date}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">{r.hours}h</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.rate_multiplier}x</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatZAR(r.total_cost)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' && (
                        <button onClick={() => { setApprovalStatus('approved'); setRejectionReason(''); setShowApprove(r) }} className="text-green-600 hover:text-green-800 mr-2" title="Review">
                          <CheckCircle className="w-4 h-4 inline" />
                        </button>
                      )}
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
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_records}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="text-sm text-yellow-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{dashboard.pending}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Approved Hours</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.approved_hours}h</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Total OT Cost</div>
              <div className="text-2xl font-bold text-orange-600">{formatZAR(dashboard.total_approved_cost)}</div>
            </div>
          </div>

          {/* Weekly Trend */}
          {dashboard.weekly_trend?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Weekly Trend (Last 4 Weeks)</h3>
              <div className="flex items-end gap-4 h-32">
                {dashboard.weekly_trend.map((w: any, i: number) => {
                  const maxH = Math.max(...dashboard.weekly_trend.map((x: any) => x.hours), 1)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-gray-500 mb-1">{w.hours}h</span>
                      <div className="w-full bg-orange-500 rounded-t" style={{ height: `${(w.hours / maxH) * 100}%`, minHeight: w.hours > 0 ? '4px' : '0' }} />
                      <span className="text-xs text-gray-400 mt-1">Wk {i + 1}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Employees */}
          {dashboard.top_employees?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Overtime Employees</h3>
              <div className="space-y-2">
                {dashboard.top_employees.map((e: any, i: number) => (
                  <div key={e.employee_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center text-xs bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-700 dark:text-orange-400">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{e.employee_name}</span>
                    </div>
                    <span className="text-sm font-bold text-orange-600">{e.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Site */}
          {dashboard.by_site?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Overtime by Site</h3>
              <div className="space-y-2">
                {dashboard.by_site.map((s: any) => (
                  <div key={s.site_id || 'none'} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.site_name}</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{s.hours}h</span>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Log Overtime</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
                <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select employee</option>
                  {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site</label>
                <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Select site</option>
                  {sites.map((s: any) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours *</label>
                  <input type="number" step="0.5" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} placeholder="e.g. 3" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate Multi</label>
                  <select value={form.rate_multiplier} onChange={e => setForm({...form, rate_multiplier: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="1.5">1.5x (Weekday)</option>
                    <option value="2.0">2.0x (Sunday/Holiday)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate (ZAR, optional)</label>
                <input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} placeholder="Uses employee rate if blank" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Why was overtime needed?" className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">Cancel</button>
              <button onClick={handleCreate} disabled={!form.employee_id || !form.hours || !form.date} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {showApprove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Review Overtime</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm">
              <div><strong>Employee:</strong> {showApprove.employee_name}</div>
              <div><strong>Date:</strong> {showApprove.date}</div>
              <div><strong>Hours:</strong> {showApprove.hours}h @ {showApprove.rate_multiplier}x</div>
              <div><strong>Cost:</strong> {formatZAR(showApprove.total_cost)}</div>
              {showApprove.reason && <div><strong>Reason:</strong> {showApprove.reason}</div>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Decision</label>
                <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              {approvalStatus === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rejection Reason</label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowApprove(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">Cancel</button>
              <button onClick={handleApprove} className={`px-4 py-2 text-sm text-white rounded-lg ${approvalStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {approvalStatus === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
