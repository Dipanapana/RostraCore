'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Calendar, User, Clock, FileText } from 'lucide-react';

interface LeaveRequest {
  leave_id: number;
  employee_id: number;
  employee_name?: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface LeaveApprovalStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function LeaveApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveApprovalStats>({
    total_requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false);
  const [showBulkRejectionModal, setShowBulkRejectionModal] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveRequests();
  }, [statusFilter]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Fetch leave requests with status filter
      const url = statusFilter === 'all'
        ? `${apiUrl}/api/v1/leave-requests`
        : `${apiUrl}/api/v1/leave-requests?status=${statusFilter}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const data = await response.json();
      setLeaveRequests(data);

      // Calculate stats
      const statsData = {
        total_requests: data.length,
        pending: data.filter((r: LeaveRequest) => r.status === 'pending').length,
        approved: data.filter((r: LeaveRequest) => r.status === 'approved').length,
        rejected: data.filter((r: LeaveRequest) => r.status === 'rejected').length,
      };
      setStats(statsData);

      // Clear selections when filter changes
      setSelectedIds([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: number) => {
    try {
      setProcessing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/v1/leave-requests/${leaveId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          rejection_reason: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve leave request');
      }

      // Refresh the list
      await fetchLeaveRequests();
      setShowApprovalModal(false);
      setSelectedRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (leaveId: number) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/v1/leave-requests/${leaveId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject leave request');
      }

      // Refresh the list
      await fetchLeaveRequests();
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequests.map(r => r.leave_id));
    }
  };

  const handleSelectOne = (leaveId: number) => {
    setSelectedIds(prev =>
      prev.includes(leaveId)
        ? prev.filter(id => id !== leaveId)
        : [...prev, leaveId]
    );
  };

  const handleBulkApprove = async () => {
    try {
      setProcessing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Approve each selected request
      const approvalPromises = selectedIds.map(leaveId =>
        fetch(`${apiUrl}/api/v1/leave-requests/${leaveId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'approved',
            rejection_reason: null
          }),
        })
      );

      const results = await Promise.all(approvalPromises);
      const failedCount = results.filter(r => !r.ok).length;

      if (failedCount > 0) {
        throw new Error(`Failed to approve ${failedCount} request(s)`);
      }

      // Refresh the list
      await fetchLeaveRequests();
      setSuccessMessage(`Successfully approved ${selectedIds.length} leave request(s)`);
      setSelectedIds([]);
      setShowBulkApprovalModal(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve requests');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!bulkRejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Reject each selected request
      const rejectionPromises = selectedIds.map(leaveId =>
        fetch(`${apiUrl}/api/v1/leave-requests/${leaveId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'rejected',
            rejection_reason: bulkRejectionReason
          }),
        })
      );

      const results = await Promise.all(rejectionPromises);
      const failedCount = results.filter(r => !r.ok).length;

      if (failedCount > 0) {
        throw new Error(`Failed to reject ${failedCount} request(s)`);
      }

      // Refresh the list
      await fetchLeaveRequests();
      setSuccessMessage(`Successfully rejected ${selectedIds.length} leave request(s)`);
      setSelectedIds([]);
      setShowBulkRejectionModal(false);
      setBulkRejectionReason('');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject requests');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
    return diffDays;
  };

  const getLeaveTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      annual: 'bg-blue-100 text-blue-800',
      sick: 'bg-red-100 text-red-800',
      family_responsibility: 'bg-purple-100 text-purple-800',
      unpaid: 'bg-gray-100 text-gray-800',
      study: 'bg-green-100 text-green-800',
      maternity: 'bg-pink-100 text-pink-800',
      paternity: 'bg-indigo-100 text-indigo-800',
      other: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; icon: JSX.Element } } = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="w-4 h-4" /> }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-600 mt-2">Review and approve employee leave requests</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-green-800 font-semibold">Success</h3>
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_requests}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">Filter by Status:</label>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-semibold">
                  {selectedIds.length} request{selectedIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkApprovalModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Selected
                </button>
                <button
                  onClick={() => setShowBulkRejectionModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Selected
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading leave requests...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No leave requests found</p>
              <p className="text-gray-500 text-sm mt-2">
                {statusFilter !== 'all' ? `No ${statusFilter} requests at the moment` : 'No requests submitted yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Select All Checkbox - Only show for pending requests */}
                    {statusFilter === 'pending' && (
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === leaveRequests.filter(r => r.status === 'pending').length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveRequests.map((request) => (
                    <tr key={request.leave_id} className="hover:bg-gray-50">
                      {/* Checkbox for pending requests */}
                      {statusFilter === 'pending' && request.status === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(request.leave_id)}
                            onChange={() => handleSelectOne(request.leave_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {statusFilter === 'pending' && request.status !== 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap"></td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.employee_name || `Employee #${request.employee_id}`}
                            </div>
                            <div className="text-sm text-gray-500">ID: {request.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLeaveTypeColor(request.leave_type)}`}>
                          {request.leave_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(request.start_date)}
                          </div>
                          <div className="text-gray-500 ml-5">to {formatDate(request.end_date)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {calculateDays(request.start_date, request.end_date)} days
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason || 'No reason provided'}>
                          {request.reason || <span className="text-gray-400 italic">No reason provided</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(request.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApprovalModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectionModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Approve Leave Request</h2>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Employee: <span className="font-semibold text-gray-900">{selectedRequest.employee_name || `#${selectedRequest.employee_id}`}</span></p>
              <p className="text-sm text-gray-600 mb-2">Leave Type: <span className="font-semibold text-gray-900">{selectedRequest.leave_type.replace(/_/g, ' ')}</span></p>
              <p className="text-sm text-gray-600 mb-2">Period: <span className="font-semibold text-gray-900">{formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}</span></p>
              <p className="text-sm text-gray-600">Days: <span className="font-semibold text-gray-900">{calculateDays(selectedRequest.start_date, selectedRequest.end_date)}</span></p>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to approve this leave request?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedRequest.leave_id)}
                disabled={processing}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                }}
                disabled={processing}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Reject Leave Request</h2>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Employee: <span className="font-semibold text-gray-900">{selectedRequest.employee_name || `#${selectedRequest.employee_id}`}</span></p>
              <p className="text-sm text-gray-600 mb-2">Leave Type: <span className="font-semibold text-gray-900">{selectedRequest.leave_type.replace(/_/g, ' ')}</span></p>
              <p className="text-sm text-gray-600 mb-2">Period: <span className="font-semibold text-gray-900">{formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}</span></p>
            </div>

            <div className="mb-6">
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a reason for rejecting this request..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReject(selectedRequest.leave_id)}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing ? 'Rejecting...' : 'Reject Request'}
              </button>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approval Confirmation Modal */}
      {showBulkApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Bulk Approve Leave Requests</h2>
            </div>

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-900 font-semibold mb-2">
                You are about to approve {selectedIds.length} leave request{selectedIds.length !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-green-700">
                This action will approve all selected pending leave requests.
              </p>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to proceed with this bulk approval?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBulkApprove}
                disabled={processing}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing ? 'Approving...' : `Approve ${selectedIds.length} Request${selectedIds.length !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setShowBulkApprovalModal(false)}
                disabled={processing}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Rejection Modal */}
      {showBulkRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Bulk Reject Leave Requests</h2>
            </div>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-900 font-semibold mb-2">
                You are about to reject {selectedIds.length} leave request{selectedIds.length !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-red-700">
                All selected requests will be rejected with the reason provided below.
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="bulk-rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="bulk-rejection-reason"
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a reason for rejecting these requests..."
              />
              <p className="text-xs text-gray-500 mt-2">
                This reason will be applied to all {selectedIds.length} selected request{selectedIds.length !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkReject}
                disabled={processing || !bulkRejectionReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing ? 'Rejecting...' : `Reject ${selectedIds.length} Request${selectedIds.length !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => {
                  setShowBulkRejectionModal(false);
                  setBulkRejectionReason('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
