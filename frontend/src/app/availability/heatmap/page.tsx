'use client'

import { useState, useEffect, useCallback } from 'react'
import { availabilityHeatmapApi } from '@/services/api'
import { Flame, Users, CalendarOff, UserCheck, TrendingUp, TrendingDown } from 'lucide-react'

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

function getHeatColor(count: number, max: number): string {
  if (max === 0) return 'bg-gray-100'
  const ratio = count / max
  if (ratio >= 0.8) return 'bg-green-500 text-white'
  if (ratio >= 0.6) return 'bg-green-300 text-green-900'
  if (ratio >= 0.4) return 'bg-yellow-300 text-yellow-900'
  if (ratio >= 0.2) return 'bg-orange-300 text-orange-900'
  return 'bg-red-400 text-white'
}

export default function AvailabilityHeatmapPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await availabilityHeatmapApi.heatmap()
      setData(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  // Find max value for color scaling
  let maxCount = 0
  for (const row of data.grid) {
    for (const day of data.days) {
      if (row[day] > maxCount) maxCount = row[day]
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Flame className="w-7 h-7 text-orange-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Availability Heatmap</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Users className="w-4 h-4" />Active Guards</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_active_guards}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">With Patterns</div>
          <div className="text-2xl font-bold text-indigo-600">{data.guards_with_patterns}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600"><CalendarOff className="w-4 h-4" />On Leave (Week)</div>
          <div className="text-2xl font-bold text-yellow-600">{data.on_leave_this_week}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><UserCheck className="w-4 h-4" />Assigned (Week)</div>
          <div className="text-2xl font-bold text-green-600">{data.assigned_this_week}</div>
        </div>
      </div>

      {/* Peak & Trough */}
      {(data.peak_slot || data.trough_slot) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.peak_slot && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-green-800">Peak Availability</div>
                <div className="text-xs text-green-600">
                  {data.peak_slot.slot.replace('_', ' ')} — {data.peak_slot.count} guards
                </div>
              </div>
            </div>
          )}
          {data.trough_slot && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-700">Lowest Availability</div>
                <div className="text-xs text-red-600">
                  {data.trough_slot.slot.replace('_', ' ')} — {data.trough_slot.count} guards
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Heatmap Grid */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Guards Available by Day &amp; Time</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-sm text-gray-500 p-2 w-32">Time Slot</th>
                {data.days.map((day: string) => (
                  <th key={day} className="text-center text-sm text-gray-500 p-2 font-medium">
                    {DAY_LABELS[day] || day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.grid.map((row: any) => (
                <tr key={row.time_slot}>
                  <td className="text-sm font-medium text-gray-700 p-2">{row.time_slot}</td>
                  {data.days.map((day: string) => {
                    const count = row[day] || 0
                    return (
                      <td key={day} className="p-1">
                        <div className={`rounded-lg p-3 text-center font-bold text-sm ${getHeatColor(count, maxCount)}`}>
                          {count}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <span>Low</span>
          <div className="flex gap-1">
            <div className="w-6 h-4 rounded bg-red-400" />
            <div className="w-6 h-4 rounded bg-orange-300" />
            <div className="w-6 h-4 rounded bg-yellow-300" />
            <div className="w-6 h-4 rounded bg-green-300" />
            <div className="w-6 h-4 rounded bg-green-500" />
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
