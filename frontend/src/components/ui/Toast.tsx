'use client'

import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

const toastStyles = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    icon: 'text-emerald-500',
    title: 'text-emerald-800 dark:text-emerald-300',
    message: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-300',
    message: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    icon: 'text-amber-500',
    title: 'text-amber-800 dark:text-amber-300',
    message: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-300',
    message: 'text-blue-600 dark:text-blue-400',
  },
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const styles = toastStyles[type]
  const Icon = toastIcons[type]

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Wait for animation
  }

  return (
    <div
      className={`
        w-full max-w-sm pointer-events-auto overflow-hidden rounded-xl border shadow-lg
        ${styles.bg} ${styles.border}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${styles.title}`}>
              {title}
            </p>
            {message && (
              <p className={`mt-1 text-sm ${styles.message}`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0 p-1 rounded-lg transition-colors
              ${styles.message} hover:bg-black/5 dark:hover:bg-white/5
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div className="h-1 bg-black/5 dark:bg-white/5">
          <div
            className={`h-full ${styles.icon.replace('text-', 'bg-')} transition-all ease-linear`}
            style={{
              width: isVisible && !isLeaving ? '0%' : '100%',
              transitionDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  )
}

// Toast Container for rendering all toasts
export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  )
}
