'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import ShiftSlot from './ShiftSlot'
import GuardCard from './GuardCard'
import AvailableGuardsPanel from './AvailableGuardsPanel'
import ConstraintValidationOverlay from './ConstraintValidationOverlay'
import { getApiUrl } from '@/lib/config'

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  role: string
  psira_grade?: string
  hourly_rate?: number
}

interface ShiftData {
  shift_id: number
  site_id: number
  site_name: string
  start_time: string
  end_time: string
  required_staff: number
  required_skill?: string
  assignments: {
    employee_id: number
    employee_name: string
    cost: number
  }[]
}

interface ValidationResult {
  feasible: boolean
  reasons: string[]
  warnings: string[]
  estimated_cost: number
  employee_name: string
  shift_time: string
}

interface RosterBoardProps {
  shifts: ShiftData[]
  employees: Employee[]
  rosterId: number
  onAssignmentChange: () => void
}

export default function RosterBoard({
  shifts,
  employees,
  rosterId,
  onAssignmentChange,
}: RosterBoardProps) {
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{ shiftId: number; employeeId: number } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Get all assigned employee IDs across all shifts
  const assignedIds = new Set(shifts.flatMap((s) => s.assignments.map((a) => a.employee_id)))

  // Group shifts by date and site
  const shiftsByDateAndSite = new Map<string, Map<string, ShiftData[]>>()
  for (const shift of shifts) {
    const dateKey = new Date(shift.start_time).toLocaleDateString('en-ZA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!shiftsByDateAndSite.has(dateKey)) {
      shiftsByDateAndSite.set(dateKey, new Map())
    }
    const siteMap = shiftsByDateAndSite.get(dateKey)!
    if (!siteMap.has(shift.site_name)) {
      siteMap.set(shift.site_name, [])
    }
    siteMap.get(shift.site_name)!.push(shift)
  }

  const dates = Array.from(shiftsByDateAndSite.keys())
  const allSites = Array.from(new Set(shifts.map((s) => s.site_name)))

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'guard') {
      setActiveEmployee(active.data.current.employee)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveEmployee(null)
    const { active, over } = event

    if (!over) return
    if (active.data.current?.type !== 'guard') return

    const employee = active.data.current.employee as Employee
    const shiftId = parseInt(String(over.id).replace('shift-', ''))

    if (isNaN(shiftId)) return

    // Validate the assignment
    setPendingDrop({ shiftId, employeeId: employee.employee_id })
    setValidating(true)

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/validate-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shift_id: shiftId,
          employee_id: employee.employee_id,
        }),
      })

      if (!res.ok) throw new Error('Validation failed')
      const result: ValidationResult = await res.json()
      setValidationResult(result)
    } catch (err) {
      setValidationResult({
        feasible: false,
        reasons: ['Failed to validate assignment. Please try again.'],
        warnings: [],
        estimated_cost: 0,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        shift_time: '',
      })
    } finally {
      setValidating(false)
    }
  }

  const handleConfirmAssignment = useCallback(async () => {
    if (!pendingDrop) return

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shift_id: pendingDrop.shiftId,
          employee_id: pendingDrop.employeeId,
        }),
      })

      if (!res.ok) throw new Error('Assignment failed')
      onAssignmentChange()
    } catch (err) {
      console.error('Failed to persist assignment:', err)
    } finally {
      setValidationResult(null)
      setPendingDrop(null)
    }
  }, [pendingDrop, rosterId, onAssignmentChange])

  const handleCancelAssignment = () => {
    setValidationResult(null)
    setPendingDrop(null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-180px)]">
        {/* Main grid area */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Header row: dates */}
            <div className="flex sticky top-0 bg-white z-10 border-b border-gray-200">
              <div className="w-40 flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-r border-gray-200">
                Site
              </div>
              {dates.map((d) => (
                <div
                  key={d}
                  className="min-w-[180px] flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-r border-gray-200 text-center"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Rows: one per site */}
            {allSites.map((siteName) => (
              <div key={siteName} className="flex border-b border-gray-100">
                <div className="w-40 flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 bg-gray-50 sticky left-0 z-[5]">
                  {siteName}
                </div>
                {dates.map((dateKey) => {
                  const siteMap = shiftsByDateAndSite.get(dateKey)
                  const dayShifts = siteMap?.get(siteName) || []

                  return (
                    <div
                      key={`${siteName}-${dateKey}`}
                      className="min-w-[180px] flex-1 px-1 py-1 border-r border-gray-100 space-y-1"
                    >
                      {dayShifts.map((shift) => (
                        <ShiftSlot
                          key={shift.shift_id}
                          shiftId={shift.shift_id}
                          siteName={shift.site_name}
                          startTime={shift.start_time}
                          endTime={shift.end_time}
                          requiredStaff={shift.required_staff}
                          assignments={shift.assignments}
                        />
                      ))}
                      {dayShifts.length === 0 && (
                        <div className="h-20 flex items-center justify-center text-[10px] text-gray-300">
                          No shifts
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Available guards sidebar */}
        <AvailableGuardsPanel employees={employees} assignedIds={assignedIds} />
      </div>

      {/* Drag overlay (follows cursor) */}
      <DragOverlay>
        {activeEmployee ? <GuardCard employee={activeEmployee} compact /> : null}
      </DragOverlay>

      {/* Constraint validation overlay */}
      <ConstraintValidationOverlay
        result={validationResult}
        onConfirm={handleConfirmAssignment}
        onCancel={handleCancelAssignment}
        loading={validating}
      />
    </DndContext>
  )
}
