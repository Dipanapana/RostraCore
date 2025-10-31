'use client'

import { useState } from 'react'
import { rosterApi } from '@/services/api'

export default function RosterPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await rosterApi.generate({
        start_date: startDate,
        end_date: endDate,
        site_ids: null,
        budget_limit: null
      })

      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate roster')
    } finally {
      setLoading(false)
    }
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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Roster Generation</h1>

        {/* Generation Form */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate Optimized Roster</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {loading ? 'Generating...' : 'Generate Roster'}
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            The system will automatically assign employees to shifts based on skills, availability,
            certifications, and cost optimization.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
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
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium"
                >
                  Confirm Roster
                </button>
              </div>

              {result.assignments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No assignments could be generated. Check constraints and availability.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Shift ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Employee ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.assignments.map((assignment: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.shift_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.employee_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R{assignment.cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    </div>
  )
}
