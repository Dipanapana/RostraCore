'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { shiftsApi, employeesApi, sitesApi, clientsApi, rosterApi } from '@/services/api'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Users,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Employee, Site, Client, Shift } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface ShiftWithAssignment extends Shift {
  assigned_employee?: Employee | null
  site_name?: string
  client_id?: number
  client_name?: string
}

interface SiteWithClient extends Site {
  client_id?: number
}

// =============================================================================
// Helper functions
// =============================================================================

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  // Adjust to Monday (day 0 = Sunday, so Monday = 1)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    dates.push(dayDate)
  }
  return dates
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function formatWeekRange(dates: Date[]): string {
  if (dates.length < 7) return ''
  const start = dates[0]
  const end = dates[6]
  const startStr = start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName || '').trim()
  const l = (lastName || '').trim()
  if (f && l) return (f[0] + l[0]).toUpperCase()
  if (f) return f.substring(0, 2).toUpperCase()
  return '??'
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'short' })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

// =============================================================================
// Draggable Employee Card
// =============================================================================

function DraggableEmployeeCard({
  employee,
  isAssignedToday,
}: {
  employee: Employee
  isAssignedToday: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `employee_${employee.employee_id}`,
    data: { employee },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${isDragging
          ? 'opacity-50 scale-95'
          : 'hover:shadow-md hover:border-blue-400/50 dark:hover:border-blue-500/50'
        }
        ${isAssignedToday
          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }
      `}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white
        ${isAssignedToday
          ? 'bg-slate-400 dark:bg-slate-600'
          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
        }
      `}>
        {getInitials(employee.first_name, employee.last_name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {employee.first_name} {employee.last_name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
          {employee.role?.replace('_', ' ') || 'Guard'}
        </p>
      </div>

      {/* Status dot */}
      <div className={`
        w-2.5 h-2.5 rounded-full flex-shrink-0
        ${isAssignedToday ? 'bg-slate-400' : 'bg-emerald-500'}
      `}
        title={isAssignedToday ? 'Assigned today' : 'Available'}
      />
    </div>
  )
}

// =============================================================================
// Employee Card (for DragOverlay)
// =============================================================================

function EmployeeOverlayCard({ employee }: { employee: Employee }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-400 bg-white dark:bg-slate-800 shadow-xl cursor-grabbing opacity-90">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
        {getInitials(employee.first_name, employee.last_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {employee.first_name} {employee.last_name}
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// Droppable Shift Slot
// =============================================================================

function DroppableShiftSlot({
  shift,
  employee,
  onUnassign,
}: {
  shift: ShiftWithAssignment
  employee?: Employee | null
  onUnassign: (shiftId: number, employeeId: number) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `shift_${shift.shift_id}`,
    data: { shift },
  })

  const isAssigned = !!shift.assigned_employee_id && !!employee
  const timeRange = `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`

  return (
    <div
      ref={setNodeRef}
      className={`
        relative rounded-lg border-2 p-2 min-h-[60px] transition-all duration-150
        ${isAssigned
          ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
          : isOver
            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
            : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500'
        }
      `}
    >
      {isAssigned && employee ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0">
              {getInitials(employee.first_name, employee.last_name)}
            </div>
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
              {employee.first_name} {employee.last_name?.charAt(0)}.
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnassign(shift.shift_id, employee.employee_id)
              }}
              className="ml-auto p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Remove assignment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{timeRange}</p>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-0.5" />
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{timeRange}</p>
          {isOver && (
            <p className="text-[10px] text-blue-500 font-medium mt-0.5">Drop here</p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Mobile Tab Component
// =============================================================================

function MobileTab({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// =============================================================================
// Main Schedule Page
// =============================================================================

export default function SchedulePage() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sites, setSites] = useState<SiteWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [shifts, setShifts] = useState<ShiftWithAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'sites' | 'timeline' | 'employees'>('timeline')

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const weekStart = formatDate(weekDates[0])
  const weekEnd = formatDate(weekDates[6])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Group sites by client
  const sitesByClient = useMemo(() => {
    const grouped: Record<string, SiteWithClient[]> = {}
    for (const site of sites) {
      const clientName = site.client_name || 'Unassigned'
      if (!grouped[clientName]) grouped[clientName] = []
      grouped[clientName].push(site)
    }
    return grouped
  }, [sites])

  // Build employee lookup
  const employeeMap = useMemo(() => {
    const map: Record<number, Employee> = {}
    for (const emp of employees) {
      map[emp.employee_id] = emp
    }
    return map
  }, [employees])

  // Filter shifts for selected site
  const filteredShifts = useMemo(() => {
    if (selectedSiteId === null) return shifts
    return shifts.filter((s) => s.site_id === selectedSiteId)
  }, [shifts, selectedSiteId])

  // Group shifts by day
  const shiftsByDay = useMemo(() => {
    const grouped: Record<string, ShiftWithAssignment[]> = {}
    for (const date of weekDates) {
      grouped[formatDate(date)] = []
    }
    for (const shift of filteredShifts) {
      const shiftDate = formatDate(new Date(shift.start_time))
      if (grouped[shiftDate]) {
        grouped[shiftDate].push(shift)
      }
    }
    return grouped
  }, [filteredShifts, weekDates])

  // Employee IDs assigned on each day
  const assignedByDay = useMemo(() => {
    const byDay: Record<string, Set<number>> = {}
    for (const date of weekDates) {
      byDay[formatDate(date)] = new Set()
    }
    for (const shift of shifts) {
      if (shift.assigned_employee_id) {
        const shiftDate = formatDate(new Date(shift.start_time))
        if (byDay[shiftDate]) {
          byDay[shiftDate].add(shift.assigned_employee_id)
        }
      }
    }
    return byDay
  }, [shifts, weekDates])

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim()
    const active = employees.filter((e) => e.status === 'active')
    if (!q) return active
    return active.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        (e.role && e.role.toLowerCase().includes(q))
    )
  }, [employees, employeeSearch])

  // Coverage stats
  const coverageStats = useMemo(() => {
    const totalShifts = filteredShifts.length
    const filled = filteredShifts.filter((s) => !!s.assigned_employee_id).length
    const unfilled = totalShifts - filled
    const fillRate = totalShifts > 0 ? Math.round((filled / totalShifts) * 100) : 0

    // Estimate cost from shift durations and employee rates
    let estimatedCost = 0
    for (const shift of filteredShifts) {
      if (shift.assigned_employee_id) {
        const emp = employeeMap[shift.assigned_employee_id]
        if (emp?.hourly_rate) {
          const start = new Date(shift.start_time)
          const end = new Date(shift.end_time)
          const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
          estimatedCost += hours * emp.hourly_rate
        }
      }
    }

    return { totalShifts, filled, unfilled, fillRate, estimatedCost }
  }, [filteredShifts, employeeMap])

  // Site coverage info
  const siteCoverage = useMemo(() => {
    const coverage: Record<number, { total: number; filled: number }> = {}
    for (const shift of shifts) {
      if (!coverage[shift.site_id]) {
        coverage[shift.site_id] = { total: 0, filled: 0 }
      }
      coverage[shift.site_id].total++
      if (shift.assigned_employee_id) {
        coverage[shift.site_id].filled++
      }
    }
    return coverage
  }, [shifts])

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [empRes, sitesRes, clientsRes, shiftsRes] = await Promise.all([
        employeesApi.getAll({ status: 'active', limit: 500 }),
        sitesApi.getAll(),
        clientsApi.getAll(),
        shiftsApi.getAll({ start_date: weekStart, end_date: weekEnd }),
      ])

      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.items || [])
      setSites(Array.isArray(sitesRes.data) ? sitesRes.data : sitesRes.data?.items || [])
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.items || [])
      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : shiftsRes.data?.items || [])
    } catch (err: any) {
      console.error('Failed to load schedule data:', err)
      setError(err?.response?.data?.detail || err?.message || 'Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleAssign = useCallback(
    async (shiftId: number, employeeId: number) => {
      setAssigning(true)
      try {
        await shiftsApi.assignEmployee(shiftId, employeeId)
        await fetchData()
      } catch (err: any) {
        console.error('Failed to assign employee:', err)
        setError(err?.response?.data?.detail || 'Failed to assign employee to shift')
      } finally {
        setAssigning(false)
      }
    },
    [fetchData]
  )

  const handleUnassign = useCallback(
    async (shiftId: number, employeeId: number) => {
      setAssigning(true)
      try {
        await shiftsApi.unassignEmployee(shiftId, employeeId)
        await fetchData()
      } catch (err: any) {
        console.error('Failed to unassign employee:', err)
        setError(err?.response?.data?.detail || 'Failed to remove assignment')
      } finally {
        setAssigning(false)
      }
    },
    [fetchData]
  )

  const handleAutoFill = useCallback(async () => {
    setAutoFilling(true)
    setError(null)
    try {
      await rosterApi.generate({
        start_date: weekStart,
        end_date: weekEnd,
        ...(selectedSiteId ? { site_ids: [selectedSiteId] } : {}),
      })
      await fetchData()
    } catch (err: any) {
      console.error('Auto-fill failed:', err)
      setError(err?.response?.data?.detail || 'Auto-fill failed. Please try again.')
    } finally {
      setAutoFilling(false)
    }
  }, [weekStart, weekEnd, selectedSiteId, fetchData])

  // ---------------------------------------------------------------------------
  // DnD handlers
  // ---------------------------------------------------------------------------
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const empId = String(event.active.id).replace('employee_', '')
      const emp = employeeMap[Number(empId)]
      if (emp) setDraggedEmployee(emp)
    },
    [employeeMap]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedEmployee(null)
      const { active, over } = event
      if (!over) return

      const employeeId = Number(String(active.id).replace('employee_', ''))
      const shiftId = Number(String(over.id).replace('shift_', ''))

      if (!isNaN(employeeId) && !isNaN(shiftId) && employeeId > 0 && shiftId > 0) {
        handleAssign(shiftId, employeeId)
      }
    },
    [handleAssign]
  )

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goToPreviousWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goToNextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // ---------------------------------------------------------------------------
  // Check if a date is today
  // ---------------------------------------------------------------------------
  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date())
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {/* ================================================================= */}
          {/* Header                                                            */}
          {/* ================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Schedule Builder
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Drag employees onto shifts to build your weekly schedule
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Week navigation */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1">
                <button
                  onClick={goToPreviousWeek}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400"
                  title="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2 whitespace-nowrap">
                  {formatWeekRange(weekDates)}
                </span>
                <button
                  onClick={goToNextWeek}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400"
                  title="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Today
              </button>

              <button
                onClick={handleAutoFill}
                disabled={autoFilling || loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {autoFilling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {autoFilling ? 'Filling...' : 'Auto-Fill'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Assigning overlay indicator */}
          {assigning && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Updating assignment...</p>
            </div>
          )}

          {/* ================================================================= */}
          {/* Mobile tabs                                                       */}
          {/* ================================================================= */}
          <div className="flex gap-2 lg:hidden overflow-x-auto pb-1">
            <MobileTab
              label="Sites"
              icon={MapPin}
              active={mobileTab === 'sites'}
              onClick={() => setMobileTab('sites')}
            />
            <MobileTab
              label="Timeline"
              icon={Calendar}
              active={mobileTab === 'timeline'}
              onClick={() => setMobileTab('timeline')}
            />
            <MobileTab
              label="Employees"
              icon={Users}
              active={mobileTab === 'employees'}
              onClick={() => setMobileTab('employees')}
            />
          </div>

          {/* ================================================================= */}
          {/* Main grid (desktop: 2-col, mobile: tabs)                         */}
          {/* ================================================================= */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading schedule data...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                {/* ============================================================= */}
                {/* Sites panel (left)                                            */}
                {/* ============================================================= */}
                <div className={`${mobileTab !== 'sites' ? 'hidden lg:block' : ''}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Sites & Posts
                        </h2>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[500px] lg:max-h-[calc(100vh-340px)]">
                      {/* "All Sites" option */}
                      <button
                        onClick={() => setSelectedSiteId(null)}
                        className={`
                          w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-100 dark:border-slate-700/50
                          ${selectedSiteId === null
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }
                        `}
                      >
                        All Sites
                      </button>

                      {Object.entries(sitesByClient).map(([clientName, clientSites]) => (
                        <div key={clientName}>
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              {clientName}
                            </p>
                          </div>
                          {clientSites.map((site) => {
                            const coverage = siteCoverage[site.site_id]
                            const isFullyStaffed = coverage
                              ? coverage.filled >= coverage.total && coverage.total > 0
                              : false
                            const hasShifts = coverage ? coverage.total > 0 : false

                            return (
                              <button
                                key={site.site_id}
                                onClick={() => setSelectedSiteId(site.site_id)}
                                className={`
                                  w-full text-left px-4 py-2.5 transition-colors border-b border-slate-100 dark:border-slate-700/50
                                  ${selectedSiteId === site.site_id
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`
                                      w-2 h-2 rounded-full flex-shrink-0
                                      ${!hasShifts
                                        ? 'bg-slate-300 dark:bg-slate-600'
                                        : isFullyStaffed
                                          ? 'bg-emerald-500'
                                          : 'bg-red-500'
                                      }
                                    `}
                                  />
                                  <span className={`
                                    text-sm truncate
                                    ${selectedSiteId === site.site_id
                                      ? 'text-blue-700 dark:text-blue-400 font-medium'
                                      : 'text-slate-700 dark:text-slate-300'
                                    }
                                  `}>
                                    {site.site_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 ml-4">
                                  <span className="text-xs text-slate-400 dark:text-slate-500">
                                    Min staff: {site.min_staff}
                                  </span>
                                  {hasShifts && (
                                    <span className={`text-xs ${isFullyStaffed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {coverage!.filled}/{coverage!.total} filled
                                    </span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ))}

                      {sites.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">No sites found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* Timeline grid (center/right)                                  */}
                {/* ============================================================= */}
                <div className={`${mobileTab !== 'timeline' ? 'hidden lg:block' : ''}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Weekly Timeline
                          {selectedSiteId !== null && (
                            <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                              - {sites.find((s) => s.site_id === selectedSiteId)?.site_name || 'Selected site'}
                            </span>
                          )}
                        </h2>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[700px]">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                          {weekDates.map((date) => (
                            <div
                              key={formatDate(date)}
                              className={`
                                px-2 py-2 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700
                                ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                              `}
                            >
                              <p className={`
                                text-xs font-semibold uppercase
                                ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                              `}>
                                {getDayName(date)}
                              </p>
                              <p className={`
                                text-sm font-bold
                                ${isToday(date) ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}
                              `}>
                                {date.getDate()}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Shift slots grid */}
                        <div className="grid grid-cols-7">
                          {weekDates.map((date) => {
                            const dateStr = formatDate(date)
                            const dayShifts = shiftsByDay[dateStr] || []

                            return (
                              <div
                                key={dateStr}
                                className={`
                                  border-r last:border-r-0 border-slate-200 dark:border-slate-700 p-1.5 space-y-1.5
                                  min-h-[120px]
                                  ${isToday(date) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                `}
                              >
                                {dayShifts.length > 0 ? (
                                  dayShifts.map((shift) => (
                                    <DroppableShiftSlot
                                      key={shift.shift_id}
                                      shift={shift}
                                      employee={
                                        shift.assigned_employee_id
                                          ? employeeMap[shift.assigned_employee_id]
                                          : null
                                      }
                                      onUnassign={handleUnassign}
                                    />
                                  ))
                                ) : (
                                  <div className="flex items-center justify-center h-full min-h-[100px]">
                                    <p className="text-xs text-slate-400 dark:text-slate-600">
                                      No shifts
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* Bottom row: Employee Pool + Coverage Stats                    */}
              {/* ============================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
                {/* Employee pool */}
                <div className={`${mobileTab !== 'employees' && mobileTab !== 'timeline' ? 'hidden lg:block' : 'block'}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Employee Pool
                          </h2>
                          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {filteredEmployees.length}
                          </span>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Search employees..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="p-3 overflow-y-auto max-h-[220px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {filteredEmployees.map((emp) => {
                          // Check if assigned today (use the currently viewed date range's "today" column)
                          const todayStr = formatDate(new Date())
                          const isAssignedToday = assignedByDay[todayStr]?.has(emp.employee_id) || false

                          return (
                            <DraggableEmployeeCard
                              key={emp.employee_id}
                              employee={emp}
                              isAssignedToday={isAssignedToday}
                            />
                          )
                        })}
                      </div>

                      {filteredEmployees.length === 0 && (
                        <div className="text-center py-6">
                          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {employeeSearch ? 'No employees match your search' : 'No active employees found'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coverage stats */}
                <div className={`${mobileTab !== 'timeline' ? 'hidden lg:block' : 'block'}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Coverage Stats
                        </h2>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Fill rate bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fill Rate</span>
                          <span className={`
                            text-sm font-bold
                            ${coverageStats.fillRate >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : coverageStats.fillRate >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          `}>
                            {coverageStats.fillRate}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`
                              h-full rounded-full transition-all duration-500
                              ${coverageStats.fillRate >= 80
                                ? 'bg-emerald-500'
                                : coverageStats.fillRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }
                            `}
                            style={{ width: `${coverageStats.fillRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Shifts</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {coverageStats.totalShifts}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Filled</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {coverageStats.filled}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Unfilled</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {coverageStats.unfilled}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Est. Cost</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            R{coverageStats.estimatedCost.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* Drag Overlay                                                      */}
        {/* ================================================================= */}
        <DragOverlay>
          {draggedEmployee ? (
            <EmployeeOverlayCard employee={draggedEmployee} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </DashboardLayout>
  )
}
