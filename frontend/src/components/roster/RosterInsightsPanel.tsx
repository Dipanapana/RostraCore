'use client'

import { useState, useEffect, useRef } from 'react'

interface GapSummaryItem {
  reason: string
  count: number
  pct: number
  description: string
}

interface Recommendation {
  type: 'quick_fill' | 'relax_constraint' | 'hire' | 'extend_availability'
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact: number
  message: string
  action: { assignments?: { shift_id: number; employee_id: number }[] } | null
}

interface ShiftDiagnostic {
  shift_id: number
  site_name: string
  client_name: string
  date: string
  time: string
  required_skill: string | null
  gaps: number
  top_blocker: string | null
  blocker_counts: Record<string, number>
  best_candidates: {
    employee_id: number
    name: string
    blocker: string | null
    fit_score: number
  }[]
}

export interface GapInsightsData {
  roster_id: number
  analysis_time_ms: number
  unfilled_count: number
  total_gap_slots: number
  gap_summary: GapSummaryItem[]
  recommendations: Recommendation[]
  per_shift_diagnostics: ShiftDiagnostic[]
}

interface RosterInsightsPanelProps {
  open: boolean
  onClose: () => void
  data: GapInsightsData | null
  loading: boolean
  error: string | null
  onQuickFill: (assignments: { shift_id: number; employee_id: number }[]) => Promise<void>
  onAssignSingle: (shiftId: number, employeeId: number) => Promise<void>
}

const BLOCKER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  skill_mismatch: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  client_restriction: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  unavailable: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  time_conflict: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  hours_exceeded: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  rest_violation: { bg: 'bg-gray-50', text: 'text-gray-700', bar: 'bg-gray-400' },
  psira_issue: { bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-500' },
  insufficient_staff: { bg: 'bg-gray-100', text: 'text-gray-800', bar: 'bg-gray-600' },
}

const BLOCKER_LABELS: Record<string, string> = {
  skill_mismatch: 'Skill Mismatch',
  client_restriction: 'Client Restriction',
  unavailable: 'Unavailable',
  time_conflict: 'Time Conflict',
  hours_exceeded: 'Hours Exceeded',
  rest_violation: 'Rest Violation',
  psira_issue: 'PSIRA Issue',
  insufficient_staff: 'Insufficient Staff',
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function RosterInsightsPanel({
  open,
  onClose,
  data,
  loading,
  error,
  onQuickFill,
  onAssignSingle,
}: RosterInsightsPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set())
  const [fillingQuick, setFillingQuick] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset expanded state when data changes
  useEffect(() => {
    setExpandedShifts(new Set())
  }, [data])

  const toggleShift = (shiftId: number) => {
    setExpandedShifts((prev) => {
      const next = new Set(prev)
      if (next.has(shiftId)) next.delete(shiftId)
      else next.add(shiftId)
      return next
    })
  }

  const handleQuickFill = async (assignments: { shift_id: number; employee_id: number }[]) => {
    setFillingQuick(true)
    try {
      await onQuickFill(assignments)
    } finally {
      setFillingQuick(false)
    }
  }

  const handleAssignSingle = async (shiftId: number, empId: number) => {
    const key = `${shiftId}-${empId}`
    setAssigningId(key)
    try {
      await onAssignSingle(shiftId, empId)
    } finally {
      setAssigningId(null)
    }
  }

  const maxBarCount = data ? Math.max(...data.gap_summary.map((g) => g.count), 1) : 1

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={ref}
        className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900">Gap Insights</h2>
            {data && (
              <span className="text-[10px] text-gray-400">
                {data.analysis_time_ms}ms
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-gray-500">Analyzing all shifts and employees...</p>
            </div>
          ) : error ? (
            <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              No data
            </div>
          ) : (
            <>
              {/* Summary stat */}
              <div className="px-4 py-3 bg-purple-50/50 border-b border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{data.total_gap_slots}</span>
                    <span className="ml-1 text-gray-500">unfilled slots</span>
                  </div>
                  <div className="text-gray-400">across</div>
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{data.unfilled_count}</span>
                    <span className="ml-1 text-gray-500">shifts</span>
                  </div>
                </div>
              </div>

              {/* Section A: Gap Summary */}
              {data.gap_summary.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Why Shifts Are Unfilled
                  </h3>
                  <div className="space-y-2">
                    {data.gap_summary.map((g) => {
                      const colors = BLOCKER_COLORS[g.reason] || BLOCKER_COLORS.insufficient_staff
                      return (
                        <div key={g.reason}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-medium ${colors.text}`}>
                              {BLOCKER_LABELS[g.reason] || g.reason}
                            </span>
                            <span className="text-xs text-gray-500 tabular-nums">
                              {g.count} slots ({g.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                              style={{ width: `${(g.count / maxBarCount) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{g.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Section B: Recommendations */}
              {data.recommendations.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Recommendations
                  </h3>
                  <div className="space-y-2">
                    {data.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <span
                            className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${PRIORITY_STYLES[rec.priority]}`}
                          >
                            {rec.priority}
                          </span>
                          <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            {rec.impact} shifts
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{rec.message}</p>
                        {rec.type === 'quick_fill' && rec.action?.assignments && (
                          <button
                            onClick={() => handleQuickFill(rec.action!.assignments!)}
                            disabled={fillingQuick}
                            className="mt-2 w-full px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {fillingQuick ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Filling...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Auto-Fill {rec.action.assignments.length} Shifts
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section C: Shift Drill-Down */}
              <div className="px-4 py-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Shift Details ({data.per_shift_diagnostics.length})
                </h3>
                <div className="space-y-1">
                  {data.per_shift_diagnostics.slice(0, 50).map((diag) => {
                    const isExpanded = expandedShifts.has(diag.shift_id)
                    const blockerColor = BLOCKER_COLORS[diag.top_blocker || ''] || BLOCKER_COLORS.insufficient_staff

                    return (
                      <div key={diag.shift_id} className="border border-gray-100 rounded-lg overflow-hidden">
                        {/* Shift header (clickable) */}
                        <button
                          onClick={() => toggleShift(diag.shift_id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-900 truncate">{diag.site_name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{diag.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400">{diag.date}</span>
                              {diag.required_skill && (
                                <span className="text-[10px] px-1 py-0 rounded bg-gray-100 text-gray-500">
                                  {diag.required_skill}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-bold text-red-600">{diag.gaps} gap{diag.gaps > 1 ? 's' : ''}</span>
                            {diag.top_blocker && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${blockerColor.bg} ${blockerColor.text}`}>
                                {BLOCKER_LABELS[diag.top_blocker] || diag.top_blocker}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 bg-gray-50/50 border-t border-gray-100">
                            {/* Blocker breakdown */}
                            {Object.keys(diag.blocker_counts).length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Blockers</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(diag.blocker_counts)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([reason, count]) => {
                                      const c = BLOCKER_COLORS[reason] || BLOCKER_COLORS.insufficient_staff
                                      return (
                                        <span
                                          key={reason}
                                          className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}
                                        >
                                          {BLOCKER_LABELS[reason] || reason}: {count}
                                        </span>
                                      )
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Best candidates */}
                            {diag.best_candidates.length > 0 && (
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Best Candidates</p>
                                <div className="space-y-1">
                                  {diag.best_candidates.map((c) => (
                                    <div
                                      key={c.employee_id}
                                      className="flex items-center justify-between bg-white px-2 py-1 rounded border border-gray-100"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-medium text-gray-900 truncate">{c.name}</span>
                                        <span className="text-[10px] text-gray-400 tabular-nums">
                                          {Math.round(c.fit_score)}
                                        </span>
                                        {c.blocker && (
                                          <span className={`text-[10px] px-1 py-0 rounded ${BLOCKER_COLORS[c.blocker]?.bg || 'bg-gray-100'} ${BLOCKER_COLORS[c.blocker]?.text || 'text-gray-600'}`}>
                                            {BLOCKER_LABELS[c.blocker] || c.blocker}
                                          </span>
                                        )}
                                      </div>
                                      {!c.blocker && (
                                        <button
                                          onClick={() => handleAssignSingle(diag.shift_id, c.employee_id)}
                                          disabled={assigningId === `${diag.shift_id}-${c.employee_id}`}
                                          className="flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                        >
                                          {assigningId === `${diag.shift_id}-${c.employee_id}` ? '...' : 'Assign'}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {diag.best_candidates.length === 0 && Object.keys(diag.blocker_counts).length === 0 && (
                              <p className="text-[10px] text-gray-400 italic">No detailed data available</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
