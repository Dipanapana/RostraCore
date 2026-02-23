'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { rosterApi } from '@/services/api'
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeeRow {
  employee_id: number
  employee_name: string
  employee_number: string
  role: string | null
  regular_hours: number
  overtime_hours: number
  total_hours: number
  max_hours_week: number
  shift_count: number
  compliance_status: 'green' | 'amber' | 'red'
}

interface ComplianceResult {
  week_start: string
  week_end: string
  bcea_limits: {
    normal_hours: number
    max_overtime: number
    absolute_max: number
  }
  summary: {
    green: number
    amber: number
    red: number
    total_employees: number
  }
  employees: EmployeeRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const m = new Date(d)
  m.setDate(diff)
  return m
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  green: { label: 'Compliant', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { label: 'Overtime', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  red: { label: 'Exceeds BCEA', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OvertimeCompliancePage() {
  const [weekStart, setWeekStart] = useState(() => {
    const m = getMonday(new Date())
    return m.toISOString().slice(0, 10)
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComplianceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await rosterApi.getOvertimeCompliance({ week_start: weekStart })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { handleRun() }, [handleRun])

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  const r = result
  const s = r?.summary

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-sky-500" />
            BCEA Overtime Compliance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Weekly hours compliance per the Basic Conditions of Employment Act
            — 45h normal, 10h max overtime (55h absolute cap).
          </p>
        </div>

        {/* Week selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <button
            onClick={() => shiftWeek(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {r ? `${fmtDate(r.week_start)} — ${fmtDate(r.week_end)}` : 'Loading…'}
            </p>
            <p className="text-xs text-gray-400">Mon – Sun</p>
          </div>
          <button
            onClick={() => shiftWeek(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Checking compliance…
          </div>
        )}

        {r && s && !loading && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Employees',
                  value: s.total_employees,
                  icon: Users,
                  color: 'text-gray-600',
                  bg: 'bg-gray-50',
                },
                {
                  label: 'Compliant (<45h)',
                  value: s.green,
                  icon: CheckCircle2,
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Overtime (45–55h)',
                  value: s.amber,
                  icon: Clock,
                  color: 'text-amber-500',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'Exceeds BCEA (>55h)',
                  value: s.red,
                  icon: AlertTriangle,
                  color: 'text-red-500',
                  bg: 'bg-red-50',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
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

            {/* Red alert banner when violations exist */}
            {s.red > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {s.red} employee{s.red !== 1 ? 's' : ''} exceed{s.red === 1 ? 's' : ''} the BCEA weekly maximum of {r.bcea_limits.absolute_max}h
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    This places the organisation at risk of non-compliance with the Basic Conditions of Employment Act (Section 10).
                    Review and redistribute shifts to bring hours within legal limits.
                  </p>
                </div>
              </div>
            )}

            {/* All-clear */}
            {s.total_employees > 0 && s.red === 0 && s.amber === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">
                  All employees are within normal working hours for this week.
                </p>
              </div>
            )}

            {/* Employee table */}
            {r.employees.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Weekly Hours Breakdown — {r.employees.length} employee{r.employees.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Employee', 'Role', 'Shifts', 'Regular', 'Overtime', 'Total', 'Limit', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.employees.map((emp) => {
                        const cfg = STATUS_CONFIG[emp.compliance_status] ?? STATUS_CONFIG.green
                        const pct = Math.min((emp.total_hours / r.bcea_limits.absolute_max) * 100, 100)
                        const barColor = emp.compliance_status === 'red' ? 'bg-red-500' : emp.compliance_status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                        return (
                          <tr key={emp.employee_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                              {emp.employee_name}
                              <span className="block text-xs text-gray-400 font-normal">#{emp.employee_number}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap capitalize">
                              {emp.role?.replace('_', ' ') ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{emp.shift_count}</td>
                            <td className="px-4 py-3 text-gray-700">{emp.regular_hours}h</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {emp.overtime_hours > 0 ? (
                                <span className="text-amber-600 font-medium">{emp.overtime_hours}h</span>
                              ) : (
                                <span className="text-gray-400">0h</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="font-semibold text-gray-800">{emp.total_hours}h</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{emp.max_hours_week}h</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
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
                <Scale className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No shift assignments found for this week.</p>
              </div>
            )}

            {/* BCEA reference */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-700 leading-relaxed">
              <p className="font-semibold mb-1">BCEA Reference (Basic Conditions of Employment Act, 1997)</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Section 9: Normal working time may not exceed <strong>45 hours per week</strong></li>
                <li>Section 10: Overtime may not exceed <strong>10 hours per week</strong> or 3 hours per day</li>
                <li>Section 10(2): Overtime must be compensated at <strong>1.5× normal wage</strong></li>
                <li>Total weekly cap: <strong>55 hours</strong> (45 normal + 10 overtime)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
