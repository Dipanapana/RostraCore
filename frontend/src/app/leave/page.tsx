'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  User,
  Filter
} from 'lucide-react'
import api from '@/services/api'

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
}

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [processing, setProcessing] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [requestsRes, employeesRes] = await Promise.all([
        api.get(`/api/v1/leave/requests${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
        api.get('/api/v1/employees')
      ])
      setLeaveRequests(requestsRes.data)
      setEmployees(employeesRes.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/leave/requests', {
        employee_id: parseInt(formData.employee_id),
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || undefined
      })
      setShowModal(false)
      setFormData({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' })
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create leave request')
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

  const handleReject = async (leaveId: number) => {
    const reason = prompt('Rejection reason (optional):')
    try {
      setProcessing(leaveId)
      await api.patch(`/api/v1/leave/requests/${leaveId}/reject`, { rejection_reason: reason })
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject request')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Pending</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Approved</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Rejected</span>
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Cancelled</span>
      default:
        return null
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      family_responsibility: 'Family Responsibility',
      maternity: 'Maternity',
      parental: 'Parental',
      unpaid: 'Unpaid',
      study: 'Study Leave',
      compassionate: 'Compassionate'
    }
    return labels[type] || type
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Leave Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage employee leave requests (BCEA compliant)
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Leave Request
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Leave Requests Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Leave Requests</h3>
            <p className="text-gray-500 dark:text-gray-400">Create your first leave request to get started.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Dates</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Days</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {leaveRequests.map((request) => (
                  <tr key={request.leave_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{request.employee_name || `#${request.employee_id}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {getLeaveTypeLabel(request.leave_type)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                      {request.total_days} day(s)
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(request.leave_id)}
                            disabled={processing === request.leave_id}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            {processing === request.leave_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(request.leave_id)}
                            disabled={processing === request.leave_id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Leave Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">New Leave Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="annual">Annual Leave (15 days)</option>
                    <option value="sick">Sick Leave (30 days/3yr)</option>
                    <option value="family_responsibility">Family Responsibility (3 days)</option>
                    <option value="maternity">Maternity (4 months)</option>
                    <option value="parental">Parental (10 days)</option>
                    <option value="study">Study Leave</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="compassionate">Compassionate</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
