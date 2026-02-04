'use client'

import { useOfflineStatus } from '@/hooks/useOfflineStatus'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { SyncButton } from './SyncButton'

export function OfflineStatusBanner() {
  const { isOnline, isOffline } = useOfflineStatus()
  const { syncStatus, lastSyncTime, hasError } = useSyncStatus()

  // Don't show banner when online and idle
  if (isOnline && syncStatus === 'idle' && !hasError) {
    return null
  }

  const getBannerStyle = () => {
    if (isOffline) return 'bg-amber-500 text-white'
    if (syncStatus === 'syncing') return 'bg-blue-500 text-white'
    if (hasError) return 'bg-red-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const getMessage = () => {
    if (isOffline) return 'Offline Mode - Changes will sync when connection returns'
    if (syncStatus === 'syncing') return 'Syncing changes to server...'
    if (hasError) return 'Sync failed - Some changes could not be saved'
    return ''
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm flex items-center justify-center gap-4 ${getBannerStyle()}`}>
      <span className="font-medium">{getMessage()}</span>

      {isOnline && (hasError || syncStatus === 'idle') && (
        <SyncButton />
      )}

      {lastSyncTime && (
        <span className="text-xs opacity-75">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
