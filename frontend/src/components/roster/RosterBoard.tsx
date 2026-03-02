'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import LiveCommandBar from './LiveCommandBar'
import AssignmentContextMenu from './AssignmentContextMenu'
import GuardSuggestionPopover from './GuardSuggestionPopover'
import RosterInsightsPanel, { GapInsightsData } from './RosterInsightsPanel'
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
    assignment_id?: number
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
  rosterStartDate?: string
  rosterEndDate?: string
  onAssignmentChange: () => void
}

type DragHint = 'feasible' | 'warning' | 'blocked'

interface UndoAction {
  type: 'assign'
  assignmentId: number
  shiftId: number
  employeeId: number
  employeeName: string
}

export default function RosterBoard({
  shifts,
  employees,
  rosterId,
  rosterStartDate,
  rosterEndDate,
  onAssignmentChange,
}: RosterBoardProps) {
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{ shiftId: number; employeeId: number } | null>(null)
  const [dragHints, setDragHints] = useState<Map<number, DragHint>>(new Map())
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [undoing, setUndoing] = useState(false)
  const undoStackRef = useRef(undoStack)
  undoStackRef.current = undoStack
  const [contextMenu, setContextMenu] = useState<{
    assignmentId: number
    employeeId: number
    employeeName: string
    x: number
    y: number
  } | null>(null)
  const [suggestionPopover, setSuggestionPopover] = useState<{
    shiftId: number
    x: number
    y: number
  } | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [newlyFilledShiftIds, setNewlyFilledShiftIds] = useState<Set<number>>(new Set())
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsData, setInsightsData] = useState<GapInsightsData | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Get all assigned employee IDs across all shifts
  const assignedIds = new Set(shifts.flatMap((s) => s.assignments.map((a) => a.employee_id)))

  // Compute metrics for command bar
  const totalRequired = shifts.reduce((sum, s) => sum + s.required_staff, 0)
  const filledCount = shifts.reduce((sum, s) => sum + s.assignments.length, 0)
  const totalCost = shifts.reduce((sum, s) => sum + s.assignments.reduce((c, a) => c + a.cost, 0), 0)
  const unfilledCount = shifts.filter((s) => s.assignments.length < s.required_staff).length
  const fillRate = totalRequired > 0 ? (filledCount / totalRequired) * 100 : 0
  const gapCount = totalRequired - filledCount

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

  // Compute drag hints: for each shift, determine if the dragged employee can go there
  const computeDragHints = useCallback(
    (employee: Employee): Map<number, DragHint> => {
      const hints = new Map<number, DragHint>()

      // Find shifts where this employee is already assigned (for overlap detection)
      const assignedShiftTimes = shifts
        .filter((s) => s.assignments.some((a) => a.employee_id === employee.employee_id))
        .map((s) => ({
          start: new Date(s.start_time).getTime(),
          end: new Date(s.end_time).getTime(),
        }))

      for (const shift of shifts) {
        // Already assigned to this shift
        if (shift.assignments.some((a) => a.employee_id === employee.employee_id)) {
          hints.set(shift.shift_id, 'blocked')
          continue
        }

        // Slot full
        if (shift.assignments.length >= shift.required_staff) {
          hints.set(shift.shift_id, 'blocked')
          continue
        }

        // Check time overlap with employee's other assigned shifts
        const shiftStart = new Date(shift.start_time).getTime()
        const shiftEnd = new Date(shift.end_time).getTime()
        const hasOverlap = assignedShiftTimes.some(
          (t) => shiftStart < t.end && shiftEnd > t.start
        )
        if (hasOverlap) {
          hints.set(shift.shift_id, 'blocked')
          continue
        }

        // Check skill/role match
        if (shift.required_skill && shift.required_skill !== employee.role) {
          hints.set(shift.shift_id, 'warning')
          continue
        }

        hints.set(shift.shift_id, 'feasible')
      }

      return hints
    },
    [shifts]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'guard') {
      const emp = active.data.current.employee as Employee
      setActiveEmployee(emp)
      setDragHints(computeDragHints(emp))
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveEmployee(null)
    setDragHints(new Map())
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
      const result = await res.json()

      // Push to undo stack
      if (result.assignment_id) {
        const emp = employees.find((e) => e.employee_id === pendingDrop.employeeId)
        setUndoStack((prev) => [
          ...prev.slice(-9), // Keep max 10 items
          {
            type: 'assign',
            assignmentId: result.assignment_id,
            shiftId: pendingDrop.shiftId,
            employeeId: pendingDrop.employeeId,
            employeeName: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${pendingDrop.employeeId}`,
          },
        ])
      }

      onAssignmentChange()
    } catch (err) {
      console.error('Failed to persist assignment:', err)
    } finally {
      setValidationResult(null)
      setPendingDrop(null)
    }
  }, [pendingDrop, rosterId, onAssignmentChange, employees])

  const handleCancelAssignment = () => {
    setValidationResult(null)
    setPendingDrop(null)
  }

  // Undo last assignment
  const handleUndo = useCallback(async () => {
    const stack = undoStackRef.current
    if (stack.length === 0 || undoing) return

    const lastAction = stack[stack.length - 1]
    setUndoing(true)

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: lastAction.assignmentId,
        }),
      })

      if (!res.ok) throw new Error('Unassign failed')

      setUndoStack((prev) => prev.slice(0, -1))
      onAssignmentChange()
    } catch (err) {
      console.error('Undo failed:', err)
    } finally {
      setUndoing(false)
    }
  }, [rosterId, onAssignmentChange, undoing])

  // Ctrl+Z / Cmd+Z keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  // Context menu: right-click on assigned guard
  const handleAssignmentContextMenu = useCallback(
    (info: { assignmentId: number; employeeId: number; employeeName: string; x: number; y: number }) => {
      setContextMenu(info)
    },
    []
  )

  const handleContextUnassign = useCallback(async () => {
    if (!contextMenu) return

    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: contextMenu.assignmentId,
        }),
      })

      if (!res.ok) throw new Error('Unassign failed')
      onAssignmentChange()
    } catch (err) {
      console.error('Context unassign failed:', err)
    }
  }, [contextMenu, rosterId, onAssignmentChange])

  const handleViewProfile = useCallback(() => {
    if (!contextMenu) return
    window.open(`/employees/${contextMenu.employeeId}`, '_blank')
  }, [contextMenu])

  // Suggestion popover: click on unfilled slot
  const handleSlotClick = useCallback(
    (info: { shiftId: number; x: number; y: number }) => {
      setSuggestionPopover(info)
    },
    []
  )

  // Quick assign from suggestion popover
  const handleQuickAssign = useCallback(
    async (employeeId: number) => {
      if (!suggestionPopover) return

      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            shift_id: suggestionPopover.shiftId,
            employee_id: employeeId,
          }),
        })

        if (!res.ok) throw new Error('Assignment failed')
        const result = await res.json()

        // Push to undo stack
        if (result.assignment_id) {
          const emp = employees.find((e) => e.employee_id === employeeId)
          setUndoStack((prev) => [
            ...prev.slice(-9),
            {
              type: 'assign',
              assignmentId: result.assignment_id,
              shiftId: suggestionPopover.shiftId,
              employeeId,
              employeeName: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`,
            },
          ])
        }

        setSuggestionPopover(null)
        onAssignmentChange()
      } catch (err) {
        console.error('Quick assign failed:', err)
      }
    },
    [suggestionPopover, rosterId, onAssignmentChange, employees]
  )

  // Auto-fill: run optimizer then bulk-assign results
  const handleAutoFill = useCallback(async () => {
    if (!rosterStartDate || !rosterEndDate || autoFilling) return

    setAutoFilling(true)
    try {
      const token = localStorage.getItem('access_token')

      // 1. Run optimizer to get assignments
      const genRes = await fetch(`${getApiUrl()}/api/v1/roster/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: rosterStartDate,
          end_date: rosterEndDate,
        }),
      })

      if (!genRes.ok) throw new Error('Optimizer failed')
      const genData = await genRes.json()

      // 2. Extract assignments from optimizer result
      const optimizerAssignments: { shift_id: number; employee_id: number }[] =
        (genData.assignments || []).map((a: { shift_id: number; employee_id: number }) => ({
          shift_id: a.shift_id,
          employee_id: a.employee_id,
        }))

      if (optimizerAssignments.length === 0) {
        setAutoFilling(false)
        return
      }

      // 3. Filter to only NEW assignments (not already on the board)
      const existingPairs = new Set(
        shifts.flatMap((s) =>
          s.assignments.map((a) => `${s.shift_id}-${a.employee_id}`)
        )
      )
      const newAssignments = optimizerAssignments.filter(
        (a) => !existingPairs.has(`${a.shift_id}-${a.employee_id}`)
      )

      if (newAssignments.length === 0) {
        setAutoFilling(false)
        return
      }

      // 4. Bulk-assign
      const bulkRes = await fetch(
        `${getApiUrl()}/api/v1/roster/saved/${rosterId}/bulk-assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assignments: newAssignments }),
        }
      )

      if (!bulkRes.ok) throw new Error('Bulk assign failed')
      const bulkResult = await bulkRes.json()

      // 5. Track newly filled shifts for green flash
      const filledIds = new Set(newAssignments.map((a) => a.shift_id))
      setNewlyFilledShiftIds(filledIds)
      setTimeout(() => setNewlyFilledShiftIds(new Set()), 3000)

      // 6. Refresh board data
      onAssignmentChange()

      console.log(`Auto-fill: assigned ${bulkResult.assigned}, skipped ${bulkResult.skipped}`)
    } catch (err) {
      console.error('Auto-fill failed:', err)
    } finally {
      setAutoFilling(false)
    }
  }, [rosterStartDate, rosterEndDate, autoFilling, rosterId, shifts, onAssignmentChange])

  // Fetch gap insights
  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `${getApiUrl()}/api/v1/roster/saved/${rosterId}/gap-insights`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch insights')
      const data: GapInsightsData = await res.json()
      setInsightsData(data)
      setInsightsOpen(true)
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Failed to load insights')
      setInsightsOpen(true)
    } finally {
      setInsightsLoading(false)
    }
  }, [rosterId])

  // Quick-fill from insights panel (reuses bulk-assign)
  const handleInsightsQuickFill = useCallback(async (
    assignments: { shift_id: number; employee_id: number }[]
  ) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/bulk-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assignments }),
    })
    if (!res.ok) throw new Error('Bulk assign failed')
    onAssignmentChange()
    // Refresh insights after filling
    setTimeout(() => fetchInsights(), 500)
  }, [rosterId, onAssignmentChange, fetchInsights])

  // Single assign from insights panel (reuses existing assign)
  const handleInsightsAssignSingle = useCallback(async (shiftId: number, employeeId: number) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shift_id: shiftId, employee_id: employeeId }),
    })
    if (!res.ok) throw new Error('Assignment failed')
    const result = await res.json()
    // Push to undo stack
    if (result.assignment_id) {
      const emp = employees.find((e) => e.employee_id === employeeId)
      setUndoStack((prev) => [
        ...prev.slice(-9),
        {
          type: 'assign',
          assignmentId: result.assignment_id,
          shiftId,
          employeeId,
          employeeName: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${employeeId}`,
        },
      ])
    }
    onAssignmentChange()
  }, [rosterId, onAssignmentChange, employees])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-[calc(100vh-180px)]">
        <div className="flex flex-1 min-h-0">
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
                            dragHint={dragHints.get(shift.shift_id)}
                            onAssignmentContextMenu={handleAssignmentContextMenu}
                            onSlotClick={handleSlotClick}
                            isNewlyFilled={newlyFilledShiftIds.has(shift.shift_id)}
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

        {/* Live Command Bar */}
        <LiveCommandBar
          totalCost={totalCost}
          fillRate={fillRate}
          filledCount={filledCount}
          totalRequired={totalRequired}
          unfilledCount={unfilledCount}
          totalShifts={shifts.length}
          autoFillGaps={gapCount > 0 ? gapCount : 0}
          undoCount={undoStack.length}
          onUndo={handleUndo}
          onAutoFill={handleAutoFill}
          autoFilling={autoFilling}
          onInsights={fetchInsights}
          insightsCount={insightsData?.recommendations?.length ?? 0}
          insightsLoading={insightsLoading}
        />
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

      {/* Right-click context menu on assigned guards */}
      {contextMenu && (
        <AssignmentContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          employeeName={contextMenu.employeeName}
          onUnassign={handleContextUnassign}
          onViewProfile={handleViewProfile}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Guard suggestion popover */}
      {suggestionPopover && (
        <GuardSuggestionPopover
          shiftId={suggestionPopover.shiftId}
          rosterId={rosterId}
          anchorX={suggestionPopover.x}
          anchorY={suggestionPopover.y}
          onAssign={handleQuickAssign}
          onClose={() => setSuggestionPopover(null)}
        />
      )}

      {/* Gap Insights panel */}
      <RosterInsightsPanel
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        data={insightsData}
        loading={insightsLoading}
        error={insightsError}
        onQuickFill={handleInsightsQuickFill}
        onAssignSingle={handleInsightsAssignSingle}
      />
    </DndContext>
  )
}
