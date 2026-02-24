'use client'

import { useState, useEffect } from 'react'
import { rosterApi, employeesApi, sitesApi, shiftsApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DatePicker from '@/components/DatePicker'
import { AlertCircle, Calendar, MapPin, Clock, User, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface UnfilledShift {
  shift_id: number
  site_id: number
  site_name?: string
  start_time: string
  end_time: string
  required_skill?: string
  required_staff?: number
  status: string
  notes?: string
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  role: string
  cert_level?: string
  status: string
}

interface Site {
  site_id: number
  site_name: string
  client_name?: string
}

export default function UnfilledShiftsPage() {
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const today = new Date()
    return today
  })
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  })
  const [selectedSite, setSelectedSite] = useState<number | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [unfilledShifts, setUnfilledShifts] = useState<UnfilledShift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Selected employees for bulk assignment
  const [selectedShifts, setSelectedShifts] = useState<Set<number>>(new Set())
  const [bulkAssignEmployee, setBulkAssignEmployee] = useState<number | null>(null)

  // Fetch sites on mount
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await sitesApi.getAll()
        setSites(Array.isArray(response.data) ? response.data : [])
      } catch (err) {
        console.error('Failed to fetch sites:', err)
      }
    }
    fetchSites()
  }, [])

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await employeesApi.getAll({ status: 'active' })
        setEmployees(Array.isArray(response.data) ? response.data : [])
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      }
    }
    fetchEmployees()
  }, [])

  // Fetch unfilled shifts
  const fetchUnfilledShifts = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    setError(null)

    try {
      const params: any = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      }
      if (selectedSite) {
        params.site_id = selectedSite
      }

      const response = await rosterApi.getUnfilledShifts(params)
      setUnfilledShifts(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch unfilled shifts')
      setUnfilledShifts([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch on filter change
  useEffect(() => {
    fetchUnfilledShifts()
  }, [startDate, endDate, selectedSite])

  // Assign employee to shift
  const handleAssignEmployee = async (shiftId: number, employeeId: number) => {
    setAssigning(shiftId)
    setError(null)
    setSuccessMessage(null)

    try {
      await shiftsApi.assignEmployee(shiftId, employeeId)
      setSuccessMessage('Employee assigned successfully')
      // Remove from unfilled list
      setUnfilledShifts(prev => prev.filter(s => s.shift_id !== shiftId))
      setSelectedShifts(prev => {
        const newSet = new Set(prev)
        newSet.delete(shiftId)
        return newSet
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign employee')
    } finally {
      setAssigning(null)
    }
  }

  // Bulk assign
  const handleBulkAssign = async () => {
    if (!bulkAssignEmployee || selectedShifts.size === 0) return

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    let successCount = 0
    let failCount = 0

    for (const shiftId of selectedShifts) {
      try {
        await shiftsApi.assignEmployee(shiftId, bulkAssignEmployee)
        successCount++
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      setSuccessMessage(`Successfully assigned ${successCount} shift(s)`)
      // Refresh the list
      fetchUnfilledShifts()
      setSelectedShifts(new Set())
      setBulkAssignEmployee(null)
    }

    if (failCount > 0) {
      setError(`Failed to assign ${failCount} shift(s)`)
    }

    setLoading(false)
  }

  // Toggle shift selection
  const toggleShiftSelection = (shiftId: number) => {
    setSelectedShifts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId)
      } else {
        newSet.add(shiftId)
      }
      return newSet
    })
  }

  // Select all shifts
  const selectAllShifts = () => {
    if (selectedShifts.size === unfilledShifts.length) {
      setSelectedShifts(new Set())
    } else {
      setSelectedShifts(new Set(unfilledShifts.map(s => s.shift_id)))
    }
  }

  // Format date/time
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate shift duration
  const getShiftDuration = (start: string, end: string) => {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    return hours.toFixed(1)
  }

  // Get site name
  const getSiteName = (siteId: number) => {
    const site = sites.find(s => s.site_id === siteId)
    return site?.site_name || `Site ${siteId}`
  }

  // Get fill rate indicator color
  const getFillRateColor = () => {
    const total = unfilledShifts.length
    if (total === 0) return 'text-green-500'
    if (total < 5) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Unfilled Shifts</h1>
            <p className="text-gray-600 mt-1">
              Manage and assign employees to unfilled shifts
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 ${getFillRateColor()}`}>
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{unfilledShifts.length} unfilled shifts</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={selectedSite || ''}
                onChange={(e) => setSelectedSite(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchUnfilledShifts}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedShifts.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {selectedShifts.size} shift(s) selected
                </span>
              </div>
              <div className="flex-1 flex flex-col md:flex-row gap-2">
                <select
                  value={bulkAssignEmployee || ''}
                  onChange={(e) => setBulkAssignEmployee(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select employee to assign...</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name} ({emp.cert_level || emp.role})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignEmployee || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Assign to Selected
                </button>
                <button
                  onClick={() => {
                    setSelectedShifts(new Set())
                    setBulkAssignEmployee(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Shifts List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading unfilled shifts...</p>
            </div>
          ) : unfilledShifts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">All shifts are filled!</h3>
              <p className="text-gray-600">No unfilled shifts found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedShifts.size === unfilledShifts.length && unfilledShifts.length > 0}
                        onChange={selectAllShifts}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required Skill
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quick Assign
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unfilledShifts.map((shift) => (
                    <tr
                      key={shift.shift_id}
                      className={selectedShifts.has(shift.shift_id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedShifts.has(shift.shift_id)}
                          onChange={() => toggleShiftSelection(shift.shift_id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateTime(shift.start_time)}
                            </div>
                            <div className="text-xs text-gray-500">
                              to {formatDateTime(shift.end_time)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {shift.site_name || getSiteName(shift.site_id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {getShiftDuration(shift.start_time, shift.end_time)}h
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {shift.required_skill ? (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {shift.required_skill}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Any</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                            disabled={assigning === shift.shift_id}
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignEmployee(shift.shift_id, Number(e.target.value))
                                e.target.value = ''
                              }
                            }}
                          >
                            <option value="">Assign...</option>
                            {employees
                              .filter(emp => !shift.required_skill || emp.cert_level === shift.required_skill)
                              .map((emp) => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {emp.first_name} {emp.last_name}
                                </option>
                              ))}
                          </select>
                          {assigning === shift.shift_id && (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {unfilledShifts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unfilled Shifts</p>
                  <p className="text-xl font-bold text-gray-900">{unfilledShifts.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Hours Needed</p>
                  <p className="text-xl font-bold text-gray-900">
                    {unfilledShifts.reduce((sum, s) => sum + parseFloat(getShiftDuration(s.start_time, s.end_time)), 0).toFixed(1)}h
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Employees</p>
                  <p className="text-xl font-bold text-gray-900">{employees.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
