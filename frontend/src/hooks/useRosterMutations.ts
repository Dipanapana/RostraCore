import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shiftsApi } from '@/services/api'
import { queueOfflineMutation } from '@/lib/sync/offlineQueue'

export function useReassignShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shiftId, employeeId }: { shiftId: number; employeeId: number }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Queue for later
        await queueOfflineMutation({
          action: 'REASSIGN_SHIFT',
          tableName: 'shifts',
          recordId: shiftId,
          payload: { shiftId, employeeId },
        })

        return { queued: true, shiftId, employeeId }
      }

      // Online - call API directly
      return await shiftsApi.assignEmployee(shiftId, employeeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] })
    },
    onMutate: async ({ shiftId, employeeId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['rosters'] })
      const previous = queryClient.getQueryData(['rosters'])
      // Optimistic update logic here if needed
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['rosters'], context.previous)
      }
    },
  })
}

export function useApproveAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ attendanceId, approved }: { attendanceId: number; approved: boolean }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await queueOfflineMutation({
          action: 'APPROVE_ATTENDANCE',
          tableName: 'attendance',
          recordId: attendanceId,
          payload: { attendanceId, approved },
        })

        return { queued: true, attendanceId, approved }
      }

      // Online - call API directly (add endpoint when available)
      // return await attendanceApi.approve(attendanceId, approved)
      return { attendanceId, approved }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}
