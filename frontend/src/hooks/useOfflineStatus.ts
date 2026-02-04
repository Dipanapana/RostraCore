import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  // Guard against SSR where window is undefined
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  // Guard against SSR where navigator is undefined
  if (typeof navigator === 'undefined') {
    return true
  }
  return navigator.onLine
}

function getServerSnapshot() {
  return true // SSR always assumes online
}

export function useOfflineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    isOnline,
    isOffline: !isOnline,
  }
}
