'use client'

import { useState, useEffect, useCallback } from 'react'
import { skillsMatrixApi } from '@/services/api'
import { Grid3X3, Shield, AlertTriangle, Award, GraduationCap, Crosshair } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expiring: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  missing: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  not_completed: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  unverified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const STATUS_LABELS: Record<string, string> = {
  valid: 'Valid', completed: 'Done', expiring: 'Expiring', expired: 'Expired',
  missing: '—', not_completed: '—', unverified: 'Unverified',
}

type TabType = 'dashboard' | 'matrix'

export default function SkillsMatrixPage() {
  const [tab, setTab] = useState<TabType>('dashboard')
  const [dashboard, setDashboard] = useState<any>(null)
  const [matrix, setMatrix] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await skillsMatrixApi.dashboard()
      setDashboard(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchMatrix = useCallback(async () => {
    try {
      const res = await skillsMatrixApi.overview()
      setMatrix(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    if (tab === 'dashboard') {
      fetchDashboard().finally(() => setLoading(false))
    } else {
      fetchMatrix().finally(() => setLoading(false))
    }
  }, [tab, fetchDashboard, fetchMatrix])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3X3 className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Skills Matrix</h1>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button onClick={() => setTab('dashboard')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
            Dashboard
          </button>
          <button onClick={() => setTab('matrix')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === 'matrix' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>
            Full Matrix
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}

      {/* Dashboard Tab */}
      {!loading && tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="text-sm text-gray-500">Active Employees</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_employees}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="flex items-center gap-2 text-sm text-green-600"><Shield className="w-4 h-4" />PSIRA Valid</div>
              <div className="text-2xl font-bold text-green-600">{dashboard.psira_valid}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="w-4 h-4" />PSIRA Expired</div>
              <div className="text-2xl font-bold text-red-600">{dashboard.psira_expired}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="flex items-center gap-2 text-sm text-yellow-600">Expiring 30d</div>
              <div className="text-2xl font-bold text-yellow-600">{dashboard.psira_expiring_30d}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500"><Crosshair className="w-4 h-4" />Armed Capable</div>
              <div className="text-2xl font-bold text-indigo-600">{dashboard.armed_capable}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By PSIRA Grade */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4" />By PSIRA Grade</h2>
              {Object.keys(dashboard.by_psira_grade).length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D', 'E', 'None'].map(grade => {
                    const count = dashboard.by_psira_grade[grade] || 0
                    if (count === 0) return null
                    const pct = dashboard.total_employees ? (count / dashboard.total_employees) * 100 : 0
                    return (
                      <div key={grade} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Grade {grade}</span>
                          <span className="text-sm text-gray-500">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="h-2 rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cert Coverage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Award className="w-4 h-4" />Certification Coverage</h2>
              {dashboard.cert_coverage.length === 0 ? (
                <p className="text-sm text-gray-400">No certifications</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.cert_coverage.map((c: any) => (
                    <div key={c.cert_type} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.cert_type}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">{c.valid} valid</span>
                        <span className="text-red-600">{c.expired} expired</span>
                        <span className="text-gray-400">/ {c.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Training Coverage */}
          {dashboard.training_coverage.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" />Training Coverage</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2">Course</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-center">Mandatory</th>
                      <th className="pb-2 text-right">Completed</th>
                      <th className="pb-2 text-right">Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.training_coverage.map((t: any) => (
                      <tr key={t.course_id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="py-2 font-medium text-gray-900 dark:text-white">{t.course_name}</td>
                        <td className="py-2 text-gray-500 capitalize">{t.category?.replace('_', ' ') || '—'}</td>
                        <td className="py-2 text-center">{t.is_mandatory ? <span className="text-red-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                        <td className="py-2 text-right">{t.employees_completed}/{t.total_employees}</td>
                        <td className="py-2 text-right">
                          <span className={`font-bold ${t.coverage_rate >= 80 ? 'text-green-600' : t.coverage_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {t.coverage_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expiring Certs */}
          {dashboard.expiring_certs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />Certs Expiring Within 30 Days
              </h2>
              <div className="space-y-2">
                {dashboard.expiring_certs.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{c.employee_name}</div>
                      <div className="text-xs text-gray-500">{c.cert_type}</div>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
                      {c.days_remaining}d left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Matrix Tab */}
      {!loading && tab === 'matrix' && matrix && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{matrix.total_employees} employees &middot; {matrix.cert_types.length} cert types &middot; {matrix.training_courses.length} courses</p>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-2 sticky left-0 bg-white dark:bg-gray-800 z-10 min-w-[160px]">Employee</th>
                  <th className="p-2">PSIRA</th>
                  <th className="p-2">Firearm</th>
                  {matrix.cert_types.map((ct: string) => (
                    <th key={ct} className="p-2 whitespace-nowrap">{ct}</th>
                  ))}
                  {matrix.training_courses.map((cn: string) => (
                    <th key={cn} className="p-2 whitespace-nowrap">{cn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.employees.map((emp: any) => (
                  <tr key={emp.employee_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-2 sticky left-0 bg-white dark:bg-gray-800 z-10">
                      <div className="font-medium text-gray-900 dark:text-white">{emp.employee_name}</div>
                      <div className="text-gray-400">{emp.role}</div>
                    </td>
                    <td className="p-2">
                      {emp.psira_grade ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[emp.psira_status]}`}>
                          {emp.psira_grade} {emp.psira_status !== 'valid' ? `(${emp.psira_status})` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      {emp.firearm_competency ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{emp.firearm_competency}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {matrix.cert_types.map((ct: string) => {
                      const status = emp.certifications[ct] || 'missing'
                      return (
                        <td key={ct} className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                      )
                    })}
                    {matrix.training_courses.map((cn: string) => {
                      const status = emp.training[cn] || 'not_completed'
                      return (
                        <td key={cn} className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
