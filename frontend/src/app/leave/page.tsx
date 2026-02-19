'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import EmployeeCombobox from '@/components/ui/EmployeeCombobox'
import Modal from '@/components/ui/Modal'
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Users,
  TrendingUp,
  Upload,
  Info,
} from 'lucide-react'
import api from '@/services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaveRequest {
  leave_id: number
  employee_id: number
  employee_name: string | null
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: string
  created_at: string
  rejection_reason: string | null
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  id_number: string
  role: string
  status?: string
}

interface LeaveBalance {
  leave_type: string
  used: number
  entitled: number
  remaining: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  family_responsibility: 'Family Responsibility',
  maternity: 'Maternity',
  parental: 'Parental',
  study: 'Study Leave',
  unpaid: 'Unpaid',
  compassionate: 'Compassionate',
  iod: 'IOD (Injury on Duty)',
  training: 'Training',
  suspension: 'Suspension',
}

const LEAVE_TYPE_ENTITLEMENTS: Record<string, string> = {
  annual: '15 days',
  sick: '30 days / 3-year cycle',
  family_responsibility: '3 days',
  maternity: '4 months',
  parental: '10 days',
  study: 'As agreed',
  unpaid: 'As agreed',
  compassionate: 'As agreed',
  iod: 'As required (COIDA)',
  training: 'As required',
  suspension: 'As required',
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: 'bg-blue-500',
  sick: 'bg-red-500',
  family_responsibility: 'bg-purple-500',
  maternity: 'bg-pink-500',
  parental: 'bg-indigo-500',
  study: 'bg-teal-500',
  unpaid: 'bg-slate-400',
  compassionate: 'bg-amber-500',
  iod: 'bg-orange-500',
  training: 'bg-emerald-500',
  suspension: 'bg-red-700',
}

const NON_PRODUCTIVE_TYPES = new Set(['iod', 'training', 'suspension'])

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getLeaveTypeLabel(type: string): string {
  return LEAVE_TYPE_LABELS[type] || type
}

function getLeaveTypeDot(type: string): string {
  return LEAVE_TYPE_COLORS[type] || 'bg-slate-400'
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${s.toLocaleDateString('en-ZA', opts)} - ${e.toLocaleDateString('en-ZA', opts)}`
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        classes:
          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      }
    case 'approved':
      return {
        label: 'Approved',
        classes:
          'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      }
    case 'rejected':
      return {
        label: 'Rejected',
        classes:
          'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        classes:
          'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      }
    default:
      return { label: status, classes: 'bg-slate-100 text-slate-600' }
  }
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function isThisMonth(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
}

function isThisYear(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getFullYear() === today.getFullYear()
}

function isOnLeaveToday(request: LeaveRequest): boolean {
  if (request.status !== 'approved') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(request.start_date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(request.end_date)
  end.setHours(0, 0, 0, 0)
  return today >= start && today <= end
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeavePage() {
  // Data state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  // New request modal state
  const [showNewModal, setShowNewModal] = useState(false)
  const [formEmployeeId, setFormEmployeeId] = useState<number | null>(null)
  const [formLeaveType, setFormLeaveType] = useState('annual')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Leave balance state (fetched when employee selected in form)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(false)

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{
    leaveId: number
    employeeName: string
    leaveType: string
  } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  // Tooltip for rejection reason
  const [tooltipId, setTooltipId] = useState<number | null>(null)

  // Non-productive time summary
  const [npSummary, setNpSummary] = useState<{
    iod: Array<{ employee_id: number; employee_name: string; start_date: string; end_date: string }>;
    training: Array<{ employee_id: number; employee_name: string; start_date: string; end_date: string }>;
    suspension: Array<{ employee_id: number; employee_name: string; start_date: string; end_date: string }>;
    total_non_productive: number;
  } | null>(null)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true)
      const [requestsRes, employeesRes, npRes] = await Promise.allSettled([
        api.get('/api/v1/leave/requests'),
        api.get('/api/v1/employees'),
        api.get('/api/v1/leave/non-productive-summary'),
      ])
      if (requestsRes.status === 'fulfilled') setLeaveRequests(requestsRes.value.data)
      if (employeesRes.status === 'fulfilled') setEmployees(employeesRes.value.data)
      if (npRes.status === 'fulfilled') setNpSummary(npRes.value.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch leave balances when an employee is selected in the new request form
  useEffect(() => {
    if (!formEmployeeId) {
      setLeaveBalances([])
      return
    }
    let cancelled = false
    const fetchBalances = async () => {
      try {
        setBalancesLoading(true)
        const res = await api.get(`/api/v1/leave/balances/${formEmployeeId}`)
        if (!cancelled) setLeaveBalances(res.data)
      } catch {
        if (!cancelled) setLeaveBalances([])
      } finally {
        if (!cancelled) setBalancesLoading(false)
      }
    }
    fetchBalances()
    return () => {
      cancelled = true
    }
  }, [formEmployeeId])

  // -------------------------------------------------------------------------
  // Computed / filtered data
  // -------------------------------------------------------------------------

  const filteredRequests = useMemo(() => {
    let result = leaveRequests

    // Status filter (server-side capable, but we also filter client-side for instant feel)
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter)
    }

    // Leave type filter
    if (typeFilter) {
      result = result.filter((r) => r.leave_type === typeFilter)
    }

    // Search by employee name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) => r.employee_name?.toLowerCase().includes(q))
    }

    return result
  }, [leaveRequests, statusFilter, typeFilter, searchQuery])

  // Summary card stats
  const summaryStats = useMemo(() => {
    const pending = leaveRequests.filter((r) => r.status === 'pending').length
    const approvedThisMonth = leaveRequests.filter(
      (r) => r.status === 'approved' && isThisMonth(r.created_at)
    ).length
    const onLeaveToday = leaveRequests.filter((r) => isOnLeaveToday(r)).length
    const totalDaysThisYear = leaveRequests
      .filter((r) => r.status === 'approved' && isThisYear(r.start_date))
      .reduce((sum, r) => sum + r.total_days, 0)
    return { pending, approvedThisMonth, onLeaveToday, totalDaysThisYear }
  }, [leaveRequests])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEmployeeId) return

    // Validation
    if (formEndDate && formStartDate && formEndDate < formStartDate) {
      setFormError('End date must be on or after the start date.')
      return
    }

    try {
      setFormSubmitting(true)
      setFormError(null)
      await api.post('/api/v1/leave/requests', {
        employee_id: formEmployeeId,
        leave_type: formLeaveType,
        start_date: formStartDate,
        end_date: formEndDate,
        reason: formReason || undefined,
      })
      // Reset form
      setFormEmployeeId(null)
      setFormLeaveType('annual')
      setFormStartDate('')
      setFormEndDate('')
      setFormReason('')
      setFormFile(null)
      setShowNewModal(false)
      fetchData()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create leave request')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleApprove = async (leaveId: number) => {
    try {
      setProcessing(leaveId)
      await api.patch(`/api/v1/leave/requests/${leaveId}/approve`)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve request')
    } finally {
      setProcessing(null)
    }
  }

  const openRejectModal = (request: LeaveRequest) => {
    setRejectModal({
      leaveId: request.leave_id,
      employeeName: request.employee_name || `Employee #${request.employee_id}`,
      leaveType: getLeaveTypeLabel(request.leave_type),
    })
    setRejectReason('')
  }

  const handleRejectSubmit = async () => {
    if (!rejectModal) return
    try {
      setRejectSubmitting(true)
      await api.patch(`/api/v1/leave/requests/${rejectModal.leaveId}/reject`, {
        rejection_reason: rejectReason || undefined,
      })
      setRejectModal(null)
      setRejectReason('')
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject request')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('File must be smaller than 5MB.')
        return
      }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowed.includes(file.type)) {
        setFormError('Only PDF, JPG, and PNG files are accepted.')
        return
      }
      setFormFile(file)
      setFormError(null)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardLayout>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Time &amp; Leave
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manage employee leave requests
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Pending */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {summaryStats.pending}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Approved this month */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Approved This Month
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {summaryStats.approvedThisMonth}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                On Leave Today
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {summaryStats.onLeaveToday}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Total Days Used */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Days Used (Year)
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {summaryStats.totalDaysThisYear}
              </p>
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <TrendingUp className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Non-Productive Time Banner */}
      {npSummary && npSummary.total_non_productive > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              Non-Productive Time Today — {npSummary.total_non_productive} guard{npSummary.total_non_productive !== 1 ? 's' : ''} unavailable
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'iod', label: 'IOD', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/20' },
              { key: 'training', label: 'Training', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { key: 'suspension', label: 'Suspension', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(({ key, label, color, bg }) => {
              const list = npSummary[key as 'iod' | 'training' | 'suspension']
              if (list.length === 0) return null
              return (
                <div key={key} className={`${bg} rounded-lg p-3`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${color} mb-2`}>
                    {label} ({list.length})
                  </p>
                  <ul className="space-y-1">
                    {list.map((e) => (
                      <li key={e.employee_id} className="text-xs text-slate-700 dark:text-slate-300">
                        {e.employee_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name..."
            className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Leave type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">All Leave Types</option>
          {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Leave Requests Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            No Leave Requests
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {searchQuery || statusFilter || typeFilter
              ? 'No requests match your filters. Try adjusting your search criteria.'
              : 'Create your first leave request to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredRequests.map((request) => {
                  const statusCfg = getStatusConfig(request.status)
                  return (
                    <tr
                      key={request.leave_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300 flex-shrink-0">
                            {getInitials(request.employee_name)}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {request.employee_name || `#${request.employee_id}`}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${getLeaveTypeDot(
                              request.leave_type
                            )}`}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {getLeaveTypeLabel(request.leave_type)}
                          </span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {formatDateRange(request.start_date, request.end_date)}
                        </span>
                      </td>

                      {/* Days */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {request.total_days}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.classes}`}
                          >
                            {statusCfg.label}
                          </span>
                          {/* Rejection reason tooltip */}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="relative">
                              <button
                                type="button"
                                onMouseEnter={() => setTooltipId(request.leave_id)}
                                onMouseLeave={() => setTooltipId(null)}
                                onClick={() =>
                                  setTooltipId(
                                    tooltipId === request.leave_id ? null : request.leave_id
                                  )
                                }
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              {tooltipId === request.leave_id && (
                                <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg">
                                  <p className="font-medium mb-1">Rejection Reason:</p>
                                  <p className="text-slate-300">{request.rejection_reason}</p>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45 -mt-1" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {request.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(request.leave_id)}
                              disabled={processing === request.leave_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {processing === request.leave_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={processing === request.leave_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* New Leave Request Modal                                            */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        isOpen={showNewModal}
        onClose={() => {
          setShowNewModal(false)
          setFormError(null)
        }}
        title="New Leave Request"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowNewModal(false)
                setFormError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-leave-form"
              disabled={formSubmitting || !formEmployeeId || !formStartDate || !formEndDate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </>
        }
      >
        <form id="new-leave-form" onSubmit={handleSubmitRequest} className="space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          {/* Employee Selection */}
          <EmployeeCombobox
            label="Employee"
            value={formEmployeeId}
            onChange={(id) => setFormEmployeeId(id)}
            employees={employees}
            placeholder="Search and select an employee..."
            required
          />

          {/* Leave Balance Display */}
          {formEmployeeId && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
              {balancesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading balances...
                </div>
              ) : leaveBalances.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Leave Balances
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {leaveBalances.map((b) => (
                      <span
                        key={b.leave_type}
                        className="text-sm text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-medium">{getLeaveTypeLabel(b.leave_type)}:</span>{' '}
                        <span className={b.remaining <= 0 ? 'text-red-500 font-semibold' : ''}>
                          {b.remaining}/{b.entitled}
                        </span>{' '}
                        days
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No balance data available for this employee.
                </p>
              )}
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Leave Type
            </label>
            <select
              value={formLeaveType}
              onChange={(e) => setFormLeaveType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label} ({LEAVE_TYPE_ENTITLEMENTS[key]})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => {
                  setFormStartDate(e.target.value)
                  // Auto-set end date if not yet set or if end < start
                  if (!formEndDate || e.target.value > formEndDate) {
                    setFormEndDate(e.target.value)
                  }
                }}
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                min={formStartDate || undefined}
                required
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              rows={3}
              placeholder="Brief reason for leave..."
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Attach supporting document{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="leave-file-input"
              />
              <label
                htmlFor="leave-file-input"
                className="flex items-center gap-3 w-full px-3 py-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formFile ? formFile.name : 'PDF, JPG, or PNG (max 5MB)'}
                </span>
              </label>
              {formFile && (
                <button
                  type="button"
                  onClick={() => setFormFile(null)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Rejection Modal                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null)
          setRejectReason('')
        }}
        title="Reject Leave Request"
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRejectModal(null)
                setRejectReason('')
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={rejectSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {rejectSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Reject
            </button>
          </>
        }
      >
        {rejectModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Rejecting{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {rejectModal.employeeName}
              </span>
              &apos;s{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {rejectModal.leaveType}
              </span>{' '}
              request.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for rejection{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Provide a reason for rejecting this request..."
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors resize-none"
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
