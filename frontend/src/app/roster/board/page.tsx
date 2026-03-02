'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RosterBoard from '@/components/roster/RosterBoard'
import VersionHistory from '@/components/roster/VersionHistory'
import { getApiUrl } from '@/lib/config'

interface SavedRoster {
  roster_id: number
  roster_code: string
  name: string
  status: string
  start_date: string
  end_date: string
  total_shifts: number
  assigned_shifts: number
  fill_rate: number
  total_cost: number
}

interface ShiftFromApi {
  shift_id: number
  site_id: number
  start_time: string
  end_time: string
  required_staff: number
  required_skill?: string
  site?: { site_id: number; site_name: string }
  site_name?: string
}

interface AssignmentFromApi {
  assignment_id: number
  shift_id: number
  employee_id: number
  status: string
  cost_regular: number
  cost_overtime: number
}

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

export default function RosterBoardPage() {
  const searchParams = useSearchParams()
  const initialRosterId = searchParams.get('id')

  const [rosters, setRosters] = useState<SavedRoster[]>([])
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(
    initialRosterId ? parseInt(initialRosterId) : null
  )
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [boardLoading, setBoardLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoster, setSelectedRoster] = useState<SavedRoster | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  // Load saved rosters list
  useEffect(() => {
    async function loadRosters() {
      try {
        const res = await fetch(`${getApiUrl()}/api/v1/roster/saved?limit=50`, {
          headers: authHeaders,
        })
        if (!res.ok) throw new Error('Failed to fetch rosters')
        const data = await res.json()
        setRosters(Array.isArray(data) ? data : data.rosters || [])
      } catch (err) {
        setError('Failed to load rosters')
      } finally {
        setLoading(false)
      }
    }
    loadRosters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select roster from URL param
  useEffect(() => {
    if (initialRosterId && rosters.length > 0) {
      const id = parseInt(initialRosterId)
      if (rosters.some((r) => r.roster_id === id)) {
        setSelectedRosterId(id)
      }
    }
  }, [initialRosterId, rosters])

  // Load board data when roster is selected
  const loadBoardData = useCallback(
    async (rosterId: number) => {
      setBoardLoading(true)
      setError(null)

      try {
        // Fetch roster details, shifts, and employees in parallel
        const [rosterRes, employeesRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}?include_assignments=true`, {
            headers: authHeaders,
          }),
          fetch(`${getApiUrl()}/api/v1/employees?limit=500`, {
            headers: authHeaders,
          }),
        ])

        if (!rosterRes.ok) throw new Error('Failed to fetch roster')
        if (!employeesRes.ok) throw new Error('Failed to fetch employees')

        const rosterData = await rosterRes.json()
        const employeesData = await employeesRes.json()

        const empList: Employee[] = (Array.isArray(employeesData) ? employeesData : employeesData.employees || []).map(
          (e: Record<string, unknown>) => ({
            employee_id: e.employee_id as number,
            first_name: e.first_name as string,
            last_name: e.last_name as string,
            role: e.role as string || 'guard',
            psira_grade: e.psira_grade as string | undefined,
            hourly_rate: e.hourly_rate as number | undefined,
          })
        )

        setEmployees(empList)

        // Build employee lookup for names
        const empMap = new Map(empList.map((e) => [e.employee_id, e]))

        // Now fetch the actual shifts for the roster period
        const startDate = rosterData.start_date
        const endDate = rosterData.end_date

        const shiftsRes = await fetch(
          `${getApiUrl()}/api/v1/shifts?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&limit=1000`,
          { headers: authHeaders }
        )

        if (!shiftsRes.ok) throw new Error('Failed to fetch shifts')
        const shiftsData = await shiftsRes.json()
        const rawShifts: ShiftFromApi[] = Array.isArray(shiftsData) ? shiftsData : shiftsData.shifts || []

        // Build assignment map: shift_id -> assignments[]
        const assignments: AssignmentFromApi[] = rosterData.assignments || []
        const assignmentsByShift = new Map<number, AssignmentFromApi[]>()
        for (const a of assignments) {
          if (!assignmentsByShift.has(a.shift_id)) {
            assignmentsByShift.set(a.shift_id, [])
          }
          assignmentsByShift.get(a.shift_id)!.push(a)
        }

        // Merge shifts + assignments
        const mergedShifts: ShiftData[] = rawShifts.map((shift) => {
          const shiftAssignments = assignmentsByShift.get(shift.shift_id) || []
          return {
            shift_id: shift.shift_id,
            site_id: shift.site_id,
            site_name: shift.site_name || shift.site?.site_name || `Site ${shift.site_id}`,
            start_time: shift.start_time,
            end_time: shift.end_time,
            required_staff: shift.required_staff || 1,
            required_skill: shift.required_skill,
            assignments: shiftAssignments
              .filter((a) => a.status !== 'cancelled')
              .map((a) => {
                const emp = empMap.get(a.employee_id)
                return {
                  assignment_id: a.assignment_id,
                  employee_id: a.employee_id,
                  employee_name: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${a.employee_id}`,
                  cost: (a.cost_regular || 0) + (a.cost_overtime || 0),
                }
              }),
          }
        })

        setShifts(mergedShifts)

        // Set the selected roster info
        const rosterInfo = rosters.find((r) => r.roster_id === rosterId)
        setSelectedRoster(rosterInfo || null)
      } catch (err) {
        console.error('Failed to load board data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load board data')
      } finally {
        setBoardLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosters]
  )

  useEffect(() => {
    if (selectedRosterId) {
      loadBoardData(selectedRosterId)
    }
  }, [selectedRosterId, loadBoardData])

  const handleRosterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value)
    if (!isNaN(id)) {
      setSelectedRosterId(id)
    }
  }

  const handleRefresh = () => {
    if (selectedRosterId) {
      loadBoardData(selectedRosterId)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading rosters...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roster Board</h1>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop guards onto shifts to build your roster
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Roster selector */}
            <select
              value={selectedRosterId || ''}
              onChange={handleRosterChange}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[250px]"
            >
              <option value="">Select a roster...</option>
              {rosters.map((r) => (
                <option key={r.roster_id} value={r.roster_id}>
                  {r.name || r.roster_code} — {r.status}
                  {r.fill_rate != null ? ` (${Math.round(r.fill_rate)}% filled)` : ''}
                </option>
              ))}
            </select>

            {/* Refresh and History buttons */}
            {selectedRosterId && (
              <>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`px-3 py-2 text-sm border rounded-lg ${
                    showHistory
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  History
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={boardLoading}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {boardLoading ? 'Loading...' : 'Refresh'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Roster stats bar */}
        {selectedRoster && (
          <div className="mt-3 flex items-center gap-6 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <span>
              <span className="font-medium text-gray-900">{selectedRoster.roster_code}</span>
            </span>
            <span>
              Period:{' '}
              {new Date(selectedRoster.start_date).toLocaleDateString('en-ZA')} –{' '}
              {new Date(selectedRoster.end_date).toLocaleDateString('en-ZA')}
            </span>
            <span>
              Shifts: {selectedRoster.assigned_shifts}/{selectedRoster.total_shifts} assigned
            </span>
            <span>
              Fill rate:{' '}
              <span
                className={
                  selectedRoster.fill_rate >= 90
                    ? 'text-green-600 font-medium'
                    : selectedRoster.fill_rate >= 70
                      ? 'text-amber-600 font-medium'
                      : 'text-red-600 font-medium'
                }
              >
                {Math.round(selectedRoster.fill_rate || 0)}%
              </span>
            </span>
            <span>
              Cost: R{(selectedRoster.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedRoster.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : selectedRoster.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {selectedRoster.status}
            </span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Board content */}
      {!selectedRosterId ? (
        <div className="flex items-center justify-center h-[calc(100vh-250px)] bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No roster selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a saved roster from the dropdown above to open the drag-and-drop board.
            </p>
          </div>
        </div>
      ) : boardLoading ? (
        <div className="flex items-center justify-center h-[calc(100vh-250px)] bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">Loading roster board...</p>
          </div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-250px)] bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-900">No shifts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This roster has no shifts in its period. Generate shifts first from the roster wizard.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <RosterBoard
            shifts={shifts}
            employees={employees}
            rosterId={selectedRosterId}
            rosterStartDate={selectedRoster?.start_date}
            rosterEndDate={selectedRoster?.end_date}
            onAssignmentChange={handleRefresh}
          />
        </div>
      )}

      {/* Version History panel */}
      {showHistory && selectedRosterId && selectedRoster && (
        <div className="mt-4">
          <VersionHistory
            rosterId={selectedRosterId}
            rosterStatus={selectedRoster.status}
            onRollback={handleRefresh}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
