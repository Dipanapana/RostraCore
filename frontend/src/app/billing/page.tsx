'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { billingApi } from '@/services/api'

interface SubscriptionStatus {
  subscription_status: string
  is_trial: boolean
  trial_days_remaining: number | null
  trial_end_date: string | null
  active_guard_count: number
  monthly_rate_per_guard: number
  estimated_monthly_cost: number
  currency: string
  payfast_active: boolean
  next_billing_date: string | null
  can_generate_rosters: boolean
}

interface PayFastCheckout {
  payment_url: string
  payment_data: Record<string, string>
  active_guard_count: number
  monthly_cost: number
}

export default function BillingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<PayFastCheckout | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await billingApi.getSubscriptionStatus()
      setStatus(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch subscription status')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      setProcessingPayment(true)
      setError(null)
      const response = await billingApi.subscribe()
      setCheckoutData(response.data)
      // Submit the form to PayFast
      setTimeout(() => {
        formRef.current?.submit()
      }, 100)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate subscription')
      setProcessingPayment(false)
    }
  }

  const handleStartTrial = async () => {
    try {
      setLoading(true)
      await billingApi.startTrial()
      await fetchStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start trial')
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (!status) return null

    const statusColors: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      past_due: 'bg-amber-50 text-amber-700 border-amber-200',
      suspended: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    const color = statusColors[status.subscription_status] || statusColors.cancelled

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
        {status.subscription_status.charAt(0).toUpperCase() + status.subscription_status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-3 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1>
              <p className="text-gray-600 mt-1">Manage your GuardianOS subscription</p>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Trial Banner */}
        {status?.is_trial && status.trial_days_remaining !== null && (
          <div className={`rounded-lg shadow p-4 mb-6 ${
            status.trial_days_remaining <= 3
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`font-semibold ${status.trial_days_remaining <= 3 ? 'text-orange-800' : 'text-blue-800'}`}>
                    {status.trial_days_remaining > 0
                      ? `${status.trial_days_remaining} days left in your free trial`
                      : 'Your free trial has expired'
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    Trial ends: {formatDate(status.trial_end_date)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={processingPayment}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {processingPayment ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          </div>
        )}

        {/* Subscription Overview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Current Plan</h3>
              <p className="text-2xl font-bold text-gray-900">Per-Guard Billing</p>
              <p className="text-gray-600 mt-1">
                {formatCurrency(status?.monthly_rate_per_guard || 29)} per guard/month
              </p>
            </div>

            {/* Active Guards */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Active Guards</h3>
              <p className="text-2xl font-bold text-gray-900">{status?.active_guard_count || 0}</p>
              <p className="text-gray-600 mt-1">Currently employed guards</p>
            </div>

            {/* Monthly Cost */}
            <div className="border border-gray-200 rounded-xl p-4 bg-green-50">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Estimated Monthly Cost</h3>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(status?.estimated_monthly_cost || 0)}
              </p>
              <p className="text-gray-600 mt-1">
                {status?.active_guard_count || 0} guards x {formatCurrency(status?.monthly_rate_per_guard || 29)}
              </p>
            </div>

            {/* Next Billing */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Next Billing Date</h3>
              <p className="text-2xl font-bold text-gray-900">
                {status?.next_billing_date ? formatDate(status.next_billing_date) : 'Not scheduled'}
              </p>
              <p className="text-gray-600 mt-1">
                {status?.payfast_active ? 'Auto-renews monthly' : 'Set up subscription to enable'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

          {status?.payfast_active ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center mr-4">
                  <span className="text-white text-xs font-bold">PayFast</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">PayFast Subscription Active</p>
                  <p className="text-sm text-gray-500">Automatically billed monthly</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                Active
              </span>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-gray-600 mb-4">No payment method on file</p>
              <button
                onClick={handleSubscribe}
                disabled={processingPayment || (status?.active_guard_count || 0) === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {processingPayment ? 'Processing...' : 'Set Up Payment'}
              </button>
              {(status?.active_guard_count || 0) === 0 && (
                <p className="text-sm text-gray-500 mt-2">Add employees first to set up billing</p>
              )}
            </div>
          )}
        </div>

        {/* Features Access */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Included</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Roster Generation', included: true },
              { name: 'Employee Management', included: true },
              { name: 'Client & Site Management', included: true },
              { name: 'Shift Scheduling', included: true },
              { name: 'Certification Tracking', included: true },
              { name: 'BCEA Compliance', included: true },
              { name: 'Export Reports (PDF/Excel)', included: true },
              { name: 'Premium Support', included: status?.subscription_status === 'active' },
            ].map((feature) => (
              <div key={feature.name} className="flex items-center">
                {feature.included ? (
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                  {feature.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Access Warning */}
        {!status?.can_generate_rosters && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-red-700">Account Restricted</p>
                <p className="text-sm text-red-600">
                  Roster generation is disabled. Please subscribe or contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hidden PayFast Form */}
        {checkoutData && (
          <form
            ref={formRef}
            action={checkoutData.payment_url}
            method="POST"
            style={{ display: 'none' }}
          >
            {Object.entries(checkoutData.payment_data).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}
      </div>
    </div>
  )
}
