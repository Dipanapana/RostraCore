'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { employeesApi, organizationSettingsApi } from '@/services/api'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Users,
  DollarSign,
  Settings,
  Clock,
} from 'lucide-react'

interface GradeData {
  grade: string
  count: number
  avg_actual_rate: number | null
  default_rates: Record<string, number>
  expired_psira: number
  expiring_soon: number
  no_psira_expiry: number
}

interface GradeStats {
  grades: GradeData[]
  no_grade_count: number
  total_active: number
  has_default_rates: boolean
}

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  A: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-500' },
  B: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-500' },
  C: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-500' },
  D: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-500' },
  E: { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-500' },
}

const GRADE_DESCRIPTIONS: Record<string, string> = {
  A: 'Security Manager / Armed Response',
  B: 'Armed Security Officer',
  C: 'Close Protection Officer',
  D: 'Door Supervisor / Event Security',
  E: 'Security Officer (Basic)',
}

const ROLE_LABELS: Record<string, string> = {
  armed: 'Armed',
  unarmed: 'Unarmed',
  supervisor: 'Supervisor',
}

export default function GuardGradesPage() {
  const router = useRouter()
  const [stats, setStats] = useState<GradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingRates, setApplyingRates] = useState(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await employeesApi.getGradeStats()
      setStats(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load grade statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleApplyRates = async () => {
    setApplyingRates(true)
    setApplySuccess(null)
    try {
      const res = await organizationSettingsApi.applyDefaultRates({ overwrite_existing: false })
      setApplySuccess(
        `Applied rates to ${res.data.updated_count} guards (${res.data.skipped_count} skipped — already have rates)`
      )
      await fetchStats()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply rates')
    } finally {
      setApplyingRates(false)
    }
  }

  const totalWithGrade = stats ? stats.grades.reduce((s, g) => s + g.count, 0) : 0
  const totalExpired = stats ? stats.grades.reduce((s, g) => s + g.expired_psira, 0) : 0
  const totalExpiringSoon = stats ? stats.grades.reduce((s, g) => s + g.expiring_soon, 0) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.back()}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Guard Grades</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            PSIRA grade distribution and wage differentiation across your workforce
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => router.push('/settings/hourly-rates')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure Rates
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {applySuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 dark:text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>{applySuccess}</p>
        </div>
      )}

      {/* No default rates warning */}
      {stats && !stats.has_default_rates && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">No default hourly rates configured</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Configure grade-based default rates to enable auto-population when adding guards.
            </p>
            <button
              onClick={() => router.push('/settings/hourly-rates')}
              className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-medium underline underline-offset-2 hover:no-underline"
            >
              Set up default rates →
            </button>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_active}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Guards</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.no_grade_count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">No Grade Assigned</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalExpired}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Expired PSIRA</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalExpiringSoon}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Expiring ≤ 30 Days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Breakdown Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.grades.map((g) => {
            const colors = GRADE_COLORS[g.grade]
            const pct = stats.total_active > 0 ? Math.round((g.count / stats.total_active) * 100) : 0
            const hasCompliance = g.expired_psira > 0 || g.expiring_soon > 0

            return (
              <div
                key={g.grade}
                className={`rounded-xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3`}
              >
                {/* Grade badge + count */}
                <div className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg ${colors.badge}`}>
                    {g.grade}
                  </span>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${colors.text}`}>{g.count}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{pct}% of force</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                  {GRADE_DESCRIPTIONS[g.grade]}
                </p>

                {/* Avg actual rate */}
                {g.avg_actual_rate !== null && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      R{g.avg_actual_rate.toFixed(2)}/hr avg
                    </span>
                  </div>
                )}

                {/* Default rates mini-table */}
                {Object.keys(g.default_rates).length > 0 && (
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Default Rates
                    </p>
                    {Object.entries(g.default_rates).map(([role, rate]) => (
                      <div key={role} className="flex justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{ROLE_LABELS[role] || role}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">R{rate.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Compliance status */}
                {g.count > 0 && (
                  <div className="border-t border-slate-200/60 dark:border-white/10 pt-2 space-y-0.5">
                    {g.expired_psira > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        {g.expired_psira} expired PSIRA
                      </div>
                    )}
                    {g.expiring_soon > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        {g.expiring_soon} expiring soon
                      </div>
                    )}
                    {!hasCompliance && g.no_psira_expiry === 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        All PSIRA current
                      </div>
                    )}
                    {g.no_psira_expiry > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Shield className="w-3 h-3" />
                        {g.no_psira_expiry} no expiry set
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Apply Rates Action */}
      {stats && stats.has_default_rates && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Apply Default Rates to Guards</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk-update guards who don&apos;t yet have an hourly rate, using their grade and role.
              </p>
            </div>
            <button
              onClick={handleApplyRates}
              disabled={applyingRates}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <DollarSign className="w-4 h-4" />
              {applyingRates ? 'Applying…' : 'Apply Missing Rates'}
            </button>
          </div>
        </div>
      )}

      {/* Grade distribution bar */}
      {stats && totalWithGrade > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Grade Distribution</h3>
          <div className="flex h-8 rounded-lg overflow-hidden gap-px">
            {stats.grades
              .filter((g) => g.count > 0)
              .map((g) => {
                const pct = (g.count / stats.total_active) * 100
                return (
                  <div
                    key={g.grade}
                    className={`${GRADE_COLORS[g.grade].badge} flex items-center justify-center text-white text-xs font-bold transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`Grade ${g.grade}: ${g.count} (${pct.toFixed(1)}%)`}
                  >
                    {pct > 6 ? g.grade : ''}
                  </div>
                )
              })}
            {stats.no_grade_count > 0 && (
              <div
                className="bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-bold"
                style={{ width: `${(stats.no_grade_count / stats.total_active) * 100}%` }}
                title={`No grade: ${stats.no_grade_count}`}
              >
                {((stats.no_grade_count / stats.total_active) * 100) > 6 ? '?' : ''}
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {stats.grades.filter((g) => g.count > 0).map((g) => (
              <div key={g.grade} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className={`w-3 h-3 rounded-sm ${GRADE_COLORS[g.grade].badge}`} />
                Grade {g.grade} ({g.count})
              </div>
            ))}
            {stats.no_grade_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
                No grade ({stats.no_grade_count})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
