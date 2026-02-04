'use client'

import { useSyncStatus } from '@/hooks/useSyncStatus'
import { RefreshCw } from 'lucide-react'

export function SyncButton({ className = '' }: { className?: string }) {
  const { manualSync, isSyncing } = useSyncStatus()

  return (
    <button
      onClick={manualSync}
      disabled={isSyncing}
      className={`inline-flex items-center gap-1 px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </button>
  )
}
