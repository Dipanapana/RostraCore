'use client'

import { useState, useEffect, useCallback } from 'react'
import { revenueApi } from '@/services/api'
import { TrendingUp, DollarSign, AlertTriangle, CheckCircle, Building2, FileText } from 'lucide-react'

function formatCurrency(val: number): string {
  return `R${val.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenueDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(365)

  const fetchData = useCallback(async () => {
    try {
      const res = await revenueApi.overview(days)
      setData(res.data)
    } catch { /* ignore */ }
  }, [days])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!data) return <div className="p-8 text-gray-500">No data available</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-green-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Revenue Dashboard</h1>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><FileText className="w-4 h-4" />Invoiced</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(data.total_invoiced)}</div>
          <div className="text-xs text-gray-400">{data.invoice_count} invoices</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Collected</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(data.total_paid)}</div>
          <div className="text-xs text-gray-400">{data.collection_rate}% rate</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-yellow-600">Outstanding</div>
          <div className="text-lg font-bold text-yellow-600">{formatCurrency(data.total_outstanding)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="w-4 h-4" />Overdue</div>
          <div className="text-lg font-bold text-red-600">{formatCurrency(data.total_overdue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="w-4 h-4" />Monthly MRR</div>
          <div className="text-lg font-bold text-indigo-600">{formatCurrency(data.monthly_contract_value)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Annual Contract</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(data.annual_contract_value)}</div>
          <div className="text-xs text-gray-400">{data.active_contracts} contracts</div>
        </div>
      </div>

      {/* Collection Rate Bar */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Collection Rate</h2>
          <span className={`text-lg font-bold ${data.collection_rate >= 80 ? 'text-green-600' : data.collection_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {data.collection_rate}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${data.collection_rate >= 80 ? 'bg-green-500' : data.collection_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(data.collection_rate, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Paid: {formatCurrency(data.total_paid)}</span>
          <span>Outstanding: {formatCurrency(data.total_outstanding)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Client */}
        {data.by_client.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" />Revenue by Client</h2>
            <div className="space-y-3">
              {data.by_client.slice(0, 10).map((c: any) => {
                const pct = data.total_invoiced > 0 ? (c.invoiced / data.total_invoiced) * 100 : 0
                return (
                  <div key={c.client_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{c.client_name}</span>
                      <span className="text-sm text-gray-500">{formatCurrency(c.invoiced)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{c.invoice_count} invoices</span>
                      <span className={c.outstanding > 0 ? 'text-yellow-600' : 'text-green-600'}>
                        {c.outstanding > 0 ? `${formatCurrency(c.outstanding)} outstanding` : 'Fully paid'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {data.by_month.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2">Month</th>
                    <th className="pb-2 text-right">Invoiced</th>
                    <th className="pb-2 text-right">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_month.map((m: any) => (
                    <tr key={m.month} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 font-medium text-gray-900">{m.month}</td>
                      <td className="py-2 text-right text-gray-700">{formatCurrency(m.invoiced)}</td>
                      <td className="py-2 text-right text-green-600 font-medium">{formatCurrency(m.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {data.invoice_count === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No invoice data for this period.</p>
        </div>
      )}
    </div>
  )
}
