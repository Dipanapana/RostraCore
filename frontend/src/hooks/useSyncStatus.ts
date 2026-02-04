import { useEffect, useSyncExternalStore } from 'react'
import { getSyncStatus, subscribeToSync, performSync, startAutoSync } from '@/lib/sync/syncManager'

// Cache the server snapshot to prevent warnings
const getServerSnapshot = () => ({ status: 'idle' as const, lastSyncTime: null })

export function useSyncStatus() {
  const { status, lastSyncTime } = useSyncExternalStore(
    subscribeToSync,
    getSyncStatus,
    getServerSnapshot
  )

  // Start auto-sync on mount
  useEffect(() => {
    startAutoSync()
  }, [])

  return {
    syncStatus: status,
    lastSyncTime,
    manualSync: performSync,
    isSyncing: status === 'syncing',
    hasError: status === 'error',
  }
}
