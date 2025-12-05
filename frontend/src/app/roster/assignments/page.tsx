'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { rosterApi, clientsApi, shiftsApi } from '@/services/api'
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
} from 'lucide-react'

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
                return 'bg-slate-500'
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
                return 'bg-slate-500/10 border-slate-500/20 text-slate-500'
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-500 mb-2">Error Loading Dashboard</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Roster Assignment Dashboard
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            View and manage shift assignments across all clients
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400">To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                        />
                    </div>
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
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
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Clients</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{data.summary.total_clients}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <MapPin className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Sites</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{data.summary.total_sites}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Filled</p>
                                <p className="text-xl font-bold text-green-500">{data.summary.filled_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Partial</p>
                                <p className="text-xl font-bold text-yellow-500">{data.summary.understaffed_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Empty</p>
                                <p className="text-xl font-bold text-red-500">{data.summary.empty_shifts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${data.summary.fill_rate >= 80 ? 'bg-green-500/10' : data.summary.fill_rate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                                <Calendar className={`w-5 h-5 ${data.summary.fill_rate >= 80 ? 'text-green-500' : data.summary.fill_rate >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Fill Rate</p>
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
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 p-8 text-center">
                            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Clients Found</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                No clients with shifts in the selected date range.
                            </p>
                        </div>
                    ) : (
                        data.clients.map(client => (
                            <div key={client.client_id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                                {/* Client Header */}
                                <button
                                    onClick={() => toggleClient(client.client_id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {expandedClients.has(client.client_id) ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {client.client_name}
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {client.summary.total_sites} sites | {client.available_employees_count} available guards
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-green-500">{client.summary.filled_shifts}</span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-sm text-yellow-500">{client.summary.understaffed_shifts}</span>
                                            <span className="text-slate-400">/</span>
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
                                    <div className="border-t border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/5">
                                        {client.sites.map(site => (
                                            <div key={site.site_id}>
                                                {/* Site Header */}
                                                <button
                                                    onClick={() => toggleSite(client.client_id, site.site_id)}
                                                    className="w-full px-4 py-3 pl-12 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedSites.has(`${client.client_id}-${site.site_id}`) ? (
                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                                        )}
                                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                                        <div className="text-left">
                                                            <p className="font-medium text-slate-900 dark:text-white">{site.site_name}</p>
                                                            <p className="text-xs text-slate-500">{site.address}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">
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
                                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                            {formatDate(shift.start_time)} {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {shift.assigned_count}/{shift.required_staff} assigned
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {shift.fill_status !== 'full' && client.available_employees.length > 0 && (
                                                                    <select
                                                                        onChange={(e) => {
                                                                            if (e.target.value) {
                                                                                handleQuickAssign(shift.shift_id, parseInt(e.target.value))
                                                                            }
                                                                        }}
                                                                        disabled={assigningShift === shift.shift_id}
                                                                        className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded"
                                                                        value=""
                                                                    >
                                                                        <option value="">+ Assign</option>
                                                                        {client.available_employees.map(emp => (
                                                                            <option key={emp.employee_id} value={emp.employee_id}>
                                                                                {emp.first_name} {emp.last_name} ({emp.role})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                )}
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
        </div>
    )
}
