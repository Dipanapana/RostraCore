'use client'

import { useState, useEffect, useCallback } from 'react'
import { complianceCalendarApi } from '@/services/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { CalendarRange, AlertTriangle, AlertCircle, Info, Award, FileText, GraduationCap, Calendar } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  cert_expiry: { label: 'Certification', color: 'border-red-400 bg-red-50', icon: Award },
  contract_expiry: { label: 'Contract', color: 'border-orange-400 bg-orange-50', icon: FileText },
  training_due: { label: 'Training', color: 'border-blue-400 bg-blue-50', icon: GraduationCap },
  leave: { label: 'Leave', color: 'border-green-400 bg-green-50', icon: Calendar },
}

function severityIcon(s: string) {
  if (s === 'critical') return <AlertCircle className="w-4 h-4 text-red-600" />
  if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-600" />
  return <Info className="w-4 h-4 text-blue-500" />
}

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [daysAhead, setDaysAhead] = useState(90)
  const [filterType, setFilterType] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [evRes, sumRes] = await Promise.all([
        complianceCalendarApi.events(daysAhead),
        complianceCalendarApi.summary(),
      ])
      setEvents(evRes.data.events || [])
      setSummary(sumRes.data)
    } catch { /* ignore */ }
  }, [daysAhead])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const filtered = filterType ? events.filter(e => e.type === filterType) : events

  // Group events by date
  const grouped: Record<string, any[]> = {}
  for (const e of filtered) {
    const d = e.date || 'Unknown'
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(e)
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarRange className="w-7 h-7 text-purple-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Compliance Calendar</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
            <div className="text-sm text-red-600">Expired Certs</div>
            <div className="text-2xl font-bold text-red-600">{summary.expired_certs}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-yellow-600">Certs Expiring (30d)</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.expiring_certs_30d}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-orange-600">Contracts Expiring (90d)</div>
            <div className="text-2xl font-bold text-orange-600">{summary.expiring_contracts_90d}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-green-600">Upcoming Leave (30d)</div>
            <div className="text-2xl font-bold text-green-600">{summary.upcoming_leave_30d}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-blue-600">Scheduled Training</div>
            <div className="text-2xl font-bold text-blue-600">{summary.scheduled_training}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={daysAhead} onChange={e => setDaysAhead(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
          <option value={180}>Next 180 days</option>
          <option value={365}>Next year</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Event Types</option>
          <option value="cert_expiry">Certifications</option>
          <option value="contract_expiry">Contracts</option>
          <option value="training_due">Training</option>
          <option value="leave">Leave</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} events</span>
      </div>

      {/* Events Timeline */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          No compliance events found for the selected period
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateStr, dayEvents]) => (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </h3>
                <span className="text-xs text-gray-400">({dayEvents.length} event{dayEvents.length > 1 ? 's' : ''})</span>
              </div>
              <div className="space-y-2 ml-4">
                {dayEvents.map((ev: any, i: number) => {
                  const cfg = TYPE_CONFIG[ev.type] || { label: ev.type, color: 'border-gray-300 bg-gray-50', icon: Info }
                  const Icon = cfg.icon
                  return (
                    <div key={`${dateStr}-${i}`} className={`flex items-start gap-3 border-l-4 rounded-lg p-3 ${cfg.color}`}>
                      <div className="flex items-center gap-2 shrink-0">
                        {severityIcon(ev.severity)}
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{ev.title}</div>
                        {ev.end_date && (
                          <div className="text-xs text-gray-500">Until {ev.end_date}</div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-600 shrink-0">
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
