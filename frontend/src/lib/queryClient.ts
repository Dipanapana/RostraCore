import { QueryClient } from '@tanstack/react-query'
import { get, set, del } from 'idb-keyval'
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

/**
 * IndexedDB persister for React Query cache
 * Stores query cache in IndexedDB for offline persistence across app restarts
 */
export const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set('queryCache', client)
  },
  restoreClient: async () => {
    return await get<PersistedClient>('queryCache')
  },
  removeClient: async () => {
    await del('queryCache')
  },
}

/**
 * QueryClient configured for offline-first behavior
 *
 * Features:
 * - 7-day cache retention (gcTime)
 * - 5-minute freshness window (staleTime)
 * - offlineFirst network mode - returns cached data immediately
 * - Mutations pause when offline, resume when online
 * - Smart retry logic (skips retries when offline)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
      staleTime: 1000 * 60 * 5, // 5 minutes before stale
      networkMode: 'offlineFirst', // Return cached data first
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false
        // Retry up to 3 times if online
        return failureCount < 3
      },
    },
    mutations: {
      networkMode: 'online', // Pause mutations when offline
      retry: false,
    },
  },
})
