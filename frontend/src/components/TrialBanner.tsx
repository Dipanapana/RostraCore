'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { billingApi } from '@/services/api'

interface SubscriptionStatus {
  subscription_status: string
  is_trial: boolean
  trial_days_remaining: number | null
  can_generate_rosters: boolean
}

// Pages that don't require authentication
const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password']

export default function TrialBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Don't fetch on public pages
    if (publicPaths.some(path => pathname === path || pathname?.startsWith(path + '/'))) {
      setLoading(false)
      return
    }

    // Check if user has a token (is logged in)
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    // Check if banner was dismissed in this session
    const wasDismissed = sessionStorage.getItem('trial_banner_dismissed')
    if (wasDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    fetchStatus()
  }, [pathname])

  const fetchStatus = async () => {
    try {
      const response = await billingApi.getSubscriptionStatus()
      setStatus(response.data)
    } catch (err) {
      // Silently fail - don't show banner if we can't get status
      console.error('Failed to fetch subscription status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('trial_banner_dismissed', 'true')
    setDismissed(true)
  }

  // Don't show if loading, dismissed, or no status
  if (loading || dismissed || !status) return null

  // Don't show if not on trial
  if (!status.is_trial) return null

  // Don't show if trial has more than 5 days
  if (status.trial_days_remaining !== null && status.trial_days_remaining > 5) return null

  // Determine banner style based on urgency
  const isUrgent = status.trial_days_remaining !== null && status.trial_days_remaining <= 3
  const isExpired = status.trial_days_remaining !== null && status.trial_days_remaining <= 0

  const bannerClass = isExpired
    ? 'bg-red-600 text-white'
    : isUrgent
    ? 'bg-orange-500 text-white'
    : 'bg-blue-500 text-white'

  const message = isExpired
    ? 'Your free trial has expired. Subscribe now to continue using GuardianOS.'
    : `${status.trial_days_remaining} day${status.trial_days_remaining !== 1 ? 's' : ''} left in your free trial.`

  return (
    <div className={`${bannerClass} px-4 py-2 flex items-center justify-between`}>
      <div className="flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/billing"
          className={`text-sm font-semibold px-3 py-1 rounded ${
            isExpired
              ? 'bg-white text-red-600 hover:bg-gray-100'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {isExpired ? 'Subscribe Now' : 'View Plans'}
        </Link>
        {!isExpired && (
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
