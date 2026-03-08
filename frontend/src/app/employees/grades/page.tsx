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
import DashboardLayout from '@/components/layout/DashboardLayout'

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
  A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-500' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-500' },
  E: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-500' },
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

  const grades = stats?.grades ?? []
  const totalWithGrade = grades.reduce((s, g) => s + g.count, 0)
  const totalExpired = grades.reduce((s, g) => s + g.expired_psira, 0)
  const totalExpiringSoon = grades.reduce((s, g) => s + g.expiring_soon, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
      </div>
    )
  }

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Guard Grades</h1>
          <p className="text-gray-500 mt-1">
            PSIRA grade distribution and wage differentiation across your workforce
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {applySuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>{applySuccess}</p>
        </div>
      )}

      {/* No default rates warning */}
      {stats && !stats.has_default_rates && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">No default hourly rates configured</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Configure grade-based default rates to enable auto-population when adding guards.
            </p>
            <button
              onClick={() => router.push('/settings/hourly-rates')}
              className="mt-2 text-sm text-amber-600 font-medium underline underline-offset-2 hover:no-underline"
            >
              Set up default rates →
            </button>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_active}</p>
                <p className="text-xs text-gray-500">Active Guards</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.no_grade_count}</p>
                <p className="text-xs text-gray-500">No Grade Assigned</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalExpired}</p>
                <p className="text-xs text-gray-500">Expired PSIRA</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalExpiringSoon}</p>
                <p className="text-xs text-gray-500">Expiring ≤ 30 Days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Breakdown Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {(stats.grades ?? []).map((g) => {
            const colors = GRADE_COLORS[g.grade] ?? GRADE_COLORS.E
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
                    <p className="text-xs text-gray-500">{pct}% of force</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-tight">
                  {GRADE_DESCRIPTIONS[g.grade]}
                </p>

                {/* Avg actual rate */}
                {g.avg_actual_rate !== null && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      R{g.avg_actual_rate.toFixed(2)}/hr avg
                    </span>
                  </div>
                )}

                {/* Default rates mini-table */}
                {Object.keys(g.default_rates).length > 0 && (
                  <div className="bg-white/60 rounded-lg p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Default Rates
                    </p>
                    {Object.entries(g.default_rates).map(([role, rate]) => (
                      <div key={role} className="flex justify-between text-xs">
                        <span className="text-gray-600">{ROLE_LABELS[role] || role}</span>
                        <span className="font-medium text-gray-700">R{rate.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Compliance status */}
                {g.count > 0 && (
                  <div className="border-t border-gray-200/60 pt-2 space-y-0.5">
                    {g.expired_psira > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        {g.expired_psira} expired PSIRA
                      </div>
                    )}
                    {g.expiring_soon > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Clock className="w-3 h-3" />
                        {g.expiring_soon} expiring soon
                      </div>
                    )}
                    {!hasCompliance && g.no_psira_expiry === 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle className="w-3 h-3" />
                        All PSIRA current
                      </div>
                    )}
                    {g.no_psira_expiry > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">Apply Default Rates to Guards</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Bulk-update guards who don&apos;t yet have an hourly rate, using their grade and role.
              </p>
            </div>
            <button
              onClick={handleApplyRates}
              disabled={applyingRates}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <DollarSign className="w-4 h-4" />
              {applyingRates ? 'Applying…' : 'Apply Missing Rates'}
            </button>
          </div>
        </div>
      )}

      {/* Grade distribution bar */}
      {stats && totalWithGrade > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Grade Distribution</h3>
          <div className="flex h-8 rounded-lg overflow-hidden gap-px">
            {(stats.grades ?? [])
              .filter((g) => g.count > 0)
              .map((g) => {
                const pct = (g.count / stats.total_active) * 100
                return (
                  <div
                    key={g.grade}
                    className={`${(GRADE_COLORS[g.grade] ?? GRADE_COLORS.E).badge} flex items-center justify-center text-white text-xs font-bold transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`Grade ${g.grade}: ${g.count} (${pct.toFixed(1)}%)`}
                  >
                    {pct > 6 ? g.grade : ''}
                  </div>
                )
              })}
            {stats.no_grade_count > 0 && (
              <div
                className="bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold"
                style={{ width: `${(stats.no_grade_count / stats.total_active) * 100}%` }}
                title={`No grade: ${stats.no_grade_count}`}
              >
                {((stats.no_grade_count / stats.total_active) * 100) > 6 ? '?' : ''}
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {(stats.grades ?? []).filter((g) => g.count > 0).map((g) => (
              <div key={g.grade} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`w-3 h-3 rounded-sm ${(GRADE_COLORS[g.grade] ?? GRADE_COLORS.E).badge}`} />
                Grade {g.grade} ({g.count})
              </div>
            ))}
            {stats.no_grade_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm bg-gray-300" />
                No grade ({stats.no_grade_count})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
