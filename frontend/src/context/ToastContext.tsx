'use client'

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react'
import { ToastContainer, ToastItem, ToastType } from '@/components/ui/Toast'

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Global toast function for use outside React components (like in api.ts)
let globalShowToast: ToastContextType['showToast'] | null = null

export function getGlobalToast() {
  return globalShowToast
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration: number = 5000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    setToasts((prev) => {
      // Limit to 5 toasts max
      const newToasts = prev.length >= 5 ? prev.slice(1) : prev
      return [...newToasts, { id, type, title, message, duration }]
    })
  }, [])

  // Set global toast function
  React.useEffect(() => {
    globalShowToast = showToast
    return () => {
      globalShowToast = null
    }
  }, [showToast])

  const success = useCallback((title: string, message?: string) => {
    showToast('success', title, message)
  }, [showToast])

  const error = useCallback((title: string, message?: string) => {
    showToast('error', title, message, 8000) // Errors show longer
  }, [showToast])

  const warning = useCallback((title: string, message?: string) => {
    showToast('warning', title, message, 6000)
  }, [showToast])

  const info = useCallback((title: string, message?: string) => {
    showToast('info', title, message)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Export a standalone function for non-React usage
export function toast(type: ToastType, title: string, message?: string, duration?: number) {
  if (globalShowToast) {
    globalShowToast(type, title, message, duration)
  } else {
    // Fallback to console if toast not initialized
    console.warn(`[Toast ${type}] ${title}${message ? ': ' + message : ''}`)
  }
}

// Convenience exports
toast.success = (title: string, message?: string) => toast('success', title, message)
toast.error = (title: string, message?: string) => toast('error', title, message, 8000)
toast.warning = (title: string, message?: string) => toast('warning', title, message, 6000)
toast.info = (title: string, message?: string) => toast('info', title, message)
