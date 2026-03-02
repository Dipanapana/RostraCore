'use client'

import { useDroppable } from '@dnd-kit/core'

interface Assignment {
  assignment_id?: number
  employee_id: number
  employee_name: string
  cost: number
}

interface ShiftSlotProps {
  shiftId: number
  siteName: string
  startTime: string
  endTime: string
  requiredStaff: number
  assignments: Assignment[]
  dragHint?: 'feasible' | 'warning' | 'blocked' | null
  isNewlyFilled?: boolean
  onAssignmentContextMenu?: (info: {
    assignmentId: number
    employeeId: number
    employeeName: string
    x: number
    y: number
  }) => void
  onSlotClick?: (info: { shiftId: number; x: number; y: number }) => void
}

export default function ShiftSlot({
  shiftId,
  siteName,
  startTime,
  endTime,
  requiredStaff,
  assignments,
  dragHint,
  isNewlyFilled,
  onAssignmentContextMenu,
  onSlotClick,
}: ShiftSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `shift-${shiftId}`,
    data: { type: 'shift', shiftId },
  })

  const filledCount = assignments.length
  const isFull = filledCount >= requiredStaff
  const fillPercent = Math.min(100, (filledCount / requiredStaff) * 100)

  // Drag hints override normal background colors
  const bgColor = isOver
    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
    : dragHint === 'feasible'
    ? 'bg-green-50/60 border-green-400 ring-2 ring-green-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
    : dragHint === 'warning'
    ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
    : dragHint === 'blocked'
    ? 'bg-red-50/30 border-red-200 ring-1 ring-red-200 opacity-50'
    : isFull
    ? 'bg-green-50 border-green-300'
    : filledCount > 0
    ? 'bg-amber-50 border-amber-300'
    : 'bg-gray-50 border-gray-200'

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-2 rounded-lg border-2 ${bgColor} min-h-[80px] transition-all duration-200 ${
        isNewlyFilled ? 'animate-pulse ring-2 ring-green-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 font-mono">
          {formatTime(startTime)}-{formatTime(endTime)}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          isFull ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
        }`}>
          {filledCount}/{requiredStaff}
        </span>
      </div>

      {/* Fill indicator bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full mb-1.5">
        <div
          className={`h-1 rounded-full transition-all ${
            isFull ? 'bg-green-500' : filledCount > 0 ? 'bg-amber-500' : 'bg-gray-300'
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      {/* Assigned guards */}
      <div className="space-y-1">
        {assignments.map((a) => (
          <div
            key={a.employee_id}
            onContextMenu={(e) => {
              e.preventDefault()
              onAssignmentContextMenu?.({
                assignmentId: a.assignment_id || 0,
                employeeId: a.employee_id,
                employeeName: a.employee_name,
                x: e.clientX,
                y: e.clientY,
              })
            }}
            className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-100 truncate cursor-context-menu hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {a.employee_name}
          </div>
        ))}
        {!isFull && (
          <div
            onClick={(e) => {
              if (!dragHint) {
                e.stopPropagation()
                onSlotClick?.({ shiftId, x: e.clientX, y: e.clientY })
              }
            }}
            className={`text-[10px] text-center py-1 ${
              dragHint ? 'italic text-gray-400' : 'cursor-pointer hover:bg-blue-50 rounded px-1 transition-colors group'
            }`}
          >
            {dragHint === 'feasible' ? (
              <span className="text-green-600 font-medium not-italic">Drop here</span>
            ) : dragHint === 'warning' ? (
              <span className="text-amber-600 font-medium not-italic">Drop (with warnings)</span>
            ) : (
              <span className="text-gray-400 group-hover:text-blue-600 transition-colors flex items-center justify-center gap-1">
                <svg className="w-3 h-3 opacity-40 group-hover:opacity-100 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Find guard
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
