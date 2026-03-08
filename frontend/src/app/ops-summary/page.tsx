'use client'

import { useState, useEffect, useCallback } from 'react'
import { opsSummaryApi } from '@/services/api'
import PageHeader from '@/components/ui/PageHeader'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Zap, Users, Building2, Shield, AlertTriangle, DollarSign, Clock, Calendar, FileText, CheckCircle, RefreshCw } from 'lucide-react'

function formatCurrency(val: number): string {
  return `R${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function MetricCard({ icon: Icon, label, value, subtext, color = 'text-gray-900' }: {
  icon: any; label: string; value: string | number; subtext?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><Icon className="w-4 h-4" />{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  )
}

export default function OpsSummaryPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await opsSummaryApi.snapshot()
      setData(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <DashboardLayout><div className="p-8 text-gray-500">Loading...</div></DashboardLayout>
  if (!data) return <DashboardLayout><div className="p-8 text-gray-500">No data available</div></DashboardLayout>

  const w = data.workforce
  const o = data.operations
  const inc = data.incidents
  const f = data.financial

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Operational Summary"
        subtitle={`${data.date} · Generated ${data.generated_at?.split('T')[1]?.split('.')[0] || ''}`}
        icon={<Zap className="text-amber-500" size={28} />}
        actions={
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Workforce Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-5 h-5" />Workforce</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={Users} label="Active Employees" value={w.active_employees} />
          <MetricCard icon={CheckCircle} label="Available Today" value={w.available_today} color="text-green-600" />
          <MetricCard icon={Calendar} label="On Leave Today" value={w.on_leave_today} color={w.on_leave_today > 0 ? 'text-yellow-600' : 'text-gray-900'} />
          <MetricCard icon={Shield} label="Certs Expiring 30d" value={w.certs_expiring_30d} color={w.certs_expiring_30d > 0 ? 'text-red-600' : 'text-green-600'} />
        </div>
      </div>

      {/* Operations Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Building2 className="w-5 h-5" />Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={Building2} label="Sites" value={o.total_sites} subtext={`${o.total_clients} clients`} />
          <MetricCard icon={Clock} label="Today's Shifts" value={o.today_shifts} subtext={`${o.today_assignments} assignments`} />
          <MetricCard icon={CheckCircle} label="Checked In Today" value={o.checked_in_today} color="text-green-600" />
          <MetricCard icon={Clock} label="Month Hours" value={`${o.month_hours}h`} subtext={`${o.month_shifts} shifts, ${o.month_assignments} assignments`} />
        </div>
      </div>

      {/* Incidents Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Incidents</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <MetricCard icon={AlertTriangle} label="Last 30 Days" value={inc.last_30_days} color={inc.last_30_days > 0 ? 'text-orange-600' : 'text-green-600'} />
          <MetricCard icon={AlertTriangle} label="Open/Investigating" value={inc.open} color={inc.open > 0 ? 'text-red-600' : 'text-green-600'} />
        </div>
      </div>

      {/* Financial Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5" />Financial</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard icon={DollarSign} label="Monthly MRR" value={formatCurrency(f.monthly_contract_value)} color="text-indigo-600" />
          <MetricCard icon={DollarSign} label="Annual Value" value={formatCurrency(f.annual_contract_value)} subtext={`${f.active_contracts} contracts`} />
          <MetricCard icon={FileText} label="Month Invoiced" value={formatCurrency(f.month_invoiced)} />
          <MetricCard icon={CheckCircle} label="Month Collected" value={formatCurrency(f.month_collected)} color="text-green-600" />
          <MetricCard icon={AlertTriangle} label="Overdue Invoices" value={f.overdue_invoices} color={f.overdue_invoices > 0 ? 'text-red-600' : 'text-green-600'} />
          <MetricCard icon={DollarSign} label="Collection Gap" value={formatCurrency(f.month_invoiced - f.month_collected)} color={f.month_invoiced - f.month_collected > 0 ? 'text-yellow-600' : 'text-green-600'} />
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}
