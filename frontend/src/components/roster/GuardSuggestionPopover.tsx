'use client'

import { useState, useEffect, useRef } from 'react'
import { getApiUrl } from '@/lib/config'

interface Suggestion {
  employee_id: number
  name: string
  role: string
  psira_grade: string | null
  hourly_rate: number | null
  fit_score: number
  reasons: string[]
  feasible: boolean
  current_assignments: number
}

interface GuardSuggestionPopoverProps {
  shiftId: number
  rosterId: number
  anchorX: number
  anchorY: number
  onAssign: (employeeId: number) => void
  onClose: () => void
}

export default function GuardSuggestionPopover({
  shiftId,
  rosterId,
  anchorX,
  anchorY,
  onAssign,
  onClose,
}: GuardSuggestionPopoverProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(
          `${getApiUrl()}/api/v1/roster/suggest-guards?shift_id=${shiftId}&roster_id=${rosterId}&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        if (!res.ok) throw new Error('Failed to fetch suggestions')
        const data: Suggestion[] = await res.json()
        setSuggestions(data)
      } catch (err) {
        setError('Could not load suggestions')
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestions()
  }, [shiftId, rosterId])

  // Position: below the click point, clamp to viewport
  const popoverWidth = 320
  const popoverMaxHeight = 360
  const adjustedX = Math.min(anchorX, (typeof window !== 'undefined' ? window.innerWidth : 1200) - popoverWidth - 16)
  const adjustedY = Math.min(anchorY + 8, (typeof window !== 'undefined' ? window.innerHeight : 800) - popoverMaxHeight - 16)

  const scoreColor = (score: number) =>
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ left: adjustedX, top: adjustedY, width: popoverWidth, maxHeight: popoverMaxHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">Best Fit Guards</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: popoverMaxHeight - 44 }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-xs text-gray-500">Finding best matches...</span>
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-xs text-red-600 text-center">{error}</div>
        ) : suggestions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">No available guards found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {suggestions.map((s, i) => (
              <div
                key={s.employee_id}
                className={`px-3 py-2 hover:bg-gray-50 transition-colors ${
                  !s.feasible ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-400 font-mono w-4">#{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                  </div>
                  <button
                    onClick={() => s.feasible && onAssign(s.employee_id)}
                    disabled={!s.feasible}
                    className="flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Assign
                  </button>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreColor(s.fit_score)}`}
                      style={{ width: `${s.fit_score}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 tabular-nums w-8 text-right">
                    {Math.round(s.fit_score)}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.role && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">{s.role}</span>
                  )}
                  {s.psira_grade && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                      {s.psira_grade}
                    </span>
                  )}
                  {s.hourly_rate != null && (
                    <span className="text-[10px] text-gray-500">R{s.hourly_rate}/h</span>
                  )}
                  {s.reasons.map((r, j) => (
                    <span key={j} className="text-[10px] text-gray-400">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
