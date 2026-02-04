import { useEffect, useSyncExternalStore } from 'react'
import { getSyncStatus, subscribeToSync, performSync, startAutoSync } from '@/lib/sync/syncManager'

export function useSyncStatus() {
  const { status, lastSyncTime } = useSyncExternalStore(
    subscribeToSync,
    getSyncStatus,
    () => ({ status: 'idle' as const, lastSyncTime: null })
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
