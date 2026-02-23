'use client'

import { useState, useEffect, useCallback } from 'react'
import { certAlertsApi } from '@/services/api'
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Shield,
  Users,
  Award,
} from 'lucide-react'

interface CertAlert {
  cert_id: number
  employee_id: number
  employee_name: string
  cert_type: string
  cert_number: string | null
  issuing_authority: string | null
  psira_grade: string | null
  issue_date: string | null
  expiry_date: string | null
  verified: boolean
  days_until_expiry: number | null
  status: string  // expired, critical, warning, upcoming, ok
}

interface Dashboard {
  total_certs: number
  expired: number
  critical: number
  warning: number
  upcoming: number
  ok: number
  by_type: { type: string; total: number; expired: number; expiring_soon: number }[]
  top_at_risk: { employee_id: number; employee_name: string; issues: number }[]
}

export default function CertAlertsPage() {
  const [tab, setTab] = useState<'alerts' | 'dashboard'>('alerts')

  const [alerts, setAlerts] = useState<CertAlert[]>([])
  const [alertTotal, setAlertTotal] = useState(0)
  const [daysFilter, setDaysFilter] = useState(90)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await certAlertsApi.expiring({ days: daysFilter })
      setAlerts(res.data.items)
      setAlertTotal(res.data.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [daysFilter])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await certAlertsApi.dashboard()
      setDashboard(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'alerts') fetchAlerts()
    else fetchDashboard()
  }, [tab, fetchAlerts, fetchDashboard])

  const statusColor = (s: string) => {
    switch (s) {
      case 'expired': return 'bg-red-100 text-red-700'
      case 'critical': return 'bg-orange-100 text-orange-700'
      case 'warning': return 'bg-amber-50 text-amber-700'
      case 'upcoming': return 'bg-blue-100 text-blue-700'
      default: return 'bg-emerald-50 text-emerald-700'
    }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'expired': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'critical': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'warning': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <CheckCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const daysLabel = (days: number | null) => {
    if (days === null) return '-'
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    return `${days}d left`
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Certification Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track expiring and expired certifications across your workforce
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'alerts', label: 'Expiring Certs', icon: AlertTriangle },
            { key: 'dashboard', label: 'Compliance Dashboard', icon: Shield },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── ALERTS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
              <option value={180}>Next 6 months</option>
              <option value={365}>Next year</option>
            </select>
            <span className="text-sm text-gray-500">
              {alertTotal} certification{alertTotal !== 1 ? 's' : ''} expiring/expired
            </span>
          </div>

          {/* Quick KPIs from current results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-gray-500">Expired</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {alerts.filter((a) => a.status === 'expired').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-gray-500">Critical (7d)</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {alerts.filter((a) => a.status === 'critical').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <p className="text-xs text-gray-500">Warning (30d)</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {alerts.filter((a) => a.status === 'warning').length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-gray-500">Upcoming (90d)</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {alerts.filter((a) => a.status === 'upcoming').length}
              </p>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Employee</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Certification</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Grade</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Cert #</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Expiry Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Time Left</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Loading...' : 'No expiring certifications found'}
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => (
                    <tr key={a.cert_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(a.status)}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                            {a.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{a.employee_name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.cert_type}</td>
                      <td className="px-4 py-3 text-gray-500">{a.psira_grade || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.cert_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.expiry_date || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          a.status === 'expired' ? 'text-red-600' :
                          a.status === 'critical' ? 'text-orange-600' :
                          a.status === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {daysLabel(a.days_until_expiry)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Compliance score bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Compliance Overview</h3>
              <span className="text-sm text-gray-500">{dashboard.total_certs} total certifications</span>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
              {dashboard.ok > 0 && (
                <div className="bg-green-500" style={{ width: `${(dashboard.ok / Math.max(dashboard.total_certs, 1)) * 100}%` }} title={`${dashboard.ok} OK`} />
              )}
              {dashboard.upcoming > 0 && (
                <div className="bg-blue-400" style={{ width: `${(dashboard.upcoming / Math.max(dashboard.total_certs, 1)) * 100}%` }} title={`${dashboard.upcoming} upcoming`} />
              )}
              {dashboard.warning > 0 && (
                <div className="bg-yellow-400" style={{ width: `${(dashboard.warning / Math.max(dashboard.total_certs, 1)) * 100}%` }} title={`${dashboard.warning} warning`} />
              )}
              {dashboard.critical > 0 && (
                <div className="bg-orange-500" style={{ width: `${(dashboard.critical / Math.max(dashboard.total_certs, 1)) * 100}%` }} title={`${dashboard.critical} critical`} />
              )}
              {dashboard.expired > 0 && (
                <div className="bg-red-500" style={{ width: `${(dashboard.expired / Math.max(dashboard.total_certs, 1)) * 100}%` }} title={`${dashboard.expired} expired`} />
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> OK: {dashboard.ok}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Upcoming: {dashboard.upcoming}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Warning: {dashboard.warning}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Critical: {dashboard.critical}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Expired: {dashboard.expired}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By Certification Type</h3>
              {dashboard.by_type.length === 0 ? (
                <p className="text-gray-400 text-sm">No data</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.by_type.map((t) => (
                    <div key={t.type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{t.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{t.total} total</span>
                        {t.expired > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{t.expired} expired</span>}
                        {t.expiring_soon > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{t.expiring_soon} expiring</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* At-Risk Employees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">At-Risk Employees</h3>
              {dashboard.top_at_risk.length === 0 ? (
                <p className="text-gray-400 text-sm">All employees compliant</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_at_risk.map((e, idx) => (
                    <div key={e.employee_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700">{e.employee_name}</span>
                      </div>
                      <span className="text-sm font-medium text-red-600">{e.issues} issue{e.issues !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && !dashboard && (
        <div className="text-center py-12 text-gray-400">{loading ? 'Loading...' : 'No data'}</div>
      )}
    </div>
  )
}
