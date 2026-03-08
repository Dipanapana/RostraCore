'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { rosterApi, clientsApi, shiftsApi, availabilityPatternsApi } from '@/services/api'
import { getApiUrl } from '@/lib/config'
import {
    Building2,
    MapPin,
    Users,
    Calendar,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    UserPlus,
    Filter,
    ArrowLeft,
    X,
    XCircle,
    ArrowRightLeft,
    Trash2,
    ShieldCheck,
    Loader2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface ShiftData {
    shift_id: number
    start_time: string
    end_time: string
    required_staff: number
    assigned_count: number
    fill_status: 'full' | 'partial' | 'empty'
    status: string
}

interface SiteData {
    site_id: number
    site_name: string
    address: string
    total_shifts: number
    fill_rate: number
    shifts: ShiftData[]
}

interface EmployeeData {
    employee_id: number
    first_name: string
    last_name: string
    role: string
    psira_grade?: string
    hourly_rate: number
}

interface ClientData {
    client_id: number
    client_name: string
    status: string
    fill_rate: number
    sites: SiteData[]
    summary: {
        total_sites: number
        total_shifts: number
        filled_shifts: number
        understaffed_shifts: number
        empty_shifts: number
    }
    available_employees: EmployeeData[]
    available_employees_count: number
}

interface DashboardData {
    clients: ClientData[]
    summary: {
        total_clients: number
        total_sites: number
        total_shifts: number
        filled_shifts: number
        understaffed_shifts: number
        empty_shifts: number
        fill_rate: number
    }
    date_range: {
        start_date: string
        end_date: string
    }
}

export default function RosterAssignmentDashboard() {
    const router = useRouter()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set())
    const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
    const [selectedClientId, setSelectedClientId] = useState<number | undefined>(undefined)
    const [startDate, setStartDate] = useState<string>(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState<string>(() => {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        return nextWeek.toISOString().split('T')[0]
    })
    const [assigningShift, setAssigningShift] = useState<number | null>(null)

    // Assignment modal state
    const [assignModal, setAssignModal] = useState<{
        open: boolean
        shiftId: number | null
        rosterId: number | null
        clientId: number | null
    }>({ open: false, shiftId: null, rosterId: null, clientId: null })
    const [assignEmployeeId, setAssignEmployeeId] = useState<string>('')
    const [assignWarnings, setAssignWarnings] = useState<string[]>([])
    const [assignErrors, setAssignErrors] = useState<string[]>([])
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null)
    const [assignSubmitting, setAssignSubmitting] = useState(false)
    const [assignValidating, setAssignValidating] = useState(false)

    // Swap state
    const [swapSource, setSwapSource] = useState<{ shiftId: number; employeeId: number; employeeName: string } | null>(null)

    // Pre-check constraint results for an employee+shift combination
    const [preCheckResults, setPreCheckResults] = useState<{
        passed: string[]
        warnings: string[]
        errors: string[]
    } | null>(null)

    // Open assign modal for a shift
    const openAssignModal = (shiftId: number, rosterId: number | null, clientId: number | null) => {
        setAssignModal({ open: true, shiftId, rosterId, clientId })
        setAssignEmployeeId('')
        setAssignWarnings([])
        setAssignErrors([])
        setAssignSuccess(null)
        setPreCheckResults(null)
    }

    // Pre-validate when an employee is selected in the assign modal
    const handleEmployeeSelect = async (employeeId: string) => {
        setAssignEmployeeId(employeeId)
        setPreCheckResults(null)
        setAssignWarnings([])
        setAssignErrors([])
        setAssignSuccess(null)

        if (!employeeId || !assignModal.shiftId) return

        // Find the shift data to get date/time for pre-check
        const client = data?.clients.find(c => c.client_id === assignModal.clientId)
        const shift = client?.sites.flatMap(s => s.shifts).find(s => s.shift_id === assignModal.shiftId)

        if (!shift) return

        setAssignValidating(true)
        try {
            const shiftDate = new Date(shift.start_time).toISOString().split('T')[0]
            const shiftTime = new Date(shift.start_time).toLocaleTimeString('en-ZA', {
                hour: '2-digit', minute: '2-digit', hour12: false
            })

            const res = await availabilityPatternsApi.checkAvailability(
                parseInt(employeeId), shiftDate, shiftTime
            )
            const avail = res.data

            const passed: string[] = []
            const warnings: string[] = []

            if (avail.available !== false) {
                passed.push('Employee is available on this date')
            } else {
                warnings.push('Employee may not be available on this date')
            }

            // Check fill status
            if (shift.assigned_count < shift.required_staff) {
                passed.push(`Shift has open slots (${shift.assigned_count}/${shift.required_staff} filled)`)
            }

            // Find the employee for grade info
            const emp = client?.available_employees.find(e => e.employee_id === parseInt(employeeId))
            if (emp?.psira_grade) {
                passed.push(`PSIRA grade: ${emp.psira_grade}`)
            }

            setPreCheckResults({ passed, warnings, errors: [] })
        } catch {
            // Pre-check is optional -- don't block assignment if it fails
            setPreCheckResults(null)
        } finally {
            setAssignValidating(false)
        }
    }

    // Submit assignment via roster assign endpoint
    const handleAssignSubmit = async () => {
        if (!assignModal.shiftId || !assignEmployeeId) return
        setAssignSubmitting(true)
        setAssignWarnings([])
        setAssignErrors([])
        setAssignSuccess(null)
        try {
            const token = localStorage.getItem('access_token')
            if (assignModal.rosterId) {
                const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${assignModal.rosterId}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        shift_id: assignModal.shiftId,
                        employee_id: parseInt(assignEmployeeId),
                    }),
                })
                const data = await res.json()
                if (!res.ok) {
                    // Backend returns { detail: { errors: [...], warnings: [...] } } on 400
                    const detail = data.detail
                    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
                        setAssignErrors(detail.errors || [])
                        setAssignWarnings(detail.warnings || [])
                    } else {
                        const msg = typeof detail === 'string' ? detail : 'Assignment failed'
                        setAssignErrors([msg])
                    }
                    return
                }
                // Success -- show warnings from constraint checks if any
                if (data.warnings && data.warnings.length > 0) {
                    setAssignWarnings(data.warnings)
                }
                setAssignSuccess('Guard assigned successfully')
                // Keep modal open briefly to show feedback, then close and refresh
                setTimeout(async () => {
                    setAssignModal({ open: false, shiftId: null, rosterId: null, clientId: null })
                    await fetchData()
                }, data.warnings?.length > 0 ? 3000 : 1200)
                return
            } else {
                await shiftsApi.assignEmployee(assignModal.shiftId, parseInt(assignEmployeeId))
                setAssignSuccess('Guard assigned successfully')
                setTimeout(async () => {
                    setAssignModal({ open: false, shiftId: null, rosterId: null, clientId: null })
                    await fetchData()
                }, 1200)
                return
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail
            if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
                setAssignErrors(detail.errors || [])
                setAssignWarnings(detail.warnings || [])
            } else {
                setAssignErrors([typeof detail === 'string' ? detail : err.message || 'Assignment failed'])
            }
        } finally {
            setAssignSubmitting(false)
        }
    }

    // Unassign employee from a shift
    const handleUnassign = async (shiftId: number, employeeId: number, rosterId?: number) => {
        if (!confirm('Remove this guard from the shift?')) return
        try {
            const token = localStorage.getItem('access_token')
            if (rosterId) {
                const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/unassign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ shift_id: shiftId, employee_id: employeeId }),
                })
                if (!res.ok) {
                    const data = await res.json()
                    alert(data.detail || 'Failed to unassign')
                    return
                }
            } else {
                await shiftsApi.assignEmployee(shiftId, employeeId) // fallback
            }
            await fetchData()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to unassign employee')
        }
    }

    // Swap: select first employee, then click swap on second
    const handleSwapClick = (shiftId: number, employeeId: number, employeeName: string) => {
        if (swapSource && swapSource.shiftId !== shiftId) {
            // Complete the swap
            performSwap(swapSource.shiftId, swapSource.employeeId, shiftId, employeeId)
        } else {
            setSwapSource({ shiftId, employeeId, employeeName })
        }
    }

    const performSwap = async (shiftA: number, empA: number, shiftB: number, empB: number) => {
        try {
            const token = localStorage.getItem('access_token')
            const res = await fetch(`${getApiUrl()}/api/v1/roster/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    assignment_a: { shift_id: shiftA, employee_id: empA },
                    assignment_b: { shift_id: shiftB, employee_id: empB },
                }),
            })
            if (res.ok) {
                alert('Swap completed successfully!')
                setSwapSource(null)
                await fetchData()
            } else {
                const data = await res.json()
                alert(data.detail || 'Swap failed')
                setSwapSource(null)
            }
        } catch (err: any) {
            alert('Swap failed: ' + err.message)
            setSwapSource(null)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await rosterApi.getAssignmentDashboard({
                start_date: startDate,
                end_date: endDate,
                client_id: selectedClientId
            })
            setData(response.data)
            // Auto-expand clients with issues
            const clientsWithIssues = new Set<number>()
            response.data.clients.forEach((client: ClientData) => {
                if (client.summary.empty_shifts > 0 || client.summary.understaffed_shifts > 0) {
                    clientsWithIssues.add(client.client_id)
                }
            })
            setExpandedClients(clientsWithIssues)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load assignment dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [startDate, endDate, selectedClientId])

    const toggleClient = (clientId: number) => {
        setExpandedClients(prev => {
            const next = new Set(prev)
            if (next.has(clientId)) {
                next.delete(clientId)
            } else {
                next.add(clientId)
            }
            return next
        })
    }

    const toggleSite = (clientId: number, siteId: number) => {
        const key = `${clientId}-${siteId}`
        setExpandedSites(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const handleQuickAssign = async (shiftId: number, employeeId: number) => {
        setAssigningShift(shiftId)
        try {
            await shiftsApi.assignEmployee(shiftId, employeeId)
            await fetchData() // Refresh data
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to assign employee')
        } finally {
            setAssigningShift(null)
        }
    }

    const getFillStatusColor = (status: string) => {
        switch (status) {
            case 'full':
                return 'bg-green-500'
            case 'partial':
                return 'bg-yellow-500'
            case 'empty':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getFillStatusBg = (status: string) => {
        switch (status) {
            case 'full':
                return 'bg-green-500/10 border-green-500/20 text-green-500'
            case 'partial':
                return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
            case 'empty':
                return 'bg-red-500/10 border-red-500/20 text-red-500'
            default:
                return 'bg-gray-500/10 border-gray-500/20 text-gray-500'
        }
    }

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-ZA', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-ZA', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        })
    }

    if (loading) {
        return (
            <DashboardLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
            </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-500 mb-2">Error Loading Dashboard</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Roster Assignment Dashboard
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            View and manage shift assignments across all clients
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">All Clients</option>
                        {data?.clients.map(client => (
                            <option key={client.client_id} value={client.client_id}>
                                {client.client_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Clients</p>
                                <p className="text-xl font-bold text-gray-900">{data.summary.total_clients}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <MapPin className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Sites</p>
                                <p className="text-xl font-bold text-gray-900">{data.summary.total_sites}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Filled</p>
                                <p className="text-xl font-bold text-green-500">{data.summary.filled_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Partial</p>
                                <p className="text-xl font-bold text-yellow-500">{data.summary.understaffed_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Empty</p>
                                <p className="text-xl font-bold text-red-500">{data.summary.empty_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${data.summary.fill_rate >= 80 ? 'bg-green-500/10' : data.summary.fill_rate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                                <Calendar className={`w-5 h-5 ${data.summary.fill_rate >= 80 ? 'text-green-500' : data.summary.fill_rate >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Fill Rate</p>
                                <p className={`text-xl font-bold ${data.summary.fill_rate >= 80 ? 'text-green-500' : data.summary.fill_rate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {data.summary.fill_rate}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Client List */}
            {data && (
                <div className="space-y-4">
                    {data.clients.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
                            <p className="text-gray-600">
                                No clients with shifts in the selected date range.
                            </p>
                        </div>
                    ) : (
                        data.clients.map(client => (
                            <div key={client.client_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Client Header */}
                                <button
                                    onClick={() => toggleClient(client.client_id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {expandedClients.has(client.client_id) ? (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-900">
                                                {client.client_name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {client.summary.total_sites} sites | {client.available_employees_count} available guards
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-green-500">{client.summary.filled_shifts}</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-sm text-yellow-500">{client.summary.understaffed_shifts}</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-sm text-red-500">{client.summary.empty_shifts}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            client.fill_rate >= 80 ? 'bg-green-500/10 text-green-500' :
                                            client.fill_rate >= 50 ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-red-500/10 text-red-500'
                                        }`}>
                                            {client.fill_rate}%
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Client Content */}
                                {expandedClients.has(client.client_id) && (
                                    <div className="border-t border-gray-200 divide-y divide-gray-200">
                                        {client.sites.map(site => (
                                            <div key={site.site_id}>
                                                {/* Site Header */}
                                                <button
                                                    onClick={() => toggleSite(client.client_id, site.site_id)}
                                                    className="w-full px-4 py-3 pl-12 flex items-center justify-between hover:bg-gray-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedSites.has(`${client.client_id}-${site.site_id}`) ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                                        <div className="text-left">
                                                            <p className="font-medium text-gray-900">{site.site_name}</p>
                                                            <p className="text-xs text-gray-500">{site.address}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-gray-600">
                                                            {site.total_shifts} shifts
                                                        </span>
                                                        <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                            site.fill_rate >= 80 ? 'bg-green-500/10 text-green-500' :
                                                            site.fill_rate >= 50 ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-red-500/10 text-red-500'
                                                        }`}>
                                                            {site.fill_rate}%
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Expanded Site: Shifts */}
                                                {expandedSites.has(`${client.client_id}-${site.site_id}`) && site.shifts.length > 0 && (
                                                    <div className="pl-20 pr-4 pb-4 space-y-2">
                                                        {site.shifts.map(shift => (
                                                            <div
                                                                key={shift.shift_id}
                                                                className={`p-3 rounded-lg border ${getFillStatusBg(shift.fill_status)} flex items-center justify-between`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${getFillStatusColor(shift.fill_status)}`} />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">
                                                                            {formatDate(shift.start_time)} {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {shift.assigned_count}/{shift.required_staff} assigned
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {shift.fill_status !== 'full' && (
                                                                        <button
                                                                            onClick={() => openAssignModal(shift.shift_id, null, client.client_id)}
                                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                                                        >
                                                                            <UserPlus className="w-3 h-3" />
                                                                            Assign Guard
                                                                        </button>
                                                                    )}
                                                                    {shift.fill_status !== 'full' && client.available_employees.length > 0 && (
                                                                        <select
                                                                            onChange={(e) => {
                                                                                if (e.target.value) {
                                                                                    handleQuickAssign(shift.shift_id, parseInt(e.target.value))
                                                                                }
                                                                            }}
                                                                            disabled={assigningShift === shift.shift_id}
                                                                            className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                                                                            value=""
                                                                        >
                                                                            <option value="">Quick +</option>
                                                                            {client.available_employees.map(emp => (
                                                                                <option key={emp.employee_id} value={emp.employee_id}>
                                                                                    {emp.first_name} {emp.last_name} ({emp.role})
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Swap mode banner */}
            {swapSource && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4">
                    <ArrowRightLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">
                        Swapping: {swapSource.employeeName} (Shift #{swapSource.shiftId}) — click Swap on another assignment to complete
                    </span>
                    <button
                        onClick={() => setSwapSource(null)}
                        className="ml-2 p-1 hover:bg-indigo-500 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Assign Guard Modal */}
            {assignModal.open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Assign Guard to Shift</h3>
                            <button
                                onClick={() => setAssignModal({ open: false, shiftId: null, rosterId: null, clientId: null })}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Shift #{assignModal.shiftId}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                            <select
                                value={assignEmployeeId}
                                onChange={(e) => handleEmployeeSelect(e.target.value)}
                                disabled={!!assignSuccess}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="">-- Select a guard --</option>
                                {data?.clients
                                    .find(c => c.client_id === assignModal.clientId)
                                    ?.available_employees.map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_id}>
                                            {emp.first_name} {emp.last_name} — {emp.role} {emp.psira_grade ? `(${emp.psira_grade})` : ''} — R{emp.hourly_rate}/hr
                                        </option>
                                    )) || (
                                    <option disabled>No employees available</option>
                                )}
                            </select>
                        </div>

                        {/* Pre-check: Validating spinner */}
                        {assignValidating && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-medium">Checking constraints...</span>
                                </div>
                            </div>
                        )}

                        {/* Pre-check: Constraint validation results */}
                        {preCheckResults && !assignSuccess && !assignValidating && (
                            <div className="mb-4 space-y-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pre-assignment Checks</span>
                                </div>
                                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                    {preCheckResults.passed.map((msg, i) => (
                                        <div key={`pass-${i}`} className="flex items-start gap-2 px-3 py-2 bg-green-50/50">
                                            <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-green-800">{msg}</span>
                                        </div>
                                    ))}
                                    {preCheckResults.warnings.map((msg, i) => (
                                        <div key={`warn-${i}`} className="flex items-start gap-2 px-3 py-2 bg-amber-50/50">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-amber-800">{msg}</span>
                                        </div>
                                    ))}
                                    {preCheckResults.errors.map((msg, i) => (
                                        <div key={`err-${i}`} className="flex items-start gap-2 px-3 py-2 bg-red-50/50">
                                            <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-red-800">{msg}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success message */}
                        {assignSuccess && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-green-800">{assignSuccess}</p>
                                        {assignWarnings.length > 0 && (
                                            <p className="text-xs text-green-700">
                                                Assignment completed with {assignWarnings.length} constraint warning{assignWarnings.length !== 1 ? 's' : ''} below.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Post-assignment warnings (soft violations from backend) */}
                        {assignWarnings.length > 0 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-amber-800">
                                            {assignSuccess ? 'Constraint Warnings' : 'Soft Constraint Violations'}
                                        </p>
                                        {assignWarnings.map((w, i) => (
                                            <div key={i} className="flex items-start gap-1.5">
                                                <span className="text-amber-500 mt-px flex-shrink-0 text-xs leading-none">&#9888;</span>
                                                <p className="text-xs text-amber-700">{w}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hard errors (assignment blocked by backend) */}
                        {assignErrors.length > 0 && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold text-red-800">Assignment Blocked</p>
                                        {assignErrors.map((e, i) => (
                                            <div key={i} className="flex items-start gap-1.5">
                                                <span className="text-red-500 mt-px flex-shrink-0 text-xs leading-none">&#10005;</span>
                                                <p className="text-xs text-red-700">{e}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setAssignModal({ open: false, shiftId: null, rosterId: null, clientId: null })}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {assignSuccess ? 'Close' : 'Cancel'}
                            </button>
                            {!assignSuccess && (
                                <button
                                    onClick={handleAssignSubmit}
                                    disabled={!assignEmployeeId || assignSubmitting || assignErrors.length > 0}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {assignSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {assignSubmitting ? 'Assigning...' : assignErrors.length > 0 ? 'Blocked' : 'Assign'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </DashboardLayout>
    )
}
