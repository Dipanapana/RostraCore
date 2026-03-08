'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getApiUrl } from '@/lib/config'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Shield,
  DollarSign,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Info,
  Calculator,
} from 'lucide-react'

interface PricingConfig {
  monthly_rate_per_guard: number
  free_trial_days: number
  currency: string
  vat_percentage: number
  platform_name: string
}

interface AllSettings {
  [key: string]: string | number | boolean
}

export default function SuperadminSettingsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, token } = useAuth()
  const [pricing, setPricing] = useState<PricingConfig | null>(null)
  const [allSettings, setAllSettings] = useState<AllSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [newPrice, setNewPrice] = useState<string>('')
  const [newTrialDays, setNewTrialDays] = useState<string>('')
  const [newVat, setNewVat] = useState<string>('')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (user.role?.toLowerCase() !== 'superadmin') {
        router.push('/dashboard')
        return
      }
      fetchSettings()
    }
  }, [authLoading, user, router])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch pricing config
      const pricingRes = await fetch(`${getApiUrl()}/api/v1/system-settings/pricing`)
      if (!pricingRes.ok) throw new Error('Failed to fetch pricing config')
      const pricingData = await pricingRes.json()
      setPricing(pricingData)
      setNewPrice(pricingData.monthly_rate_per_guard.toString())
      setNewTrialDays(pricingData.free_trial_days.toString())
      setNewVat(pricingData.vat_percentage.toString())

      // Fetch all settings (requires auth)
      if (token) {
        const allRes = await fetch(`${getApiUrl()}/api/v1/system-settings/all`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (allRes.ok) {
          const allData = await allRes.json()
          setAllSettings(allData)
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err)
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    const priceValue = parseFloat(newPrice)
    if (isNaN(priceValue) || priceValue < 0) {
      setError('Please enter a valid price')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch(`${getApiUrl()}/api/v1/system-settings/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ monthly_rate_per_guard: priceValue })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update pricing')
      }

      const updatedPricing = await res.json()
      setPricing(updatedPricing)
      setSuccess('Pricing updated successfully! Changes will reflect on all pages.')
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSetting = async (key: string, value: string | number) => {
    if (!token) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch(`${getApiUrl()}/api/v1/system-settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ value })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update setting')
      }

      setSuccess(`Setting "${key}" updated successfully!`)
      fetchSettings() // Refresh all settings
    } catch (err: any) {
      setError(err.message || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading Platform Settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || user.role?.toLowerCase() !== 'superadmin') {
    return null
  }

  return (
    <DashboardLayout>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <Shield className="w-8 h-8 text-amber-500" />
                  Platform Settings
                </h1>
                <p className="text-gray-600 mt-1">
                  Configure pricing, billing, and platform-wide settings
                </p>
              </div>
            </div>
            <button
              onClick={fetchSettings}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pricing Configuration Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-500 to-orange-500">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  Per-Guard Pricing
                </h2>
                <p className="text-amber-100 text-sm mt-1">
                  Set the monthly rate charged per active guard
                </p>
              </div>

              <form onSubmit={handleUpdatePricing} className="p-6 space-y-6">
                {/* Current Price Display */}
                {pricing && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Current Price</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(pricing.monthly_rate_per_guard)}
                      <span className="text-lg font-normal text-gray-500"> /guard/month</span>
                    </p>
                  </div>
                )}

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Price (ZAR per guard per month)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="29.00"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    This affects all new invoices and the pricing displayed on the website
                  </p>
                </div>

                {/* Preview Calculator */}
                {newPrice && parseFloat(newPrice) > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4" />
                      Revenue Preview
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-blue-600">50 Guards</p>
                        <p className="font-bold text-blue-900">
                          {formatCurrency(parseFloat(newPrice) * 50)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">100 Guards</p>
                        <p className="font-bold text-blue-900">
                          {formatCurrency(parseFloat(newPrice) * 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">300 Guards</p>
                        <p className="font-bold text-blue-900">
                          {formatCurrency(parseFloat(newPrice) * 300)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={saving || !newPrice}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update Pricing
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Other Settings Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Platform Configuration
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Additional platform-wide settings
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Free Trial Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Free Trial Duration (days)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={newTrialDays}
                      onChange={(e) => setNewTrialDays(e.target.value)}
                      min="0"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                    <button
                      onClick={() => handleUpdateSetting('free_trial_days', parseInt(newTrialDays))}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* VAT Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Percentage (%)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={newVat}
                      onChange={(e) => setNewVat(e.target.value)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                    <button
                      onClick={() => handleUpdateSetting('vat_percentage', parseFloat(newVat))}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Current Settings Summary */}
                {pricing && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Current Configuration
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Name</span>
                        <span className="font-medium text-gray-900">{pricing.platform_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Currency</span>
                        <span className="font-medium text-gray-900">{pricing.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Free Trial</span>
                        <span className="font-medium text-gray-900">{pricing.free_trial_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT Rate</span>
                        <span className="font-medium text-gray-900">{pricing.vat_percentage}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Settings Debug View (for superadmin) */}
          {allSettings && Object.keys(allSettings).length > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  All System Settings (Debug View)
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(allSettings).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-4 py-2 text-sm font-mono text-gray-600">{key}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
    </DashboardLayout>
  )
}
