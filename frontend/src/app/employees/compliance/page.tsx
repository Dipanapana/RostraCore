'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { certificationsApi } from '@/services/api'
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Crosshair,
  FileCheck,
  Loader2,
} from 'lucide-react'

interface ExpiryAlert {
  cert_id: number
  employee_id: number
  employee_name: string
  cert_type: string
  psira_grade: string | null
  firearm_type: string | null
  expiry_date: string
  days_remaining: number
  severity: 'expired' | 'critical' | 'warning' | 'info'
  verified: boolean
}

interface ComplianceData {
  total_active_employees: number
  psira_summary: {
    total_psira_certs: number
    valid: number
    expired: number
    expiring_30_days: number
    expiring_90_days: number
    grade_distribution: Record<string, number>
  }
  firearm_summary: {
    total_firearm_certs: number
    valid: number
    expired: number
    expiring_30_days: number
    armed_employees: number
    armed_with_valid_cert: number
    armed_without_cert: number
  }
  certification_summary: {
    total_certs: number
    valid: number
    expired: number
    verified: number
    unverified: number
    employees_with_certs: number
    employees_without_certs: number
    compliance_rate: number
  }
  expiry_alerts: ExpiryAlert[]
  employees_without_certs: Array<{ employee_id: number; name: string; role: string }>
}

const SEVERITY_STYLES: Record<string, string> = {
  expired: 'bg-red-100 text-red-700',
  critical: 'bg-orange-100 text-orange-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-blue-600',
  B: 'bg-blue-600',
  C: 'bg-green-600',
  D: 'bg-amber-500',
  E: 'bg-gray-500',
}

export default function ComplianceDashboardPage() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await certificationsApi.getComplianceDashboard()
        setData(res.data)
      } catch (err) {
        console.error('Failed to load compliance data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Loading compliance data...
        </div>
      </DashboardLayout>
    )
  }

  if (!data || data.total_active_employees === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
          <Shield className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No active employees found</p>
          <p className="text-sm mt-1">Add employees to see compliance metrics.</p>
        </div>
      </DashboardLayout>
    )
  }

  const ps = data.psira_summary
  const fs = data.firearm_summary
  const cs = data.certification_summary
  const alerts = filterSeverity === 'all'
    ? data.expiry_alerts
    : data.expiry_alerts.filter((a) => a.severity === filterSeverity)

  const expiredCount = data.expiry_alerts.filter((a) => a.severity === 'expired').length
  const criticalCount = data.expiry_alerts.filter((a) => a.severity === 'critical').length

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Workforce Compliance
          </h1>
          <p className="text-gray-500 mt-1">
            PSIRA, firearm competency, and certification status across {data.total_active_employees} active employees
          </p>
        </div>

        {/* Critical alert banner */}
        {(expiredCount > 0 || criticalCount > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">Compliance Action Required</p>
              <p className="text-sm text-red-600 mt-0.5">
                {expiredCount > 0 && `${expiredCount} expired certification${expiredCount > 1 ? 's' : ''}`}
                {expiredCount > 0 && criticalCount > 0 && ' and '}
                {criticalCount > 0 && `${criticalCount} expiring within 14 days`}
                {' '}require immediate attention.
              </p>
            </div>
          </div>
        )}

        {/* Top KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compliance Rate</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{cs.compliance_rate}%</p>
            <p className="text-xs text-gray-400 mt-1">
              {cs.employees_with_certs} of {data.total_active_employees} employees have certs
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">PSIRA Valid</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{ps.valid}</p>
            <p className="text-xs text-gray-400 mt-1">
              {ps.expired > 0 ? <span className="text-red-500">{ps.expired} expired</span> : 'All current'} / {ps.total_psira_certs} total
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Firearm Certs</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{fs.valid}</p>
            <p className="text-xs text-gray-400 mt-1">
              {fs.armed_without_cert > 0 ? (
                <span className="text-red-500">{fs.armed_without_cert} armed without cert</span>
              ) : (
                `${fs.armed_employees} armed employees covered`
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expiring Soon</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{ps.expiring_30_days + fs.expiring_30_days}</p>
            <p className="text-xs text-gray-400 mt-1">Within next 30 days</p>
          </div>
        </div>

        {/* Two column: PSIRA grade dist + Firearm compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PSIRA Grade Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              PSIRA Grade Distribution
            </h2>
            {Object.keys(ps.grade_distribution).length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No PSIRA certifications recorded</p>
            ) : (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D', 'E'].filter((g) => ps.grade_distribution[g]).map((grade) => {
                  const count = ps.grade_distribution[grade]
                  const maxVal = Math.max(...Object.values(ps.grade_distribution))
                  const pct = maxVal > 0 ? (count / maxVal) * 100 : 0
                  return (
                    <div key={grade}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">Grade {grade}</span>
                        <span className="text-gray-500">{count} guard{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`${GRADE_COLORS[grade] || 'bg-gray-500'} h-2.5 rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Firearm Compliance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-red-500" />
              Firearm Competency Status
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{fs.valid}</p>
                  <p className="text-xs text-green-700">Valid Certs</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{fs.expired}</p>
                  <p className="text-xs text-red-700">Expired</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Armed Role Coverage</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Armed employees with valid cert</span>
                      <span className="font-semibold text-gray-800">
                        {fs.armed_with_valid_cert} / {fs.armed_employees}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${fs.armed_without_cert > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: fs.armed_employees > 0 ? `${(fs.armed_with_valid_cert / fs.armed_employees) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
                {fs.armed_without_cert > 0 && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {fs.armed_without_cert} armed employee{fs.armed_without_cert > 1 ? 's' : ''} without valid firearm certification
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-500" />
            Certification Verification Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-900">{cs.total_certs}</p>
              <p className="text-xs text-gray-500">Total Certs</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{cs.valid}</p>
              <p className="text-xs text-green-700">Valid</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xl font-bold text-red-600">{cs.expired}</p>
              <p className="text-xs text-red-700">Expired</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{cs.verified}</p>
              <p className="text-xs text-blue-700">Verified</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-xl font-bold text-amber-600">{cs.unverified}</p>
              <p className="text-xs text-amber-700">Unverified</p>
            </div>
          </div>
        </div>

        {/* Expiry Alerts Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Expiry Alerts ({data.expiry_alerts.length})
            </h2>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'expired', label: 'Expired' },
                { key: 'critical', label: 'Critical' },
                { key: 'warning', label: 'Warning' },
                { key: 'info', label: 'Info' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterSeverity(f.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    filterSeverity === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {filterSeverity === 'all' ? 'No certifications expiring within 90 days' : `No ${filterSeverity} alerts`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Severity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Certification</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Grade</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Expiry Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Days</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alerts.map((alert) => (
                    <tr key={alert.cert_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[alert.severity]}`}>
                          {alert.severity === 'expired' ? 'EXPIRED' : alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'warning' ? 'WARNING' : 'INFO'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800">{alert.employee_name}</td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {alert.cert_type}
                        {alert.firearm_type && <span className="ml-1 text-xs text-red-500">({alert.firearm_type})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{alert.psira_grade || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{alert.expiry_date}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-semibold ${alert.days_remaining < 0 ? 'text-red-600' : alert.days_remaining <= 14 ? 'text-orange-600' : alert.days_remaining <= 30 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {alert.days_remaining < 0 ? `${Math.abs(alert.days_remaining)}d overdue` : `${alert.days_remaining}d`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {alert.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Employees Without Certs */}
        {data.employees_without_certs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              Employees Without Certifications ({cs.employees_without_certs})
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.employees_without_certs.map((emp) => (
                <a
                  key={emp.employee_id}
                  href={`/employees/${emp.employee_id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:border-blue-400 transition-colors"
                >
                  <span className="font-medium text-gray-700">{emp.name}</span>
                  <span className="text-xs text-gray-400 capitalize">{emp.role.replace('_', ' ')}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
