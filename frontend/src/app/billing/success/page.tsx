'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { billingApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function BillingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(8)
  const [billingInfo, setBillingInfo] = useState<any>(null)

  useEffect(() => {
    // Fetch latest billing info
    billingApi.getSubscriptionStatus()
      .then(res => setBillingInfo(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/billing')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful</h1>
          <p className="text-gray-600 mb-6">
            Your subscription has been activated. Thank you for choosing GuardianOS.
          </p>

          {billingInfo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Active Guards</span>
                <span className="font-medium text-gray-900">{billingInfo.active_guard_count}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Monthly Cost</span>
                <span className="font-medium text-gray-900">
                  R{billingInfo.estimated_monthly_cost?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  {billingInfo.subscription_status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/billing')}
              className="w-full bg-white text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              View Billing Details
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Redirecting to billing in {countdown}s...
          </p>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
