'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface FinancialDashboardData {
  last_updated: string
  period: string
  payroll: {
    this_month: {
      regular_pay: number
      overtime_pay: number
      total: number
    }
    last_month: number
    change_percentage: number
    overtime_percentage: number
  }
  budget: {
    monthly_budget: number
    spent: number
    remaining: number
    used_percentage: number
    projected_monthly_cost: number
    status: string
  }
  cost_by_site: Array<{
    site_name: string
    total_cost: number
    shift_count: number
    avg_cost_per_shift: number
  }>
  cost_breakdown: {
    low_cost_shifts: number
    medium_cost_shifts: number
    high_cost_shifts: number
  }
  trends: {
    last_6_months: Array<{month: string; cost: number}>
  }
}

export default function FinancialDashboard() {
  const router = useRouter()
  const [data, setData] = useState<FinancialDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboards/financial`)

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

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'over_budget': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
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

        {/* Budget Status */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Budget Status</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBudgetStatusColor(data.budget.status)}`}>
                {data.budget.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Monthly Budget</div>
                <div className="text-3xl font-bold text-gray-900">
                  R{data.budget.monthly_budget.toLocaleString('en-ZA')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Spent This Month</div>
                <div className="text-3xl font-bold text-gray-900">
                  R{data.budget.spent.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Budget Used</span>
                <span className="font-medium">{data.budget.used_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    data.budget.used_percentage > 100
                      ? 'bg-red-600'
                      : data.budget.used_percentage > 90
                      ? 'bg-yellow-500'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(data.budget.used_percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm text-gray-600">Remaining Budget</div>
                <div className={`text-xl font-semibold ${data.budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R{data.budget.remaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Projected Month-End</div>
                <div className="text-xl font-semibold text-gray-900">
                  R{data.budget.projected_monthly_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Breakdown */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Payroll Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-2">Regular Pay</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                R{data.payroll.this_month.regular_pay.toLocaleString('en-ZA')}
              </div>
              <div className="text-xs text-gray-500">
                {((data.payroll.this_month.regular_pay / data.payroll.this_month.total) * 100).toFixed(1)}% of total
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600 mb-2">Overtime Pay</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                R{data.payroll.this_month.overtime_pay.toLocaleString('en-ZA')}
              </div>
              <div className="text-xs text-gray-500">
                {data.payroll.overtime_percentage.toFixed(1)}% of payroll
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-2">Total Payroll</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                R{data.payroll.this_month.total.toLocaleString('en-ZA')}
              </div>
              <div className={`text-sm flex items-center ${data.payroll.change_percentage >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.payroll.change_percentage >= 0 ? '↑' : '↓'}
                {Math.abs(data.payroll.change_percentage).toFixed(1)}% vs last month
              </div>
            </div>
          </div>
        </div>

        {/* Cost by Site */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Cost by Site (Top 10)
          </h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shifts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Cost/Shift
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.cost_by_site.map((site, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {site.site_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R{site.total_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {site.shift_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        R{site.avg_cost_per_shift.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cost Trends */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Cost Trends (Last 6 Months)
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="h-64 flex items-end justify-between gap-2">
              {data.trends.last_6_months.map((month, index) => {
                const maxCost = Math.max(...data.trends.last_6_months.map(m => m.cost))
                const height = maxCost > 0 ? (month.cost / maxCost) * 100 : 0

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors relative group"
                        style={{ height: `${height}%`, minHeight: month.cost > 0 ? '10px' : '0px' }}
                      >
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          R{month.cost.toLocaleString('en-ZA')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {month.month}
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
