'use client'

import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function BillingCancelPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          {/* Info Icon */}
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was not completed. No charges have been made to your account.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              You can try again at any time from the Billing page. Your trial access continues until it expires.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/billing')}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-white text-gray-700 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Need help? Contact <a href="mailto:support@rostracore.com" className="text-blue-500 hover:underline">support@rostracore.com</a>
          </p>
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
