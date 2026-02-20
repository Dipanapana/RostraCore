'use client'

import { useState, useEffect, useCallback } from 'react'
import { siteRiskApi } from '@/services/api'
import { ShieldAlert, Building2, AlertTriangle, CheckCircle } from 'lucide-react'

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}
const LEVEL_LABELS: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-orange-500' : score >= 20 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-sm font-bold ${score >= 70 ? 'text-red-600' : score >= 40 ? 'text-orange-600' : score >= 20 ? 'text-yellow-600' : 'text-green-600'}`}>
        {score}
      </span>
    </div>
  )
}

export default function SiteRiskPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  const fetchData = useCallback(async () => {
    try {
      const res = await siteRiskApi.scores(days)
      setData(res.data)
    } catch { /* ignore */ }
  }, [days])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Risk Assessment</h1>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Total Sites</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_sites}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Avg Risk Score</div>
          <div className={`text-2xl font-bold ${data.avg_risk_score >= 40 ? 'text-red-600' : data.avg_risk_score >= 20 ? 'text-yellow-600' : 'text-green-600'}`}>
            {data.avg_risk_score}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="w-4 h-4" />Critical</div>
          <div className="text-2xl font-bold text-red-600">{data.by_risk_level.critical}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="text-sm text-orange-600">High Risk</div>
          <div className="text-2xl font-bold text-orange-600">{data.by_risk_level.high}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Low Risk</div>
          <div className="text-2xl font-bold text-green-600">{data.by_risk_level.low}</div>
        </div>
      </div>

      {/* Site Risk Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Sites — Risk Scores</h2>
          <p className="text-xs text-gray-400 mt-1">Sorted by risk score (highest first)</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Site</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Risk Level</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Risk Score</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 font-medium">Incidents</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 font-medium">Understaffed</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300 font-medium">Factors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.sites.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No sites found</td></tr>
            ) : data.sites.map((s: any) => (
              <tr key={s.site_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{s.site_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${LEVEL_COLORS[s.risk_level]}`}>
                    {LEVEL_LABELS[s.risk_level]}
                  </span>
                </td>
                <td className="px-4 py-3"><RiskBar score={s.risk_score} /></td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{s.incident_count}</td>
                <td className="px-4 py-3 text-center">
                  {s.total_shifts > 0 ? (
                    <span className={s.understaffed_shifts > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {s.understaffed_shifts}/{s.total_shifts}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {s.factors.length > 0 ? (
                    <div className="text-xs text-gray-500">
                      {s.factors.map((f: string, i: number) => <div key={i}>{f}</div>)}
                    </div>
                  ) : <span className="text-xs text-green-600">No risk factors</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
