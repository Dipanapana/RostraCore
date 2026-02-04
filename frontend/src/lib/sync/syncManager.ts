import { replayQueue } from './offlineQueue'

type SyncStatus = 'idle' | 'syncing' | 'error'

let syncStatus: SyncStatus = 'idle'
let lastSyncTime: Date | null = null
let listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach(fn => fn())
}

export async function performSync(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  if (syncStatus === 'syncing') {
    return false
  }

  syncStatus = 'syncing'
  notifyListeners()

  try {
    const result = await replayQueue()
    lastSyncTime = new Date()
    syncStatus = result.failed > 0 ? 'error' : 'idle'
    console.log(`[Sync] Complete: ${result.success} success, ${result.failed} failed`)
    return true
  } catch (error) {
    syncStatus = 'error'
    console.error('[Sync] Error:', error)
    return false
  } finally {
    notifyListeners()
  }
}

export function getSyncStatus() {
  return { status: syncStatus, lastSyncTime }
}

export function subscribeToSync(callback: () => void) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

// Auto-sync setup
let autoSyncInterval: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs = 5 * 60 * 1000) { // 5 minutes
  if (typeof window === 'undefined') return
  if (autoSyncInterval) return

  autoSyncInterval = setInterval(() => {
    if (navigator.onLine && syncStatus === 'idle') {
      performSync()
    }
  }, intervalMs)

  // Sync when coming back online
  window.addEventListener('online', performSync)
}

export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', performSync)
  }
}
