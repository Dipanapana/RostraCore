'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { clientsApi } from '@/services/api'
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractAlert {
  client_id: number
  client_name: string
  contract_start_date: string | null
  contract_end_date: string
  days_remaining: number
  severity: 'expired' | 'critical' | 'warning' | 'ok'
  site_count: number
  billing_rate: number | null
}

interface AlertResult {
  as_of: string
  summary: {
    expired: number
    critical: number
    warning: number
    ok: number
    no_end_date: number
    total: number
  }
  alerts: ContractAlert[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  expired: { label: 'Expired', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  critical: { label: 'Expiring ≤30d', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
  warning: { label: 'Expiring ≤90d', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  ok: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContractRenewalsPage() {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AlertResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await clientsApi.getContractAlerts()
        setResult(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load contract alerts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const r = result
  const s = r?.summary
  const filtered = r?.alerts.filter((a) => severityFilter === 'all' || a.severity === severityFilter) ?? []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading contract data…
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-violet-500" />
            Contract Renewals
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track upcoming contract expirations to ensure timely renewals and avoid service gaps.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        {r && s && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total Clients', value: s.total, color: 'text-gray-600', bg: 'bg-gray-50', icon: Building2 },
                { label: 'Expired', value: s.expired, color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
                { label: 'Within 30 Days', value: s.critical, color: 'text-orange-500', bg: 'bg-orange-50', icon: AlertTriangle },
                { label: 'Within 90 Days', value: s.warning, color: 'text-amber-500', bg: 'bg-amber-50', icon: Clock },
                { label: 'No End Date', value: s.no_end_date, color: 'text-gray-400', bg: 'bg-gray-50', icon: FileText },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className={`${bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Alert banner for expired contracts */}
            {s.expired > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {s.expired} contract{s.expired !== 1 ? 's have' : ' has'} expired
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Contact these clients immediately to negotiate renewal terms and avoid service disruption.
                  </p>
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'expired', label: 'Expired' },
                { key: 'critical', label: '≤30 Days' },
                { key: 'warning', label: '≤90 Days' },
                { key: 'ok', label: 'Active' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSeverityFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    severityFilter === key
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Contract table */}
            {filtered.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Client', 'Contract Start', 'Contract End', 'Days Left', 'Sites', 'Rate', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((alert) => {
                        const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.ok
                        const SevIcon = cfg.icon
                        return (
                          <tr key={alert.client_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link
                                href={`/clients/${alert.client_id}`}
                                className="font-medium text-violet-600 hover:underline"
                              >
                                {alert.client_name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {fmtDate(alert.contract_start_date)}
                            </td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                              {fmtDate(alert.contract_end_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {alert.days_remaining < 0 ? (
                                <span className="text-red-600 font-semibold">
                                  {Math.abs(alert.days_remaining)}d overdue
                                </span>
                              ) : (
                                <span className={`font-semibold ${
                                  alert.days_remaining <= 30 ? 'text-orange-600' :
                                  alert.days_remaining <= 90 ? 'text-amber-600' :
                                  'text-gray-700'
                                }`}>
                                  {alert.days_remaining}d
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{alert.site_count}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {alert.billing_rate ? `R${alert.billing_rate}/hr` : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                <SevIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                {severityFilter === 'all' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-500">No clients with contract end dates found.</p>
                    <p className="text-xs text-gray-400 mt-1">Set contract end dates on your clients to enable expiry tracking.</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-500">No contracts match this filter.</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
