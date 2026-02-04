import { localDb } from '@/lib/db/client'
import { rosterApi, shiftsApi } from '@/services/api'

export interface QueuedMutation {
  id?: number
  action: 'UPDATE_ROSTER' | 'APPROVE_ATTENDANCE' | 'REASSIGN_SHIFT'
  tableName: string
  recordId: number | null
  payload: any
  createdAt?: number
  retryCount?: number
}

export async function queueOfflineMutation(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount'>) {
  const id = await localDb.queueMutation(
    mutation.action,
    mutation.tableName,
    mutation.recordId,
    mutation.payload
  )
  console.log(`[Offline] Queued mutation: ${mutation.action} for ${mutation.tableName}`)
  return id
}

export async function replayQueue(): Promise<{ success: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: 0, failed: 0 }
  }

  const queue = await localDb.getQueue()
  let success = 0
  let failed = 0

  for (const item of queue) {
    try {
      const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload

      switch (item.action) {
        case 'UPDATE_ROSTER':
          await rosterApi.confirm(payload)
          break
        case 'REASSIGN_SHIFT':
          await shiftsApi.assignEmployee(payload.shiftId, payload.employeeId)
          break
        case 'APPROVE_ATTENDANCE':
          // Add attendance approval API call when endpoint exists
          console.log('[Sync] Attendance approval:', payload)
          break
        default:
          console.warn(`Unknown action: ${item.action}`)
      }

      await localDb.removeFromQueue(item.id)
      success++
      console.log(`[Sync] Replayed: ${item.action} #${item.recordId}`)
    } catch (error) {
      failed++
      console.error(`[Sync] Failed: ${item.action}`, error)
      // Increment retry count for later attempts
      const errorMessage = error instanceof Error ? error.message : String(error)
      await localDb.incrementRetryCount(item.id, errorMessage)
    }
  }

  return { success, failed }
}
