'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface GuardCardProps {
  employee: {
    employee_id: number
    first_name: string
    last_name: string
    role: string
    psira_grade?: string
    hourly_rate?: number
  }
  compact?: boolean
}

const roleBadgeColors: Record<string, string> = {
  armed: 'bg-red-100 text-red-700',
  unarmed: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-purple-100 text-purple-700',
  manager: 'bg-indigo-100 text-indigo-700',
}

export default function GuardCard({ employee, compact }: GuardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guard-${employee.employee_id}`,
    data: { type: 'guard', employee },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const badgeColor = roleBadgeColors[employee.role] || 'bg-gray-100 text-gray-700'

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs cursor-grab active:cursor-grabbing shadow-sm hover:shadow"
      >
        <span className="font-medium truncate">
          {employee.first_name} {employee.last_name[0]}.
        </span>
        {employee.psira_grade && (
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded">
            {employee.psira_grade}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {employee.first_name} {employee.last_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor}`}>
            {employee.role}
          </span>
          {employee.psira_grade && (
            <span className="text-[10px] text-gray-500">Grade {employee.psira_grade}</span>
          )}
        </div>
      </div>
      {employee.hourly_rate && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          R{employee.hourly_rate}/h
        </span>
      )}
    </div>
  )
}
