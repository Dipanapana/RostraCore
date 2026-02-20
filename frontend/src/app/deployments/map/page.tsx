'use client'

import { useState, useEffect, useCallback } from 'react'
import { deploymentMapApi } from '@/services/api'
import { Map, Users, Building2, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  adequately_staffed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  understaffed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  no_coverage: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  adequately_staffed: 'Staffed',
  understaffed: 'Understaffed',
  no_coverage: 'No Coverage',
}

export default function DeploymentMapPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      const res = await deploymentMapApi.current()
      setData(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  const filteredSites = filter === 'all'
    ? data.sites
    : data.sites.filter((s: any) => s.staffing_status === filter)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deployment Map</h1>
            <p className="text-sm text-gray-500">Today: {data.date}</p>
          </div>
        </div>
        <button onClick={fetchData} className="text-sm text-blue-600 hover:underline font-medium">Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Building2 className="w-4 h-4" />Total Sites</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_sites}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Covered</div>
          <div className="text-2xl font-bold text-green-600">{data.sites_covered}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600"><AlertTriangle className="w-4 h-4" />Understaffed</div>
          <div className="text-2xl font-bold text-yellow-600">{data.sites_understaffed}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-red-600"><XCircle className="w-4 h-4" />No Coverage</div>
          <div className="text-2xl font-bold text-red-600">{data.sites_no_coverage}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Users className="w-4 h-4" />Guards Deployed</div>
          <div className="text-2xl font-bold text-blue-600">{data.total_guards_deployed}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'adequately_staffed', 'understaffed', 'no_coverage'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `All (${data.total_sites})` :
             f === 'adequately_staffed' ? `Staffed (${data.sites.filter((s: any) => s.staffing_status === f).length})` :
             f === 'understaffed' ? `Understaffed (${data.sites_understaffed})` :
             `No Coverage (${data.sites_no_coverage})`}
          </button>
        ))}
      </div>

      {/* Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site: any) => (
          <div key={site.site_id} className={`bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 ${
            site.staffing_status === 'adequately_staffed' ? 'border-green-500' :
            site.staffing_status === 'understaffed' ? 'border-yellow-500' : 'border-red-500'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{site.site_name}</h3>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLES[site.staffing_status]}`}>
                  {STATUS_LABELS[site.staffing_status]}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{site.assigned_guards}</div>
                <div className="text-xs text-gray-500">/ {site.min_staff} min</div>
              </div>
            </div>

            {site.guards.length > 0 ? (
              <div className="space-y-1.5">
                {site.guards.map((g: any) => (
                  <div key={`${g.employee_id}-${g.shift_id}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{g.employee_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.checked_in ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">{g.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No guards assigned today</p>
            )}
          </div>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
          <p className="text-gray-500">No sites match this filter.</p>
        </div>
      )}
    </div>
  )
}
