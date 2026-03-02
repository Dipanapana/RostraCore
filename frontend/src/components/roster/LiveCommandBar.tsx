'use client'

interface LiveCommandBarProps {
  totalCost: number
  fillRate: number
  filledCount: number
  totalRequired: number
  unfilledCount: number
  totalShifts: number
  undoCount?: number
  autoFillGaps?: number
  onUndo?: () => void
  onAutoFill?: () => void
  autoFilling?: boolean
  onInsights?: () => void
  insightsCount?: number
  insightsLoading?: boolean
}

export default function LiveCommandBar({
  totalCost,
  fillRate,
  filledCount,
  totalRequired,
  unfilledCount,
  totalShifts,
  undoCount = 0,
  autoFillGaps = 0,
  onUndo,
  onAutoFill,
  autoFilling = false,
  onInsights,
  insightsCount = 0,
  insightsLoading = false,
}: LiveCommandBarProps) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (fillRate / 100) * circumference
  const rateColor = fillRate >= 90 ? '#22c55e' : fillRate >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex-shrink-0 h-14 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-20 flex items-center justify-between px-6">
      {/* Left: Metrics */}
      <div className="flex items-center gap-6">
        {/* Total Cost */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Cost</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums transition-all duration-300">
            R{totalCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Fill Rate Ring */}
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke={rateColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
              {Math.round(fillRate)}%
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-900">{filledCount}</span>/{totalRequired} filled
          </div>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Shifts */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Shifts</span>
          <span className="text-sm font-medium text-gray-700 tabular-nums">{totalShifts}</span>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Gaps */}
        <div className="flex items-center gap-1.5">
          {unfilledCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {autoFillGaps} gaps ({unfilledCount} shifts)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All filled
            </span>
          )}
        </div>

        {/* Insights button */}
        {unfilledCount > 0 && (
          <>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={onInsights}
              disabled={insightsLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-60 transition-colors"
            >
              {insightsLoading ? (
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              Insights
              {insightsCount > 0 && (
                <span className="w-4 h-4 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {insightsCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={undoCount === 0}
          className="relative px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Undo last action (Ctrl+Z)"
        >
          <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3m0-10l4-4m-4 4l4 4" />
          </svg>
          Undo
          {undoCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {undoCount}
            </span>
          )}
        </button>

        {/* Auto-Fill */}
        <button
          onClick={onAutoFill}
          disabled={autoFillGaps === 0 || autoFilling}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {autoFilling ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Filling...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto-Fill ({autoFillGaps} gaps)
            </>
          )}
        </button>
      </div>
    </div>
  )
}
