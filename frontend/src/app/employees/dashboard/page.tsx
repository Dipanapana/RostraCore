'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { employeesApi, clientsApi, certificationsApi } from '@/services/api'
import {
    Users,
    AlertTriangle,
    Clock,
    DollarSign,
    ShieldAlert,
    ShieldCheck,
    ChevronRight,
    RefreshCw,
    Building2,
    ArrowLeft,
    X,
    Plus,
    CheckCircle,
    Pencil,
} from 'lucide-react'

interface Guard {
    employee_id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
    hourly_rate: number
    assigned_client_id?: number
    assigned_client_ids?: number[]
    psira_grade?: string
}

interface DataQualityCategory {
    count: number
    guards: Guard[]
}

interface DataQualityData {
    total_guards: number
    guards_without_client: DataQualityCategory
    guards_without_certification: DataQualityCategory
    guards_without_hourly_rate: DataQualityCategory
    guards_with_expired_certs: DataQualityCategory
    guards_with_expiring_certs: DataQualityCategory
}

interface Client {
    client_id: number
    client_name: string
}

export default function GuardDataQualityDashboard() {
    const router = useRouter()
    const [data, setData] = useState<DataQualityData | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedCard, setExpandedCard] = useState<string | null>(null)

    // Quick edit modals
    const [hourlyRateModal, setHourlyRateModal] = useState<{ guard: Guard } | null>(null)
    const [certModal, setCertModal] = useState<{ guard: Guard } | null>(null)
    const [clientModal, setClientModal] = useState<{ guard: Guard } | null>(null)
    const [saving, setSaving] = useState(false)
    const [newHourlyRate, setNewHourlyRate] = useState('')
    const [newCert, setNewCert] = useState({ cert_type: 'PSIRA', issue_date: '', expiry_date: '', cert_number: '' })
    const [selectedClientIds, setSelectedClientIds] = useState<number[]>([])

    // Full edit modal state
    const [editModal, setEditModal] = useState<{ guard: Guard } | null>(null)
    const [editFormData, setEditFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        hourly_rate: '',
        psira_grade: '',
        assigned_client_ids: [] as number[]
    })

    // Success notification state
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Show success message with auto-dismiss
    const showSuccess = (message: string) => {
        setSuccessMessage(message)
        setTimeout(() => setSuccessMessage(null), 3000)
    }

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const [qualityRes, clientsRes] = await Promise.all([
                employeesApi.getDataQualityDashboard(),
                clientsApi.getAll()
            ])
            setData(qualityRes.data)
            setClients(clientsRes.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load data quality metrics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const getClientName = (clientId?: number) => {
        if (!clientId) return 'Unassigned'
        const client = clients.find(c => c.client_id === clientId)
        return client?.client_name || `Client #${clientId}`
    }

    const getHealthScore = () => {
        if (!data) return 0
        const totalIssues =
            data.guards_without_client.count +
            data.guards_without_certification.count +
            data.guards_without_hourly_rate.count +
            data.guards_with_expired_certs.count

        if (data.total_guards === 0) return 100
        const issueRate = totalIssues / data.total_guards
        return Math.max(0, Math.round(100 - issueRate * 25))
    }

    // Quick edit handlers
    const handleSaveHourlyRate = async () => {
        if (!hourlyRateModal || !newHourlyRate) return
        const guardName = `${hourlyRateModal.guard.first_name} ${hourlyRateModal.guard.last_name}`
        setSaving(true)
        try {
            await employeesApi.update(hourlyRateModal.guard.employee_id, {
                hourly_rate: parseFloat(newHourlyRate)
            })
            setHourlyRateModal(null)
            setNewHourlyRate('')
            showSuccess(`Hourly rate updated for ${guardName}!`)
            fetchData()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to update hourly rate')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveCertification = async () => {
        if (!certModal || !newCert.issue_date || !newCert.expiry_date) return
        const guardName = `${certModal.guard.first_name} ${certModal.guard.last_name}`
        setSaving(true)
        try {
            await certificationsApi.create({
                employee_id: certModal.guard.employee_id,
                cert_type: newCert.cert_type,
                issue_date: newCert.issue_date,
                expiry_date: newCert.expiry_date,
                cert_number: newCert.cert_number || undefined,
                verified: false
            })
            setCertModal(null)
            setNewCert({ cert_type: 'PSIRA', issue_date: '', expiry_date: '', cert_number: '' })
            showSuccess(`Certification added for ${guardName}!`)
            fetchData()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to add certification')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveClientAssignment = async () => {
        if (!clientModal) return
        const guardName = `${clientModal.guard.first_name} ${clientModal.guard.last_name}`
        const clientCount = selectedClientIds.length
        setSaving(true)
        try {
            await employeesApi.update(clientModal.guard.employee_id, {
                assigned_client_ids: selectedClientIds.length > 0 ? selectedClientIds : undefined
            })
            setClientModal(null)
            setSelectedClientIds([])
            showSuccess(`${guardName} assigned to ${clientCount} client${clientCount !== 1 ? 's' : ''} successfully!`)
            fetchData()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to update client assignment')
        } finally {
            setSaving(false)
        }
    }

    const openHourlyRateModal = (guard: Guard) => {
        setNewHourlyRate(guard.hourly_rate?.toString() || '')
        setHourlyRateModal({ guard })
    }

    const openCertModal = (guard: Guard) => {
        setNewCert({ cert_type: 'PSIRA', expiry_date: '', cert_number: '' })
        setCertModal({ guard })
    }

    const openClientModal = (guard: Guard) => {
        setSelectedClientIds(guard.assigned_client_ids || (guard.assigned_client_id ? [guard.assigned_client_id] : []))
        setClientModal({ guard })
    }

    const openEditModal = (guard: Guard) => {
        setEditFormData({
            first_name: guard.first_name || '',
            last_name: guard.last_name || '',
            email: guard.email || '',
            phone: guard.phone || '',
            hourly_rate: guard.hourly_rate?.toString() || '',
            psira_grade: guard.psira_grade || '',
            assigned_client_ids: guard.assigned_client_ids || (guard.assigned_client_id ? [guard.assigned_client_id] : [])
        })
        setEditModal({ guard })
    }

    const handleSaveFullEdit = async () => {
        if (!editModal) return
        const guardName = `${editFormData.first_name} ${editFormData.last_name}`
        setSaving(true)
        try {
            await employeesApi.update(editModal.guard.employee_id, {
                first_name: editFormData.first_name,
                last_name: editFormData.last_name,
                email: editFormData.email || undefined,
                phone: editFormData.phone || undefined,
                hourly_rate: editFormData.hourly_rate ? parseFloat(editFormData.hourly_rate) : undefined,
                psira_grade: editFormData.psira_grade || undefined,
                assigned_client_ids: editFormData.assigned_client_ids.length > 0 ? editFormData.assigned_client_ids : undefined
            })
            setEditModal(null)
            showSuccess(`${guardName} updated successfully!`)
            fetchData()
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to update guard')
        } finally {
            setSaving(false)
        }
    }

    const cards = data ? [
        {
            id: 'without_client',
            title: 'Unassigned Guards',
            description: 'Guards not assigned to any client',
            count: data.guards_without_client.count,
            guards: data.guards_without_client.guards,
            icon: Building2,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
        },
        {
            id: 'without_cert',
            title: 'Missing Certifications',
            description: 'Guards without any certification on file',
            count: data.guards_without_certification.count,
            guards: data.guards_without_certification.guards,
            icon: ShieldAlert,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
        },
        {
            id: 'without_rate',
            title: 'Missing Hourly Rates',
            description: 'Guards with no hourly rate set',
            count: data.guards_without_hourly_rate.count,
            guards: data.guards_without_hourly_rate.guards,
            icon: DollarSign,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
        },
        {
            id: 'expired_certs',
            title: 'Expired Certifications',
            description: 'Guards with expired certificates',
            count: data.guards_with_expired_certs.count,
            guards: data.guards_with_expired_certs.guards,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-600/10',
            borderColor: 'border-red-600/20',
        },
        {
            id: 'expiring_certs',
            title: 'Expiring Soon',
            description: 'Certifications expiring in 30 days',
            count: data.guards_with_expiring_certs.count,
            guards: data.guards_with_expiring_certs.guards,
            icon: Clock,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20',
        },
    ] : []

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-500 mb-2">Error Loading Data</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
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

    const healthScore = getHealthScore()

    return (
        <div className="p-6 space-y-6">
            {/* Success Toast */}
            {successMessage && (
                <div className="fixed top-6 right-6 z-50 animate-bounce-in">
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/25">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{successMessage}</span>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="ml-2 hover:bg-blue-600 rounded p-1 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Guard Data Quality
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Monitor and fix data issues for your guards
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Guards */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Active Guards</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {data?.total_guards || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Health Score */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${healthScore >= 80 ? 'bg-green-500/10' : healthScore >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                            <ShieldCheck className={`w-6 h-6 ${healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Data Health Score</p>
                            <p className={`text-3xl font-bold ${healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {healthScore}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Issues Count */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Issues</p>
                            <p className="text-3xl font-bold text-red-500">
                                {data ? (
                                    data.guards_without_client.count +
                                    data.guards_without_certification.count +
                                    data.guards_without_hourly_rate.count +
                                    data.guards_with_expired_certs.count
                                ) : 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Issue Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className={`bg-white rounded-xl border ${card.borderColor} overflow-hidden`}
                    >
                        <button
                            onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 ${card.bgColor} rounded-xl`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">
                                        {card.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-2xl font-bold ${card.color}`}>
                                    {card.count}
                                </span>
                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedCard === card.id ? 'rotate-90' : ''}`} />
                            </div>
                        </button>

                        {/* Expanded Content */}
                        {expandedCard === card.id && card.guards.length > 0 && (
                            <div className="border-t border-gray-200">
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Contact
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Client
                                                </th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {card.guards.map((guard) => (
                                                <tr key={guard.employee_id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {guard.first_name} {guard.last_name}
                                                        </div>
                                                        {guard.psira_grade && (
                                                            <span className="text-xs text-gray-500">
                                                                Grade {guard.psira_grade}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {guard.email || guard.phone || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {getClientName(guard.assigned_client_id)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Show context-appropriate quick action */}
                                                            {card.id === 'without_client' && (
                                                                <button
                                                                    onClick={() => openClientModal(guard)}
                                                                    className="px-2 py-1 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded font-medium"
                                                                >
                                                                    Assign Client
                                                                </button>
                                                            )}
                                                            {card.id === 'without_rate' && (
                                                                <button
                                                                    onClick={() => openHourlyRateModal(guard)}
                                                                    className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 rounded font-medium"
                                                                >
                                                                    Set Rate
                                                                </button>
                                                            )}
                                                            {(card.id === 'without_cert' || card.id === 'expired_certs' || card.id === 'expiring_certs') && (
                                                                <button
                                                                    onClick={() => openCertModal(guard)}
                                                                    className="px-2 py-1 text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded font-medium"
                                                                >
                                                                    <Plus className="w-3 h-3 inline mr-1" />
                                                                    Add Cert
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => openEditModal(guard)}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded font-medium"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {card.count > 50 && (
                                    <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-600">
                                        Showing first 50 of {card.count} guards
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {expandedCard === card.id && card.guards.length === 0 && (
                            <div className="border-t border-gray-200 p-6 text-center">
                                <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-gray-600">
                                    All guards have this data complete
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Hourly Rate Modal */}
            {hourlyRateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Set Hourly Rate
                            </h3>
                            <button onClick={() => setHourlyRateModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            {hourlyRateModal.guard.first_name} {hourlyRateModal.guard.last_name}
                            {hourlyRateModal.guard.psira_grade && ` (Grade ${hourlyRateModal.guard.psira_grade})`}
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hourly Rate (ZAR)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newHourlyRate}
                                onChange={(e) => setNewHourlyRate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                placeholder="e.g. 45.00"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setHourlyRateModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveHourlyRate}
                                disabled={saving || !newHourlyRate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Certification Modal */}
            {certModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Add Certification
                            </h3>
                            <button onClick={() => setCertModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            {certModal.guard.first_name} {certModal.guard.last_name}
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Certification Type
                                </label>
                                <select
                                    value={newCert.cert_type}
                                    onChange={(e) => setNewCert({ ...newCert, cert_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                    <option value="PSIRA">PSIRA Registration</option>
                                    <option value="PSIRA_A">PSIRA Grade A</option>
                                    <option value="PSIRA_B">PSIRA Grade B</option>
                                    <option value="PSIRA_C">PSIRA Grade C</option>
                                    <option value="PSIRA_D">PSIRA Grade D</option>
                                    <option value="PSIRA_E">PSIRA Grade E</option>
                                    <option value="FIREARM">Firearm Competency</option>
                                    <option value="FIRST_AID">First Aid</option>
                                    <option value="DRIVER">Driver's License</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Certificate Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={newCert.cert_number}
                                    onChange={(e) => setNewCert({ ...newCert, cert_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    placeholder="e.g. PSI-12345678"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Issue Date
                                </label>
                                <input
                                    type="date"
                                    value={newCert.issue_date}
                                    onChange={(e) => setNewCert({ ...newCert, issue_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={newCert.expiry_date}
                                    onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setCertModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCertification}
                                disabled={saving || !newCert.issue_date || !newCert.expiry_date}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Add Certification'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Assignment Modal */}
            {clientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Assign to Clients
                            </h3>
                            <button onClick={() => setClientModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            {clientModal.guard.first_name} {clientModal.guard.last_name}
                        </p>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                            {clients.length === 0 ? (
                                <p className="text-sm text-gray-500 p-2">No clients available</p>
                            ) : (
                                clients.map(client => (
                                    <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedClientIds.includes(client.client_id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedClientIds([...selectedClientIds, client.client_id])
                                                } else {
                                                    setSelectedClientIds(selectedClientIds.filter(id => id !== client.client_id))
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="text-sm text-gray-700">{client.client_name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Select which clients this guard can work for.
                        </p>
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setClientModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveClientAssignment}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Edit Guard
                            </h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.first_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.last_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    />
                                </div>
                            </div>

                            {/* Contact Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    />
                                </div>
                            </div>

                            {/* Rate & Grade */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hourly Rate (ZAR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editFormData.hourly_rate}
                                        onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                        placeholder="e.g. 45.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PSIRA Grade
                                    </label>
                                    <select
                                        value={editFormData.psira_grade}
                                        onChange={(e) => setEditFormData({ ...editFormData, psira_grade: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                    >
                                        <option value="">Select Grade</option>
                                        <option value="A">Grade A</option>
                                        <option value="B">Grade B</option>
                                        <option value="C">Grade C</option>
                                        <option value="D">Grade D</option>
                                        <option value="E">Grade E</option>
                                    </select>
                                </div>
                            </div>

                            {/* Client Assignment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assigned Clients
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                    {clients.length === 0 ? (
                                        <p className="text-sm text-gray-500 p-2">No clients available</p>
                                    ) : (
                                        clients.map(client => (
                                            <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.assigned_client_ids.includes(client.client_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                assigned_client_ids: [...editFormData.assigned_client_ids, client.client_id]
                                                            })
                                                        } else {
                                                            setEditFormData({
                                                                ...editFormData,
                                                                assigned_client_ids: editFormData.assigned_client_ids.filter(id => id !== client.client_id)
                                                            })
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                                />
                                                <span className="text-sm text-gray-700">{client.client_name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditModal(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveFullEdit}
                                disabled={saving || !editFormData.first_name || !editFormData.last_name}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
