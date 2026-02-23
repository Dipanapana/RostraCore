'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { employeesApi } from '@/services/api'
import {
  BarChart3,
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Star,
  FileWarning,
  CalendarDays,
  ShieldBan,
  Gavel,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HrAnalytics {
  as_of: string
  headcount: {
    total: number
    active: number
    inactive: number
    by_role: Record<string, number>
    by_grade: Record<string, number>
  }
  certifications: {
    total: number
    expired: number
    expiring_30d: number
    expiring_90d: number
    valid: number
    psira_expired: number
    psira_expiring_30d: number
    psira_no_date: number
  }
  performance: {
    evaluations_ytd: number
    avg_overall_score: number | null
    score_distribution: Record<string, number>
  }
  disciplinary: {
    cases_ytd: number
    by_type: Record<string, number>
  }
  leave: {
    total_days_ytd: number
    by_type: Record<string, number>
  }
  restrictions: {
    active_count: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(score) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HrAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HrAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await employeesApi.getHrAnalytics()
        setData(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load HR analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading HR analytics…
        </div>
      </DashboardLayout>
    )
  }

  const d = data
  if (!d) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error || 'No data available'}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  const h = d.headcount
  const c = d.certifications
  const p = d.performance
  const disc = d.disciplinary
  const lv = d.leave

  // Sort role and grade entries by count descending
  const roleEntries = Object.entries(h.by_role).sort((a, b) => b[1] - a[1])
  const gradeEntries = Object.entries(h.by_grade).sort((a, b) => {
    const order = ['A', 'B', 'C', 'D', 'E', 'Ungraded']
    return order.indexOf(a[0]) - order.indexOf(b[0])
  })
  const maxRoleCount = Math.max(...roleEntries.map(([, v]) => v), 1)
  const maxGradeCount = Math.max(...gradeEntries.map(([, v]) => v), 1)

  const leaveEntries = Object.entries(lv.by_type).sort((a, b) => b[1] - a[1])
  const maxLeaveDays = Math.max(...leaveEntries.map(([, v]) => v), 1)

  const caseEntries = Object.entries(disc.by_type).sort((a, b) => b[1] - a[1])

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            HR Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Workforce overview — headcount, certifications, performance, disciplinary, and leave utilisation for {new Date().getFullYear()}.
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Guards', value: h.active, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Certs Expired', value: c.expired, icon: FileWarning, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Evaluations YTD', value: p.evaluations_ytd, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Disciplinary Cases', value: disc.cases_ytd, icon: Gavel, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <div className={`${bg} rounded-lg p-1.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Headcount by Role ──────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-500" /> Headcount by Role
            </h2>
            <div className="space-y-3">
              {roleEntries.map(([role, count]) => (
                <div key={role}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{role}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <ProgressBar value={count} max={maxRoleCount} color="bg-indigo-500" />
                </div>
              ))}
              {roleEntries.length === 0 && (
                <p className="text-xs text-gray-400">No active employees.</p>
              )}
            </div>
          </div>

          {/* ── Headcount by Grade ─────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-violet-500" /> Headcount by Grade
            </h2>
            <div className="space-y-3">
              {gradeEntries.map(([grade, count]) => (
                <div key={grade}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Grade {grade}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <ProgressBar value={count} max={maxGradeCount} color="bg-violet-500" />
                </div>
              ))}
              {gradeEntries.length === 0 && (
                <p className="text-xs text-gray-400">No grade data available.</p>
              )}
            </div>
          </div>

          {/* ── Certification Compliance ────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-sky-500" /> Certification Compliance
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Valid', value: c.valid, color: 'text-emerald-600', icon: CheckCircle2 },
                { label: 'Expiring ≤30d', value: c.expiring_30d, color: 'text-orange-600', icon: AlertTriangle },
                { label: 'Expiring ≤90d', value: c.expiring_90d, color: 'text-amber-600', icon: AlertTriangle },
                { label: 'Expired', value: c.expired, color: 'text-red-600', icon: FileWarning },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* PSIRA sub-section */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">PSIRA Registration</p>
              <div className="flex gap-4 text-xs">
                <span className="text-red-600 font-medium">{c.psira_expired} expired</span>
                <span className="text-orange-600 font-medium">{c.psira_expiring_30d} expiring ≤30d</span>
                <span className="text-gray-400">{c.psira_no_date} no date set</span>
              </div>
            </div>
          </div>

          {/* ── Performance Snapshot ────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Performance Snapshot ({new Date().getFullYear()})
            </h2>

            {p.evaluations_ytd > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {p.avg_overall_score?.toFixed(1) ?? '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Score</p>
                  </div>
                  {p.avg_overall_score && <ScoreStars score={p.avg_overall_score} />}
                  <div className="ml-auto text-right">
                    <p className="text-lg font-bold text-gray-900">{p.evaluations_ytd}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Evaluations</p>
                  </div>
                </div>

                {/* Score distribution */}
                <p className="text-xs font-medium text-gray-500 mb-2">Score Distribution</p>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = p.score_distribution[String(score)] ?? 0
                    return (
                      <div key={score} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right text-gray-500">{score}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1">
                          <ProgressBar value={count} max={p.evaluations_ytd} color="bg-amber-400" />
                        </div>
                        <span className="w-6 text-right text-gray-600 font-medium">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No evaluations recorded this year.</p>
              </div>
            )}
          </div>

          {/* ── Disciplinary Summary ────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Gavel className="w-4 h-4 text-orange-500" /> Disciplinary Cases ({new Date().getFullYear()})
            </h2>

            {caseEntries.length > 0 ? (
              <div className="space-y-3">
                {caseEntries.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{type}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      type.includes('Dismissal') ? 'bg-red-100 text-red-700' :
                      type.includes('Final') ? 'bg-orange-100 text-orange-700' :
                      type.includes('Suspension') ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No disciplinary cases this year.</p>
              </div>
            )}

            {/* Restrictions count */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500">
                <ShieldBan className="w-3.5 h-3.5" /> Active Guard Restrictions
              </span>
              <span className="font-bold text-gray-800">{d.restrictions.active_count}</span>
            </div>
          </div>

          {/* ── Leave Utilisation ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-sky-500" /> Leave Utilisation ({new Date().getFullYear()})
            </h2>

            <div className="flex items-center gap-3 mb-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">{lv.total_days_ytd}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Days</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold text-gray-900">{leaveEntries.length}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Leave Types Used</p>
              </div>
            </div>

            {leaveEntries.length > 0 ? (
              <div className="space-y-3">
                {leaveEntries.map(([type, days]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{type}</span>
                      <span className="font-semibold text-gray-800">{days}d</span>
                    </div>
                    <ProgressBar value={days} max={maxLeaveDays} color="bg-sky-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No approved leave recorded this year.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
