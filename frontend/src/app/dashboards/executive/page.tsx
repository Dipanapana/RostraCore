'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ExecutiveDashboardData {
  period: {
    current_month: string
    last_updated: string
  }
  revenue: {
    current_month: number
    last_month: number
    growth_percentage: number
    currency: string
  }
  workforce: {
    total_guards: number
    active_sites: number
    revenue_per_guard: number
    utilization_rate: number
  }
  operations: {
    total_shifts: number
    filled_shifts: number
    fill_rate: number
    avg_cost_per_shift: number
  }
  customers: {
    total_customers: number
    active_customers: number
  }
  trends: {
    shifts_last_7_days: Array<{date: string; shifts: number}>
  }
}

export default function ExecutiveDashboard() {
  const router = useRouter()
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboards/executive`)

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
              <p className="text-gray-600 mt-1">{data.period.current_month}</p>
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
            Last updated: {new Date(data.period.last_updated).toLocaleString()}
          </p>
        </div>

        {/* Revenue Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Revenue Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Month Revenue */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Current Month Revenue</div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                R{data.revenue.current_month.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center text-sm ${data.revenue.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.revenue.growth_percentage >= 0 ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {Math.abs(data.revenue.growth_percentage)}% vs last month
              </div>
            </div>

            {/* Revenue per Guard */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Revenue per Guard</div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                R{data.workforce.revenue_per_guard.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-gray-500">
                Per guard per month
              </div>
            </div>

            {/* Utilization Rate */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Guard Utilization</div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {data.workforce.utilization_rate}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full ${data.workforce.utilization_rate >= 70 ? 'bg-green-600' : data.workforce.utilization_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(data.workforce.utilization_rate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Operations Metrics */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Operations Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Guards */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
              <div className="text-blue-100 text-sm mb-2">Total Guards</div>
              <div className="text-5xl font-bold">{data.workforce.total_guards}</div>
              <div className="text-blue-100 text-sm mt-2">Active employees</div>
            </div>

            {/* Active Sites */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
              <div className="text-purple-100 text-sm mb-2">Active Sites</div>
              <div className="text-5xl font-bold">{data.workforce.active_sites}</div>
              <div className="text-purple-100 text-sm mt-2">Locations covered</div>
            </div>

            {/* Total Shifts */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
              <div className="text-green-100 text-sm mb-2">Total Shifts</div>
              <div className="text-5xl font-bold">{data.operations.total_shifts}</div>
              <div className="text-green-100 text-sm mt-2">This month</div>
            </div>

            {/* Fill Rate */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
              <div className="text-orange-100 text-sm mb-2">Shift Fill Rate</div>
              <div className="text-5xl font-bold">{data.operations.fill_rate}%</div>
              <div className="text-orange-100 text-sm mt-2">
                {data.operations.filled_shifts}/{data.operations.total_shifts} filled
              </div>
            </div>
          </div>
        </div>

        {/* Cost Metrics */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Cost Analysis
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-sm text-gray-600 mb-2">Average Cost per Shift</div>
                <div className="text-3xl font-bold text-gray-900">
                  R{data.operations.avg_cost_per_shift.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Total Operational Cost</div>
                <div className="text-3xl font-bold text-gray-900">
                  R{(data.operations.avg_cost_per_shift * data.operations.filled_shifts).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Shift Trends (Last 7 Days)
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="h-64 flex items-end justify-between gap-2">
              {data.trends.shifts_last_7_days.map((day, index) => {
                const maxShifts = Math.max(...data.trends.shifts_last_7_days.map(d => d.shifts))
                const height = maxShifts > 0 ? (day.shifts / maxShifts) * 100 : 0

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                        style={{ height: `${height}%`, minHeight: day.shifts > 0 ? '10px' : '0px' }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.shifts} shifts
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {new Date(day.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
