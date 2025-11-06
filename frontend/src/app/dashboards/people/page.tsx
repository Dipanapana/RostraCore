'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PeopleDashboardData {
  last_updated: string
  period: string
  workforce_summary: {
    total_active_guards: number
    guards_with_shifts: number
    guards_without_shifts: number
    utilization_rate: number
  }
  hours_distribution: {
    average_hours: number
    max_hours: number
    min_hours: number
    fairness_score: number
    status: string
  }
  risk_indicators: {
    guards_at_risk_of_burnout: number
    guards_at_risk: Array<{
      name: string
      hours_worked: number
      shifts: number
      risk_level: string
    }>
    underutilized_guards: number
    underutilized: Array<{
      name: string
      hours_worked: number
      shifts: number
    }>
  }
  shift_distribution: {
    day_shifts: number
    night_shifts: number
    day_percentage: number
  }
  attendance: {
    on_time_percentage: number
    on_time_count: number
    total_shifts: number
  }
}

export default function PeopleDashboard() {
  const router = useRouter()
  const [data, setData] = useState<PeopleDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboards/people-analytics`)

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

  if (loading) {
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

  const getFairnessColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'needs_improvement': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">People Analytics</h1>
              <p className="text-gray-600 mt-1">{data.period}</p>
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
            Last updated: {new Date(data.last_updated).toLocaleString()}
          </p>
        </div>

        {/* Workforce Summary */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Workforce Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-2">Total Active Guards</div>
              <div className="text-4xl font-bold text-gray-900">{data.workforce_summary.total_active_guards}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-2">With Shifts</div>
              <div className="text-4xl font-bold text-gray-900">{data.workforce_summary.guards_with_shifts}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600 mb-2">Without Shifts</div>
              <div className="text-4xl font-bold text-gray-900">{data.workforce_summary.guards_without_shifts}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
              <div className="text-sm text-gray-600 mb-2">Utilization Rate</div>
              <div className="text-4xl font-bold text-gray-900">{data.workforce_summary.utilization_rate}%</div>
            </div>
          </div>
        </div>

        {/* Hours Distribution & Fairness */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Hours Distribution & Fairness
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Fairness Score</h3>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getFairnessColor(data.hours_distribution.status)}`}>
                {data.hours_distribution.fairness_score}/100 - {data.hours_distribution.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{data.hours_distribution.average_hours}</div>
                <div className="text-sm text-gray-600 mt-1">Average Hours</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{data.hours_distribution.max_hours}</div>
                <div className="text-sm text-gray-600 mt-1">Maximum Hours</div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-900">{data.hours_distribution.min_hours}</div>
                <div className="text-sm text-gray-600 mt-1">Minimum Hours</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Fairness Distribution</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    data.hours_distribution.fairness_score >= 80
                      ? 'bg-green-600'
                      : data.hours_distribution.fairness_score >= 60
                      ? 'bg-blue-600'
                      : 'bg-orange-600'
                  }`}
                  style={{ width: `${data.hours_distribution.fairness_score}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                A higher score indicates more equitable distribution of work hours among guards
              </p>
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Risk Indicators
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guards at Risk of Burnout */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">At Risk of Burnout</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    data.risk_indicators.guards_at_risk_of_burnout > 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {data.risk_indicators.guards_at_risk_of_burnout} guards
                  </span>
                </div>
              </div>
              <div className="p-6">
                {data.risk_indicators.guards_at_risk.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    No guards at risk
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.risk_indicators.guards_at_risk.map((guard, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getRiskColor(guard.risk_level)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{guard.name}</div>
                            <div className="text-sm mt-1">{guard.shifts} shifts</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs font-medium uppercase">{guard.risk_level} risk</div>
                            <div className="text-sm font-medium">{guard.hours_worked.toFixed(1)}h</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Underutilized Guards */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Underutilized Guards</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    data.risk_indicators.underutilized_guards > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {data.risk_indicators.underutilized_guards} guards
                  </span>
                </div>
              </div>
              <div className="p-6">
                {data.risk_indicators.underutilized.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All guards well-utilized
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.risk_indicators.underutilized.map((guard, index) => (
                      <div key={index} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-yellow-900">{guard.name}</div>
                            <div className="text-sm text-yellow-700 mt-1">{guard.shifts} shifts</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-medium text-yellow-900">{guard.hours_worked.toFixed(1)}h</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shift Distribution & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shift Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Shift Distribution</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-600">{data.shift_distribution.day_shifts}</div>
                  <div className="text-sm text-gray-600 mt-2">Day Shifts</div>
                  <div className="text-xs text-gray-500">{data.shift_distribution.day_percentage}%</div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600">{data.shift_distribution.night_shifts}</div>
                  <div className="text-sm text-gray-600 mt-2">Night Shifts</div>
                  <div className="text-xs text-gray-500">{(100 - data.shift_distribution.day_percentage).toFixed(1)}%</div>
                </div>
              </div>

              {/* Visual distribution */}
              <div className="w-full bg-indigo-600 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-yellow-500 h-8 flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: `${data.shift_distribution.day_percentage}%` }}
                >
                  {data.shift_distribution.day_percentage > 20 && 'Day'}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Performance</h3>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-green-600">{data.attendance.on_time_percentage}%</div>
                <div className="text-sm text-gray-600 mt-2">On-Time Arrival Rate</div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className={`h-4 rounded-full ${
                    data.attendance.on_time_percentage >= 90
                      ? 'bg-green-600'
                      : data.attendance.on_time_percentage >= 75
                      ? 'bg-yellow-500'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${data.attendance.on_time_percentage}%` }}
                ></div>
              </div>

              <div className="text-center text-sm text-gray-600">
                {data.attendance.on_time_count} of {data.attendance.total_shifts} shifts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
