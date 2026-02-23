'use client'

import { useState, useEffect, useCallback } from 'react'
import { performanceDashboardApi } from '@/services/api'
import { Activity, Star, AlertTriangle, Users, Award } from 'lucide-react'

const SCORE_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Below Avg', 3: 'Average', 4: 'Good', 5: 'Excellent' }
const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500', 2: 'bg-orange-500', 3: 'bg-yellow-500', 4: 'bg-blue-500', 5: 'bg-green-500',
}
const CASE_TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Verbal Warning',
  written_warning: 'Written Warning',
  final_warning: 'Final Warning',
  suspension: 'Suspension',
  dismissal: 'Dismissal',
}
const CASE_TYPE_COLORS: Record<string, string> = {
  verbal_warning: 'bg-amber-50 text-amber-700',
  written_warning: 'bg-orange-100 text-orange-700',
  final_warning: 'bg-red-100 text-red-700',
  suspension: 'bg-purple-100 text-purple-700',
  dismissal: 'bg-gray-100 text-gray-700',
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= score ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

export default function PerformanceDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await performanceDashboardApi.dashboard()
      setData(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  const maxDistCount = Math.max(...Object.values(data.score_distribution as Record<number, number>), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-7 h-7 text-violet-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Performance Dashboard</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Users className="w-4 h-4" />Active Employees</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_active_employees}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Award className="w-4 h-4" />Evaluated</div>
          <div className="text-2xl font-bold text-gray-900">{data.employees_evaluated}</div>
          <div className="text-xs text-gray-400">{data.evaluation_coverage_pct}% coverage</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Total Evaluations</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_evaluations}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Score</div>
          <div className="text-2xl font-bold text-gray-900">{data.avg_overall_score}/5</div>
          <ScoreStars score={Math.round(data.avg_overall_score)} />
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-red-500 mb-1"><AlertTriangle className="w-4 h-4" />Disciplinary Cases</div>
          <div className="text-2xl font-bold text-red-600">{data.total_disciplinary_cases}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Score Distribution</h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(score => {
              const count = data.score_distribution[score] || 0
              const pct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0
              return (
                <div key={score} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-600">{SCORE_LABELS[score]}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div className={`h-4 rounded-full ${SCORE_COLORS[score]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-sm font-medium text-gray-700 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Category Averages */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Category Averages</h2>
          {Object.keys(data.avg_by_category).length === 0 ? (
            <p className="text-sm text-gray-400">No category data yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(data.avg_by_category).map(([cat, avg]: [string, any]) => (
                avg !== null && (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700">{cat}</span>
                      <span className="font-medium text-gray-900">{avg}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${avg >= 4 ? 'bg-green-500' : avg >= 3 ? 'bg-blue-500' : avg >= 2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      {data.top_performers?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Performers</h2>
          <div className="space-y-2">
            {data.top_performers.map((p: any, i: number) => (
              <div key={p.employee_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-amber-50 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreStars score={p.overall_score} />
                  <span className="text-xs text-gray-400">{p.evaluation_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disciplinary Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Disciplinary by Type</h2>
          {Object.keys(data.disciplinary_by_type).length === 0 ? (
            <p className="text-sm text-gray-400">No disciplinary cases recorded</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.disciplinary_by_type).map(([type, count]: [string, any]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${CASE_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}>
                    {CASE_TYPE_LABELS[type] || type}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Cases */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Disciplinary Cases</h2>
          {data.recent_disciplinary?.length === 0 ? (
            <p className="text-sm text-gray-400">No recent cases</p>
          ) : (
            <div className="space-y-3">
              {data.recent_disciplinary.map((c: any) => (
                <div key={c.case_id} className="border-l-4 border-red-300 pl-3 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${CASE_TYPE_COLORS[c.case_type] || 'bg-gray-100 text-gray-600'}`}>
                      {CASE_TYPE_LABELS[c.case_type] || c.case_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.reason}</div>
                  <div className="text-xs text-gray-400">{c.incident_date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
