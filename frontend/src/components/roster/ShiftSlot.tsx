'use client'

import { useDroppable } from '@dnd-kit/core'

interface Assignment {
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
  isOver?: boolean
}

export default function ShiftSlot({
  shiftId,
  siteName,
  startTime,
  endTime,
  requiredStaff,
  assignments,
}: ShiftSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `shift-${shiftId}`,
    data: { type: 'shift', shiftId },
  })

  const filledCount = assignments.length
  const isFull = filledCount >= requiredStaff
  const fillPercent = Math.min(100, (filledCount / requiredStaff) * 100)

  const bgColor = isOver
    ? 'bg-blue-50 border-blue-400'
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
      className={`p-2 rounded-lg border-2 ${bgColor} min-h-[80px] transition-colors`}
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
            className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-100 truncate"
          >
            {a.employee_name}
          </div>
        ))}
        {!isFull && (
          <div className="text-[10px] text-gray-400 italic text-center py-1">
            Drop guard here
          </div>
        )}
      </div>
    </div>
  )
}
