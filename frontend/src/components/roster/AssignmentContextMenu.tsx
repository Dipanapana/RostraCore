'use client'

import { useEffect, useRef } from 'react'

interface AssignmentContextMenuProps {
  x: number
  y: number
  employeeName: string
  onUnassign: () => void
  onViewProfile: () => void
  onClose: () => void
}

export default function AssignmentContextMenu({
  x,
  y,
  employeeName,
  onUnassign,
  onViewProfile,
  onClose,
}: AssignmentContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  // Keep menu within viewport
  const adjustedX = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 192)
  const adjustedY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 140)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-44"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider border-b border-gray-100 truncate">
        {employeeName}
      </div>
      <button
        onClick={() => { onUnassign(); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
        Unassign
      </button>
      <button
        onClick={() => { onViewProfile(); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        View Profile
      </button>
    </div>
  )
}
