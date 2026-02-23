'use client'

import { useState } from 'react'
import { payrollExportApi } from '@/services/api'
import { Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'

const FORMATS = [
  {
    key: 'sage300',
    label: 'Sage 300',
    description: 'Standard Sage 300 import format with employee numbers, hours, gross/net pay, and PAYE/UIF/SDL columns.',
    columns: ['Employee Number', 'Employee Name', 'ID Number', 'Period Start', 'Period End', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Gross Pay', 'PAYE', 'UIF (Employee)', 'UIF (Employer)', 'SDL', 'Total Deductions', 'Net Pay'],
  },
  {
    key: 'pastel',
    label: 'Pastel Payroll',
    description: 'Pastel Partner/Xpress payroll import CSV with EmpNo, period, gross amount, and statutory deductions.',
    columns: ['EmpNo', 'EmpName', 'ID Number', 'Period', 'Description', 'Reg Hours', 'OT Hours', 'Gross Amount', 'PAYE', 'UIF Emp', 'UIF Empl', 'SDL', 'Net Amount'],
  },
  {
    key: 'vip',
    label: 'VIP Payroll',
    description: 'Sage VIP Payroll import format with Pay Number, surname/first name split, and full statutory breakdown.',
    columns: ['Pay Number', 'Surname', 'First Name', 'ID Number', 'Period', 'Ordinary Hours', 'Overtime Hours', 'Gross Earnings', 'PAYE Tax', 'UIF Employee', 'UIF Employer', 'SDL Levy', 'Total Deductions', 'Net Pay'],
  },
]

export default function PayrollExportsPage() {
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('sage300')
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleDownload = async () => {
    if (!periodStart || !periodEnd) {
      setStatus({ type: 'error', message: 'Please select both start and end dates.' })
      return
    }
    setDownloading(true)
    setStatus(null)
    try {
      const res = await payrollExportApi.downloadCsv(periodStart, periodEnd, selectedFormat)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll_${selectedFormat}_${periodStart}_to_${periodEnd}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: `Payroll export downloaded successfully (${FORMATS.find(f => f.key === selectedFormat)?.label} format).` })
    } catch {
      setStatus({ type: 'error', message: 'Failed to download export. Ensure payroll data exists for the selected period.' })
    } finally {
      setDownloading(false)
    }
  }

  const currentFormat = FORMATS.find(f => f.key === selectedFormat)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Payroll Export</h1>
      </div>
      <p className="text-sm text-gray-500">
        Export payroll data as CSV files formatted for South African payroll systems. Select a period and format, then download.
      </p>

      {/* Period Selection */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Export Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Payroll System Format</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FORMATS.map(fmt => (
            <button
              key={fmt.key}
              onClick={() => setSelectedFormat(fmt.key)}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                selectedFormat === fmt.key
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{fmt.label}</div>
              <div className="text-xs text-gray-500 mt-1">{fmt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Column Preview */}
      {currentFormat && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            CSV Columns — {currentFormat.label}
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentFormat.columns.map(col => (
              <span key={col} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm">{status.message}</span>
        </div>
      )}

      {/* Download Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          disabled={downloading || !periodStart || !periodEnd}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Downloading...' : `Download ${currentFormat?.label} CSV`}
        </button>
      </div>
    </div>
  )
}
