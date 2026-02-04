'use client'

import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { WifiOff } from 'lucide-react'

interface OnlineOnlyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  message?: string
}

export function OnlineOnlyWrapper({
  children,
  fallback,
  message = 'This feature requires an internet connection'
}: OnlineOnlyWrapperProps) {
  const { isOffline } = useOfflineStatus()

  if (isOffline) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <WifiOff className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-center">
          {message}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Connect to the internet to access this feature.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
