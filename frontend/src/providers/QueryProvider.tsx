'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, idbPersister } from '@/lib/queryClient'

/**
 * QueryProvider wraps the app with React Query persistence
 *
 * Features:
 * - Persists query cache to IndexedDB
 * - 7-day max age for cached data
 * - Cache buster 'v1' - increment to invalidate all cached data on schema changes
 * - Automatically hydrates cache on app startup
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        buster: 'v1', // Cache buster for schema changes
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
