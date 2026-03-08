'use client'

import { useState, useEffect, useCallback } from 'react'
import { rosterApi, sitesApi, clientsApi, employeesApi, shiftsApi } from '@/services/api'
import Modal from '@/components/ui/Modal'
import EmployeeCombobox from '@/components/ui/EmployeeCombobox'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Filter,
  Clock,
  UserPlus,
  Search,
  Shield,
  MapPin,
  Calendar,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface PostingAlert {
  shift_id: number
  site_id: number
  site_name: string
  client_id: number | null
  client_name: string | null
  shift_start: string
  shift_end: string
  required_staff: number
  assigned_staff: number
  gap: number
  severity: 'critical' | 'warning' | 'over_posted'
  hours_until_start: number
}

interface AlertSummary {
  critical: number
  warning: number
  over_posted: number
  ok: number
  total_shifts: number
}

interface AlertsResponse {
  as_of: string
  period_start: string
  period_end: string
  summary: AlertSummary
  alerts: PostingAlert[]
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  id_number: string
  role: string
  status?: string
  psira_grade?: string
  hourly_rate?: number
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function plusDays(iso: string, n: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatShiftTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatTimeOnly(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateOnly(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    description: 'No guards assigned — shift starts within 24 h',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: AlertCircle,
  },
  warning: {
    label: 'Under-posted',
    description: 'Fewer guards assigned than required',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  over_posted: {
    label: 'Over-posted',
    description: 'More guards assigned than required',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: TrendingUp,
  },
}

export default function PostingAlertsPage() {
  const today = todayISO()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(plusDays(today, 6))
  const [siteFilter, setSiteFilter] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const [data, setData] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sites, setSites] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  // Employee data for assignment
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesLoaded, setEmployeesLoaded] = useState(false)

  // Assign Guard modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<PostingAlert | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)

  // Find Available panel state
  const [findAvailableAlert, setFindAvailableAlert] = useState<PostingAlert | null>(null)
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [findingAvailable, setFindingAvailable] = useState(false)
  const [availableSearch, setAvailableSearch] = useState('')

  // Load filter options
  useEffect(() => {
    Promise.allSettled([sitesApi.getAll(), clientsApi.getAll()]).then(([sitesRes, clientsRes]) => {
      if (sitesRes.status === 'fulfilled') setSites(sitesRes.value.data || [])
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data || [])
    })
  }, [])

  // Load employees for assignment (lazy load on first use)
  const ensureEmployeesLoaded = useCallback(async () => {
    if (employeesLoaded) return
    try {
      const res = await employeesApi.getAll({ status: 'active', limit: 1000 })
      const list = res.data?.data || res.data || []
      setEmployees(Array.isArray(list) ? list : [])
      setEmployeesLoaded(true)
    } catch {
      // Silently handle -- employee list will be empty
    }
  }, [employeesLoaded])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { start_date: startDate, end_date: endDate }
      if (siteFilter) params.site_id = Number(siteFilter)
      if (clientFilter) params.client_id = Number(clientFilter)
      const res = await rosterApi.getPostingAlerts(params)
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load posting alerts')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, siteFilter, clientFilter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const filteredAlerts = data?.alerts.filter((a) =>
    severityFilter === 'all' || a.severity === severityFilter
  ) ?? []

  const totalAlerts = data ? data.summary.critical + data.summary.warning + data.summary.over_posted : 0

  // ------ Assign Guard handlers ------

  const handleOpenAssignModal = async (alert: PostingAlert) => {
    setSelectedAlert(alert)
    setSelectedEmployeeId(null)
    setAssignError(null)
    setAssignSuccess(false)
    setAssignModalOpen(true)
    await ensureEmployeesLoaded()
  }

  const handleAssignGuard = async () => {
    if (!selectedAlert || !selectedEmployeeId) return
    setAssigning(true)
    setAssignError(null)
    setAssignSuccess(false)
    try {
      await shiftsApi.assignEmployee(selectedAlert.shift_id, selectedEmployeeId)
      setAssignSuccess(true)
      // Refresh alerts after short delay so user sees the success state
      setTimeout(() => {
        setAssignModalOpen(false)
        setSelectedAlert(null)
        setSelectedEmployeeId(null)
        setAssignSuccess(false)
        fetchAlerts()
      }, 1200)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setAssignError(typeof detail === 'string' ? detail : 'Failed to assign guard. The employee may already be assigned or unavailable.')
    } finally {
      setAssigning(false)
    }
  }

  const handleCloseAssignModal = () => {
    if (assigning) return
    setAssignModalOpen(false)
    setSelectedAlert(null)
    setSelectedEmployeeId(null)
    setAssignError(null)
    setAssignSuccess(false)
  }

  // ------ Find Available handlers ------

  const handleFindAvailable = async (alert: PostingAlert) => {
    setFindAvailableAlert(alert)
    setAvailableSearch('')
    setFindingAvailable(true)
    await ensureEmployeesLoaded()

    try {
      // Fetch all active employees; the list is filtered client-side by search
      const res = await employeesApi.getAll({ status: 'active', limit: 1000 })
      const list = res.data?.data || res.data || []
      setAvailableEmployees(Array.isArray(list) ? list : [])
    } catch {
      setAvailableEmployees(employees) // fallback to cached list
    } finally {
      setFindingAvailable(false)
    }
  }

  const handleCloseFindAvailable = () => {
    setFindAvailableAlert(null)
    setAvailableEmployees([])
    setAvailableSearch('')
  }

  const handleAssignFromAvailable = (employee: Employee) => {
    if (!findAvailableAlert) return
    // Close find-available and open assign modal pre-filled
    const alert = findAvailableAlert
    handleCloseFindAvailable()
    setSelectedAlert(alert)
    setSelectedEmployeeId(employee.employee_id)
    setAssignError(null)
    setAssignSuccess(false)
    setAssignModalOpen(true)
  }

  // Filter available employees by search query
  const filteredAvailableEmployees = availableEmployees.filter((e) => {
    if (!availableSearch.trim()) return true
    const q = availableSearch.toLowerCase()
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase()
    return fullName.includes(q) || (e.role ?? '').toLowerCase().includes(q) || (e.id_number ?? '').toLowerCase().includes(q) || (e.psira_grade ?? '').toLowerCase().includes(q)
  })

  // Check if an alert is for an understaffed shift (critical or warning)
  const isUnderstaffed = (alert: PostingAlert) => alert.severity === 'critical' || alert.severity === 'warning'

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Posting Alerts</h1>
          <p className="text-gray-500 mt-1">
            Real-time over/under-staffing alerts across all sites
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical only</option>
              <option value="warning">Under-posted only</option>
              <option value="over_posted">Over-posted only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total Shifts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.summary.total_shifts}</p>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{data.summary.critical}</p>
            <p className="text-xs text-red-500/70 mt-0.5">0 guards, starts ≤24h</p>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600">Under-posted</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{data.summary.warning}</p>
            <p className="text-xs text-amber-500/70 mt-0.5">Fewer than required</p>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-600">Over-posted</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{data.summary.over_posted}</p>
            <p className="text-xs text-blue-500/70 mt-0.5">More than required</p>
          </div>

          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600">Correctly Posted</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{data.summary.ok}</p>
            <p className="text-xs text-emerald-500/70 mt-0.5">Exactly as required</p>
          </div>
        </div>
      )}

      {/* All clear */}
      {data && totalAlerts === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">All shifts correctly posted</h3>
          <p className="text-gray-500 mt-1">
            No over or under-posting issues found for {data.period_start} – {data.period_end}
          </p>
        </div>
      )}

      {/* Alert table */}
      {filteredAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {severityFilter === 'all' ? 'All Alerts' : SEVERITY_CONFIG[severityFilter as keyof typeof SEVERITY_CONFIG]?.label}
              <span className="ml-2 text-sm font-normal text-gray-400">({filteredAlerts.length})</span>
            </h2>
            {data && (
              <p className="text-xs text-gray-400">
                As of {new Date(data.as_of).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Shift Start</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3 text-center">Assigned</th>
                  <th className="px-4 py-3 text-center">Gap</th>
                  <th className="px-4 py-3 text-left">Starts In</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAlerts.map((alert) => {
                  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.critical
                  const Icon = cfg.icon
                  const hoursUntil = alert.hours_until_start
                  const timeLabel =
                    hoursUntil < 0
                      ? 'Started'
                      : hoursUntil < 1
                      ? `${Math.round(hoursUntil * 60)}m`
                      : hoursUntil < 24
                      ? `${hoursUntil.toFixed(1)}h`
                      : `${Math.round(hoursUntil / 24)}d`

                  return (
                    <tr key={alert.shift_id} className={`${cfg.bg} hover:opacity-90 transition-opacity`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {alert.site_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {alert.client_name ?? '---'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatShiftTime(alert.shift_start)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {alert.required_staff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${alert.assigned_staff === 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {alert.assigned_staff}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${alert.gap < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {alert.gap > 0 ? `+${alert.gap}` : alert.gap}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          hoursUntil <= 0 ? 'text-gray-400' :
                          hoursUntil <= 2 ? 'text-red-600' :
                          hoursUntil <= 24 ? 'text-amber-600' :
                          'text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isUnderstaffed(alert) && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenAssignModal(alert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              title="Assign a guard to this shift"
                            >
                              <UserPlus className="w-3 h-3" />
                              Assign
                            </button>
                            <button
                              onClick={() => handleFindAvailable(alert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                              title="Find available employees for this time slot"
                            >
                              <Search className="w-3 h-3" />
                              Find Available
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
        </div>
      )}

      {/* ===== Assign Guard Modal ===== */}
      <Modal
        isOpen={assignModalOpen}
        onClose={handleCloseAssignModal}
        title="Assign Guard to Shift"
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={handleCloseAssignModal}
              disabled={assigning}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignGuard}
              disabled={!selectedEmployeeId || assigning || assignSuccess}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Assigning...
                </>
              ) : assignSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Assigned!
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Assign Guard
                </>
              )}
            </button>
          </>
        }
      >
        {selectedAlert && (
          <div className="space-y-5">
            {/* Shift details card */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Shift Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Site</p>
                    <p className="font-medium text-gray-900">{selectedAlert.site_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDateOnly(selectedAlert.shift_start)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">
                      {formatTimeOnly(selectedAlert.shift_start)} - {formatTimeOnly(selectedAlert.shift_end)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Staffing</p>
                    <p className="font-medium text-gray-900">
                      <span className={selectedAlert.assigned_staff === 0 ? 'text-red-600' : ''}>
                        {selectedAlert.assigned_staff}
                      </span>
                      {' / '}
                      {selectedAlert.required_staff} assigned
                      <span className="text-red-600 font-bold ml-1">
                        ({Math.abs(selectedAlert.gap)} needed)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee to Assign
              </label>
              <EmployeeCombobox
                value={selectedEmployeeId}
                onChange={setSelectedEmployeeId}
                employees={employees}
                placeholder="Search by name or ID number..."
              />
            </div>

            {/* Error message */}
            {assignError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{assignError}</p>
              </div>
            )}

            {/* Success message */}
            {assignSuccess && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Guard assigned successfully. Refreshing alerts...</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ===== Find Available Employees Modal ===== */}
      <Modal
        isOpen={findAvailableAlert !== null}
        onClose={handleCloseFindAvailable}
        title="Available Employees"
        maxWidth="xl"
      >
        {findAvailableAlert && (
          <div className="space-y-4">
            {/* Shift context */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">{findAvailableAlert.site_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatShiftTime(findAvailableAlert.shift_start)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatTimeOnly(findAvailableAlert.shift_start)} - {formatTimeOnly(findAvailableAlert.shift_end)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-red-600 font-medium text-xs">
                    {Math.abs(findAvailableAlert.gap)} guard{Math.abs(findAvailableAlert.gap) !== 1 ? 's' : ''} needed
                  </span>
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
                placeholder="Search by name, role, or grade..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>

            {/* Employee list */}
            {findingAvailable ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600" />
                <span className="ml-3 text-sm text-gray-500">Loading available employees...</span>
              </div>
            ) : filteredAvailableEmployees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {availableSearch ? 'No employees match your search.' : 'No available employees found.'}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Employee</th>
                        <th className="px-4 py-2.5 text-left">Role</th>
                        <th className="px-4 py-2.5 text-left">Grade</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAvailableEmployees.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="text-sm font-medium text-gray-900">
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{emp.id_number}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                              <Shield className="w-3 h-3 text-gray-400" />
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">
                            {emp.psira_grade || '---'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => handleAssignFromAvailable(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                              <UserPlus className="w-3 h-3" />
                              Assign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                  <p className="text-xs text-gray-500">
                    Showing {filteredAvailableEmployees.length} active employee{filteredAvailableEmployees.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
    </DashboardLayout>
  )
}
