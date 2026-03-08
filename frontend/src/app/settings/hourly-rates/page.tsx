'use client'

import { useEffect, useState } from 'react'
import { organizationSettingsApi } from '@/services/api'
import {
    DollarSign,
    Save,
    RefreshCw,
    Sparkles,
    AlertTriangle,
    CheckCircle,
    Users,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface HourlyRate {
    psira_grade: string
    role: string
    default_hourly_rate: number
}

const PSIRA_GRADES = ['A', 'B', 'C', 'D', 'E']
const ROLES = ['armed', 'unarmed', 'supervisor']

const ROLE_LABELS: Record<string, string> = {
    armed: 'Armed',
    unarmed: 'Unarmed',
    supervisor: 'Supervisor',
}

export default function HourlyRatesSettings() {
    const [rates, setRates] = useState<HourlyRate[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [hasChanges, setHasChanges] = useState(false)

    const fetchRates = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await organizationSettingsApi.getHourlyRates()
            setRates(response.data.rates || [])
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load hourly rates')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRates()
    }, [])

    const getRate = (grade: string, role: string): number => {
        const rate = rates.find(r => r.psira_grade === grade && r.role === role)
        return rate?.default_hourly_rate || 0
    }

    const updateRate = (grade: string, role: string, value: number) => {
        setHasChanges(true)
        setSuccess(null)
        setRates(prev => {
            const existing = prev.find(r => r.psira_grade === grade && r.role === role)
            if (existing) {
                return prev.map(r =>
                    r.psira_grade === grade && r.role === role
                        ? { ...r, default_hourly_rate: value }
                        : r
                )
            } else {
                return [...prev, { psira_grade: grade, role, default_hourly_rate: value }]
            }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            // Filter out zero rates
            const nonZeroRates = rates.filter(r => r.default_hourly_rate > 0)
            await organizationSettingsApi.updateHourlyRates(nonZeroRates)
            setSuccess('Hourly rates saved successfully')
            setHasChanges(false)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save hourly rates')
        } finally {
            setSaving(false)
        }
    }

    const handleSeedDefaults = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            const response = await organizationSettingsApi.seedDefaultRates()
            if (response.data.seeded) {
                setSuccess('Seeded default hourly rates based on SA industry standards')
                await fetchRates()
            } else {
                setError(response.data.message)
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to seed default rates')
        } finally {
            setSaving(false)
        }
    }

    const handleApplyToEmployees = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            const response = await organizationSettingsApi.applyDefaultRates({
                overwrite_existing: false
            })
            setSuccess(`Applied default rates to ${response.data.updated_count} guards (${response.data.skipped_count} skipped)`)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to apply rates to employees')
        } finally {
            setSaving(false)
        }
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

    return (
        <DashboardLayout>
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Default Hourly Rates
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Configure default hourly rates by PSIRA grade and role
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchRates}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{success}</p>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <Sparkles className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Seed Industry Defaults
                            </h3>
                            <p className="text-sm text-gray-600">
                                Populate with SA industry-standard rates
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSeedDefaults}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                        Seed Default Rates
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <Users className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Apply to Guards
                            </h3>
                            <p className="text-sm text-gray-600">
                                Apply rates to guards without hourly rate set
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleApplyToEmployees}
                        disabled={saving || rates.length === 0}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Apply to Missing Rates
                    </button>
                </div>
            </div>

            {/* Rates Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        <h2 className="font-semibold text-gray-900">
                            Rate Configuration
                        </h2>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        Enter hourly rates in Rands (ZAR) for each PSIRA grade and role combination
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    PSIRA Grade
                                </th>
                                {ROLES.map(role => (
                                    <th key={role} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {ROLE_LABELS[role]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {PSIRA_GRADES.map(grade => (
                                <tr key={grade} className="hover:bg-gray-50">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                                                grade === 'A' ? 'bg-emerald-500' :
                                                grade === 'B' ? 'bg-blue-500' :
                                                grade === 'C' ? 'bg-amber-500' :
                                                grade === 'D' ? 'bg-orange-500' :
                                                'bg-gray-500'
                                            }`}>
                                                {grade}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                {grade === 'A' ? '(Highest)' :
                                                 grade === 'E' ? '(Entry)' : ''}
                                            </span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => (
                                        <td key={`${grade}-${role}`} className="px-4 py-4">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                    R
                                                </span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={getRate(grade, role) || ''}
                                                    onChange={(e) => updateRate(grade, role, parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <h4 className="font-medium text-blue-500 mb-2">How it works</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>Set default hourly rates for each PSIRA grade (A-E) and role combination.</li>
                    <li>When adding new guards, the system can auto-populate their hourly rate based on their PSIRA grade and role.</li>
                    <li>Use &quot;Apply to Missing Rates&quot; to bulk-update guards who don&apos;t have hourly rates set.</li>
                    <li>Rates are in South African Rand (ZAR) per hour.</li>
                </ul>
            </div>
        </div>
        </DashboardLayout>
    )
}
