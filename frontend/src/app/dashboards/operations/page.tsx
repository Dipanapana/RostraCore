'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OperationsDashboardData {
  last_updated: string
  action_items: {
    unfilled_shifts: {
      count: number
      critical_count: number
      shifts: Array<{
        shift_id: number
        site_name: string
        start_time: string
        hours_until: number
        urgency: string
      }>
    }
    expiring_certifications: {
      count: number
      critical_count: number
      certifications: Array<{
        employee_name: string
        cert_type: string
        days_until_expiry: number
        urgency: string
      }>
    }
    attendance_issues: {
      no_shows_last_7_days: number
      late_arrivals_last_7_days: number
      total_issues: number
    }
  }
  current_status: {
    guards_on_shift_now: number
    total_active_guards: number
    guards_available_today: number
    coverage_rate_today: number
  }
  today_overview: {
    total_shifts: number
    filled_shifts: number
    unfilled_shifts: number
    active_sites: number
  }
}

export default function OperationsDashboard() {
  const router = useRouter()
  const [data, setData] = useState<OperationsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchDashboardData, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboards/operations`)

      if (!response.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading dashboard: {error}</p>
        </div>
      </div>
    )
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
              <p className="text-gray-600 mt-1">Action items and immediate priorities</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push('/dashboards')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                All Dashboards
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Last updated: {new Date(data.last_updated).toLocaleString()} • Auto-refreshes every 2 minutes
          </p>
        </div>

        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">On Shift Now</div>
            <div className="text-3xl font-bold text-gray-900">{data.current_status.guards_on_shift_now}</div>
            <div className="text-xs text-gray-500 mt-1">
              of {data.current_status.total_active_guards} guards
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Coverage Today</div>
            <div className="text-3xl font-bold text-gray-900">{data.current_status.coverage_rate_today}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.today_overview.filled_shifts}/{data.today_overview.total_shifts} shifts filled
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600 mb-1">Available Today</div>
            <div className="text-3xl font-bold text-gray-900">{data.current_status.guards_available_today}</div>
            <div className="text-xs text-gray-500 mt-1">guards available</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Active Sites</div>
            <div className="text-3xl font-bold text-gray-900">{data.today_overview.active_sites}</div>
            <div className="text-xs text-gray-500 mt-1">locations</div>
          </div>
        </div>

        {/* Action Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Unfilled Shifts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Unfilled Shifts</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.action_items.unfilled_shifts.critical_count > 0
                    ? 'bg-red-100 text-red-800'
                    : data.action_items.unfilled_shifts.count > 0
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {data.action_items.unfilled_shifts.count} total
                  {data.action_items.unfilled_shifts.critical_count > 0 &&
                    ` (${data.action_items.unfilled_shifts.critical_count} critical)`}
                </span>
              </div>
            </div>
            <div className="p-6">
              {data.action_items.unfilled_shifts.shifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All shifts filled!
                </div>
              ) : (
                <div className="space-y-3">
                  {data.action_items.unfilled_shifts.shifts.map((shift, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getUrgencyColor(shift.urgency)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{shift.site_name}</div>
                          <div className="text-sm mt-1">
                            {new Date(shift.start_time).toLocaleString('en-ZA', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs font-medium uppercase">{shift.urgency}</div>
                          <div className="text-sm">{shift.hours_until}h until</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expiring Certifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Expiring Certifications</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.action_items.expiring_certifications.critical_count > 0
                    ? 'bg-red-100 text-red-800'
                    : data.action_items.expiring_certifications.count > 0
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {data.action_items.expiring_certifications.count} total
                </span>
              </div>
            </div>
            <div className="p-6">
              {data.action_items.expiring_certifications.certifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No certifications expiring soon
                </div>
              ) : (
                <div className="space-y-3">
                  {data.action_items.expiring_certifications.certifications.map((cert, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getUrgencyColor(cert.urgency)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{cert.employee_name}</div>
                          <div className="text-sm mt-1">{cert.cert_type}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs font-medium uppercase">{cert.urgency}</div>
                          <div className="text-sm">{cert.days_until_expiry} days</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Issues */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Attendance Issues (Last 7 Days)</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600">
                  {data.action_items.attendance_issues.no_shows_last_7_days}
                </div>
                <div className="text-sm text-gray-600 mt-2">No-Shows</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">
                  {data.action_items.attendance_issues.late_arrivals_last_7_days}
                </div>
                <div className="text-sm text-gray-600 mt-2">Late Arrivals</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">
                  {data.action_items.attendance_issues.total_issues}
                </div>
                <div className="text-sm text-gray-600 mt-2">Total Issues</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
