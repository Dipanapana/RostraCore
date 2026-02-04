// Tauri database client for local SQLite operations
import { invoke } from '@tauri-apps/api/core'

export interface QueuedMutation {
  id: number
  action: string
  tableName: string
  recordId: number | null
  payload: string
  createdAt: number
  retryCount: number
  lastError?: string
}

// Check if running in Tauri context (desktop app)
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window

export const localDb = {
  // Cache operations
  cacheEmployees: async (employees: any[]): Promise<void> => {
    if (!isTauri()) return
    await invoke('cache_employees', { employees })
  },

  getEmployees: async (): Promise<any[]> => {
    if (!isTauri()) return []
    return await invoke('get_cached_employees')
  },

  cacheRosters: async (rosters: any[]): Promise<void> => {
    if (!isTauri()) return
    await invoke('cache_rosters', { rosters })
  },

  getRosters: async (startDate: string, endDate: string): Promise<any[]> => {
    if (!isTauri()) return []
    return await invoke('get_cached_rosters', { startDate, endDate })
  },

  cacheAttendance: async (records: any[]): Promise<void> => {
    if (!isTauri()) return
    await invoke('cache_attendance', { records })
  },

  getAttendance: async (employeeId?: number): Promise<any[]> => {
    if (!isTauri()) return []
    return await invoke('get_cached_attendance', { employeeId })
  },

  // Offline queue operations
  queueMutation: async (
    action: string,
    tableName: string,
    recordId: number | null,
    payload: any
  ): Promise<number> => {
    if (!isTauri()) return -1
    const payloadJson = JSON.stringify(payload)
    return await invoke('queue_mutation', {
      action,
      tableName,
      recordId,
      payload: payloadJson,
    })
  },

  getQueue: async (): Promise<QueuedMutation[]> => {
    if (!isTauri()) return []
    const queue = await invoke<any[]>('get_offline_queue')
    return queue.map(item => ({
      id: item.id,
      action: item.action,
      tableName: item.table_name,
      recordId: item.record_id,
      payload: item.payload,
      createdAt: item.created_at,
      retryCount: item.retry_count,
      lastError: item.last_error,
    }))
  },

  removeFromQueue: async (id: number): Promise<void> => {
    if (!isTauri()) return
    await invoke('remove_from_queue', { id })
  },

  incrementRetryCount: async (id: number, error?: string): Promise<void> => {
    if (!isTauri()) return
    await invoke('increment_retry_count', { id, error })
  },
}
