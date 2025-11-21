'use client'

import { useState, useEffect, useRef } from 'react'
import { rosterApi } from '@/services/api'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DatePicker from '@/components/DatePicker'


export default function RosterPage() {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Progress state
  const [progress, setProgress] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Timer effect for elapsed seconds
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [loading])

  // Simulate progress for better UX
  useEffect(() => {
    if (loading) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      return () => clearInterval(interval)
    } else {
      setProgress(0)
    }
  }, [loading])

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      // Call roster generation API directly (synchronous for now)
      const token = localStorage.getItem('token')

      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/roster/generate?algorithm=production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          site_ids: [],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate roster')
      }

      const data = await response.json()
      setResult(data)
      setLoading(false)

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate roster')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setLoading(false)
    setError('Generation cancelled by user')
  }

  const handleConfirm = async () => {
    if (!result || !result.assignments) return

    try {
      setLoading(true)
      await rosterApi.confirm(result.assignments)
      alert('Roster confirmed successfully!')
      setResult(null)
    } catch (err: any) {
      alert('Failed to confirm roster: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Progress overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Animated spinner */}
              <div className="mb-4 flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>

              {/* Status message */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generating Roster...
              </h3>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Progress percentage */}
              <div className="text-sm text-gray-600 mb-4">
                {progress}% complete
              </div>

              {/* Elapsed time */}
              <div className="text-xs text-gray-500 mb-4">
                Elapsed time: {elapsedSeconds}s
              </div>

              {/* Cancel button */}
              <button
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Roster Generation</h1>
            <p className="text-gray-600">AI-powered shift optimization and scheduling</p>
          </div>

          {/* Generation Form */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Generate Optimized Roster</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholderText="Select start date"
                  disabled={loading}
                  label="Start Date"
                />
              </div>

              <div>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate || undefined}
                  placeholderText="Select end date"
                  disabled={loading}
                  label="End Date"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Roster'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Background Processing</p>
                  <p>Roster generation now runs in the background. You can navigate away and come back later to check results. Large rosters may take several minutes to optimize.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results Display */}
          {result && result.summary && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-sm text-gray-600">Total Cost</div>
                  <div className="text-2xl font-bold text-gray-900">
                    R{result.summary.total_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-sm text-gray-600">Filled Shifts</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.total_shifts_filled || 0}
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-sm text-gray-600">Fill Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.fill_rate?.toFixed(1) || '0'}%
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-sm text-gray-600">Employees Used</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.employees_utilized || 0}
                  </div>
                </div>
              </div>

              {/* Assignments Table */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Shift Assignments</h2>
                  <div className="flex items-center gap-3">
                    <ExportButtons type="roster" filters={{ start_date: startDate ? startDate.toISOString().split('T')[0] : '', end_date: endDate ? endDate.toISOString().split('T')[0] : '' }} />
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
                    >
                      Confirm Roster
                    </button>
                  </div>
                </div>

                {result.assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No assignments could be generated. Check constraints and availability.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Site
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Start Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              End Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.assignments
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((assignment: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {assignment.employee_name || `Employee ${assignment.employee_id}`}
                                  </div>
                                  <div className="text-xs text-gray-500">ID: {assignment.employee_id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  Site {assignment.site_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {assignment.start_time ? new Date(assignment.start_time).toLocaleString('en-ZA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {assignment.end_time ? new Date(assignment.end_time).toLocaleString('en-ZA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  R{assignment.cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {result.assignments.length > itemsPerPage && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                        <div className="flex justify-between flex-1 sm:hidden">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(result.assignments.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(result.assignments.length / itemsPerPage)}
                            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                              <span className="font-medium">
                                {Math.min(currentPage * itemsPerPage, result.assignments.length)}
                              </span>{' '}
                              of <span className="font-medium">{result.assignments.length}</span> assignments
                            </p>
                          </div>
                          <div>
                            <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {Array.from({ length: Math.ceil(result.assignments.length / itemsPerPage) }, (_, i) => i + 1)
                                .filter(page => {
                                  const totalPages = Math.ceil(result.assignments.length / itemsPerPage);
                                  if (totalPages <= 7) return true;
                                  if (page === 1 || page === totalPages) return true;
                                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                                  return false;
                                })
                                .map((page, idx, arr) => {
                                  if (idx > 0 && arr[idx - 1] !== page - 1) {
                                    return (
                                      <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                        ...
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPage(page)}
                                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20'
                                        }`}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(result.assignments.length / itemsPerPage)))}
                                disabled={currentPage === Math.ceil(result.assignments.length / itemsPerPage)}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Unfilled Shifts */}
              {result.unfilled_shifts && result.unfilled_shifts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Unfilled Shifts ({result.unfilled_shifts.length})
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Some shifts could not be filled due to constraints. Consider adjusting availability,
                    hiring more staff, or relaxing constraints.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}
