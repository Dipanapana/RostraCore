import { useQuery } from '@tanstack/react-query'
import { localDb } from '@/lib/db/client'
import { employeesApi, rosterApi } from '@/services/api'

export function useEmployees(params?: { status?: string }) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      try {
        // Try API first
        const response = await employeesApi.getAll(params)

        // Cache successful response to SQLite
        await localDb.cacheEmployees(response.data)

        return response.data
      } catch (error) {
        // If offline, load from cache
        if (!navigator.onLine) {
          console.log('[Offline] Loading employees from SQLite cache')
          const cached = await localDb.getEmployees()
          if (cached.length > 0) {
            return cached.map(e => e.data_json ? JSON.parse(e.data_json) : e)
          }
        }
        throw error
      }
    },
    networkMode: 'offlineFirst',
  })
}

export function useRosters(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['rosters', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await rosterApi.preview({ start_date: startDate, end_date: endDate })
        await localDb.cacheRosters(response.data)
        return response.data
      } catch (error) {
        if (!navigator.onLine) {
          console.log('[Offline] Loading rosters from SQLite cache')
          const cached = await localDb.getRosters(startDate, endDate)
          if (cached.length > 0) {
            return cached.map(r => r.data_json ? JSON.parse(r.data_json) : r)
          }
        }
        throw error
      }
    },
    networkMode: 'offlineFirst',
  })
}
