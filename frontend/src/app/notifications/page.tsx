'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell,
  Calendar,
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCheck,
  Inbox,
  Shield,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { notificationsApi } from '@/services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  notification_id: number
  title: string
  message: string
  notification_type: string
  is_read: boolean
  read_at: string | null
  reference_type: string | null
  reference_id: number | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('shift') || t.includes('assignment') || t.includes('schedule')) return Calendar
  if (t.includes('leave')) return CalendarClock
  if (t.includes('incident') || t.includes('alert')) return AlertTriangle
  if (t.includes('payroll') || t.includes('pay') || t.includes('salary')) return Banknote
  if (t.includes('psira') || t.includes('cert') || t.includes('compliance')) return Shield
  return Bell
}

function getTypeColor(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('shift') || t.includes('assignment') || t.includes('schedule'))
    return 'text-blue-500 bg-blue-50'
  if (t.includes('leave'))
    return 'text-amber-500 bg-amber-50'
  if (t.includes('incident') || t.includes('alert'))
    return 'text-red-500 bg-red-50'
  if (t.includes('payroll') || t.includes('pay') || t.includes('salary'))
    return 'text-emerald-500 bg-emerald-50'
  if (t.includes('psira') || t.includes('cert') || t.includes('compliance'))
    return 'text-violet-500 bg-violet-50'
  return 'text-gray-500 bg-gray-100'
}

function fmtAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Notification card
// ---------------------------------------------------------------------------

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (id: number) => void
}) {
  const Icon = getTypeIcon(notification.notification_type)
  const colorClass = getTypeColor(notification.notification_type)
  const isUnread = !notification.is_read

  return (
    <div
      className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
        isUnread
          ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200'
          : 'bg-gray-50 border-gray-100 hover:bg-white'
      }`}
      onClick={() => isUnread && onMarkRead(notification.notification_id)}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 pt-0.5">
        {isUnread && (
          <span className="block w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-1" />
        )}
        {!isUnread && <span className="block w-2 h-2 mr-1" />}
      </div>

      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </p>
            <p className={`text-xs mt-0.5 ${isUnread ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatType(notification.notification_type)}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
            {fmtAgo(notification.created_at)}
          </span>
        </div>
        <p className={`text-sm mt-1.5 leading-relaxed ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
          {notification.message}
        </p>
        {isUnread && (
          <p className="text-xs text-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to mark as read
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.getAll({ limit: 100 })
      setNotifications(res.data.notifications ?? [])
    } catch {
      // Silent — empty state shows if API unavailable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    )
    try {
      await notificationsApi.markRead(id)
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: false, read_at: null } : n))
      )
    }
  }

  const handleMarkAllRead = async () => {
    const now = new Date().toISOString()
    setMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: now })))
    try {
      await notificationsApi.markAllRead()
    } catch {
      await load() // Revert by reloading on error
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You\'re all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                filter === tab
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {tab === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'unread'
                ? "You've read everything — great job staying on top of things."
                : 'Notifications about shifts, leave requests, and incidents will appear here.'}
            </p>
            {filter === 'unread' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <NotificationCard
                key={n.notification_id}
                notification={n}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
