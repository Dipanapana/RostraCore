'use client'

import { useState, useEffect, useCallback } from 'react'
import { shiftSwapsApi, employeesApi } from '@/services/api'
import {
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Filter,
  X,
  UserCheck,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SwapItem {
  swap_id: number
  org_id: number
  status: string
  reason: string | null
  rejection_reason: string | null
  requester_employee_id: number
  requester_name: string
  requester_assignment_id: number
  requester_shift_date: string | null
  requester_shift_time: string | null
  requester_site_name: string | null
  target_employee_id: number
  target_name: string
  target_assignment_id: number | null
  target_shift_date: string | null
  target_shift_time: string | null
  target_site_name: string | null
  created_at: string
  updated_at: string
  responded_at: string | null
  reviewed_at: string | null
  reviewed_by_name: string | null
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending_peer:     { label: 'Awaiting Peer',    color: 'bg-amber-100 text-amber-700',     icon: Clock },
  pending_approval: { label: 'Awaiting Manager', color: 'bg-blue-100 text-blue-700',         icon: UserCheck },
  approved:         { label: 'Approved',          color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected:         { label: 'Rejected',          color: 'bg-red-100 text-red-700',             icon: XCircle },
  declined:         { label: 'Declined',          color: 'bg-orange-100 text-orange-700', icon: XCircle },
  cancelled:        { label: 'Cancelled',         color: 'bg-gray-100 text-gray-600',           icon: X },
  expired:          { label: 'Expired',           color: 'bg-gray-100 text-gray-500',           icon: AlertCircle },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShiftSwapsPage() {
  const [swaps, setSwaps] = useState<SwapItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [showReview, setShowReview] = useState<SwapItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Create form state
  const [employees, setEmployees] = useState<Employee[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [form, setForm] = useState({
    requester_assignment_id: 0,
    target_employee_id: 0,
    reason: '',
  })

  // Review form
  const [rejectionReason, setRejectionReason] = useState('')

  // ── Fetch swaps ──────────────────────────────────────────────
  const fetchSwaps = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      const { data } = await shiftSwapsApi.list(params)
      setSwaps(data.items || [])
      setTotal(data.total || 0)
    } catch {
      setSwaps([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchSwaps() }, [fetchSwaps])

  // ── Fetch employees for create modal ─────────────────────────
  const openCreate = async () => {
    try {
      const [empRes, assignRes] = await Promise.all([
        employeesApi.getAll({ limit: 500 }),
        shiftSwapsApi.upcomingAssignments(200),
      ])
      setEmployees(empRes.data?.items || empRes.data || [])
      setAssignments(assignRes.data || [])
    } catch {
      setEmployees([])
      setAssignments([])
    }
    setForm({ requester_assignment_id: 0, target_employee_id: 0, reason: '' })
    setShowCreate(true)
  }

  // ── Create swap ──────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.requester_assignment_id || !form.target_employee_id) return
    setActionLoading(true)
    try {
      await shiftSwapsApi.create({
        requester_assignment_id: form.requester_assignment_id,
        target_employee_id: form.target_employee_id,
        reason: form.reason || undefined,
      })
      setShowCreate(false)
      fetchSwaps()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create swap request')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Peer respond ─────────────────────────────────────────────
  const handlePeerRespond = async (swap: SwapItem, accept: boolean) => {
    setActionLoading(true)
    try {
      await shiftSwapsApi.peerRespond(swap.swap_id, accept)
      fetchSwaps()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Manager review ───────────────────────────────────────────
  const handleReview = async (approve: boolean) => {
    if (!showReview) return
    setActionLoading(true)
    try {
      await shiftSwapsApi.review(showReview.swap_id, approve, approve ? undefined : rejectionReason)
      setShowReview(null)
      setRejectionReason('')
      fetchSwaps()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Cancel ───────────────────────────────────────────────────
  const handleCancel = async (swap: SwapItem) => {
    if (!confirm('Cancel this swap request?')) return
    setActionLoading(true)
    try {
      await shiftSwapsApi.cancel(swap.swap_id)
      fetchSwaps()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancel failed')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Summary KPIs ─────────────────────────────────────────────
  const pending = swaps.filter(s => s.status === 'pending_peer' || s.status === 'pending_approval').length
  const approved = swaps.filter(s => s.status === 'approved').length
  const rejected = swaps.filter(s => s.status === 'rejected' || s.status === 'declined').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-indigo-600" />
            Shift Swap Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Guards can request to swap shifts with colleagues. Managers review and approve.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSwaps}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> New Swap
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-emerald-600 uppercase tracking-wide">Approved</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-red-600 uppercase tracking-wide">Rejected / Declined</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{rejected}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="pending_peer">Awaiting Peer</option>
          <option value="pending_approval">Awaiting Manager</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No swap requests found</p>
            <p className="text-sm mt-1">Create a new swap request to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Shift (From)</th>
                  <th className="px-4 py-3">Target Guard</th>
                  <th className="px-4 py-3">Shift (To)</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {swaps.map(swap => {
                  const cfg = STATUS_CONFIG[swap.status] || STATUS_CONFIG.expired
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={swap.swap_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {swap.requester_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {swap.requester_shift_date && (
                          <div>
                            <span className="font-medium">{swap.requester_shift_date}</span>
                            <span className="text-xs text-gray-400 ml-1">{swap.requester_shift_time}</span>
                            {swap.requester_site_name && (
                              <div className="text-xs text-gray-400">{swap.requester_site_name}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {swap.target_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {swap.target_shift_date ? (
                          <div>
                            <span className="font-medium">{swap.target_shift_date}</span>
                            <span className="text-xs text-gray-400 ml-1">{swap.target_shift_time}</span>
                            {swap.target_site_name && (
                              <div className="text-xs text-gray-400">{swap.target_site_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">One-way swap</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {swap.reason || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(swap.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {swap.status === 'pending_peer' && (
                            <>
                              <button
                                onClick={() => handlePeerRespond(swap, true)}
                                disabled={actionLoading}
                                className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                title="Accept (as peer)"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handlePeerRespond(swap, false)}
                                disabled={actionLoading}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Decline (as peer)"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {swap.status === 'pending_approval' && (
                            <button
                              onClick={() => { setShowReview(swap); setRejectionReason('') }}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Review
                            </button>
                          )}
                          {(swap.status === 'pending_peer' || swap.status === 'pending_approval') && (
                            <button
                              onClick={() => handleCancel(swap)}
                              disabled={actionLoading}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          )}
                          {swap.status === 'rejected' && swap.rejection_reason && (
                            <span className="text-xs text-red-500 italic" title={swap.rejection_reason}>
                              {swap.rejection_reason.substring(0, 30)}{swap.rejection_reason.length > 30 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Shift Swap Request</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Assignment to swap */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Assignment to Swap
                </label>
                <select
                  value={form.requester_assignment_id}
                  onChange={e => setForm({ ...form, requester_assignment_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm"
                >
                  <option value={0}>Select assignment...</option>
                  {assignments.map((a: any) => (
                    <option key={a.assignment_id} value={a.assignment_id}>
                      #{a.assignment_id} — {a.employee_name || `Emp #${a.employee_id}`}
                      {a.shift_date ? ` | ${a.shift_date}` : ''}
                      {a.site_name ? ` @ ${a.site_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target guard */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Swap With (Target Guard)
                </label>
                <select
                  value={form.target_employee_id}
                  onChange={e => setForm({ ...form, target_employee_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm"
                >
                  <option value={0}>Select guard...</option>
                  {employees.map((emp: Employee) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm"
                  placeholder="e.g. Medical appointment, family commitment..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !form.requester_assignment_id || !form.target_employee_id}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? 'Creating...' : 'Submit Swap Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ──────────────────────────────────────── */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Review Swap Request</h2>
              <button onClick={() => setShowReview(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Requester</p>
                  <p className="font-medium text-gray-900">{showReview.requester_name}</p>
                  {showReview.requester_shift_date && (
                    <p className="text-gray-500">
                      {showReview.requester_shift_date} {showReview.requester_shift_time}
                    </p>
                  )}
                  {showReview.requester_site_name && (
                    <p className="text-xs text-gray-400">{showReview.requester_site_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Target Guard</p>
                  <p className="font-medium text-gray-900">{showReview.target_name}</p>
                  {showReview.target_shift_date ? (
                    <>
                      <p className="text-gray-500">
                        {showReview.target_shift_date} {showReview.target_shift_time}
                      </p>
                      {showReview.target_site_name && (
                        <p className="text-xs text-gray-400">{showReview.target_site_name}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">One-way reassignment</p>
                  )}
                </div>
              </div>
              {showReview.reason && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Reason</p>
                  <p className="text-gray-700">{showReview.reason}</p>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 text-sm"
                  placeholder="Optional — explain why the swap is rejected"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowReview(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(true)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Approve Swap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
