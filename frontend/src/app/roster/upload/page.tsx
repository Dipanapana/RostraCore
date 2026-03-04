'use client'

import { useState, useCallback, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getApiUrl } from '@/lib/config'
import { useToast } from '@/context/ToastContext'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle,
  Loader2, MapPin, Users, Clock, BarChart3, DollarSign, Shield,
} from 'lucide-react'

interface ParsedHeader {
  province: string | null
  client: string | null
  site_code: string | null
  site_name: string | null
  schedule: string | null
  start_date: string | null
  end_date: string | null
}

interface SiteResolved {
  site_id: number | null
  site_name: string | null
  client_id: number | null
  client_name: string | null
}

interface Suggestion {
  type: string
  severity: 'error' | 'warning' | 'info'
  employee: string | null
  message: string
}

interface UnmatchedEmployee {
  pers_no: string
  name: string
  grade: string
  row_number: number
}

interface UploadSummary {
  employees_in_file: number
  employees_matched: number
  employees_unmatched: number
  total_working_days: number
  matched_working_days: number
  shifts_created?: number
  assignments_created?: number
  total_cost?: number
  regular_cost?: number
  overtime_cost?: number
  premium_cost?: number
  period?: string
}

interface ImportResult {
  status: string
  message?: string
  upload_id?: number
  roster_id?: number
  roster_code?: string
  parsed_header: ParsedHeader
  site_resolved: SiteResolved | null
  summary: UploadSummary
  unmatched_employees: UnmatchedEmployee[]
  suggestions: Suggestion[]
  warnings: string[]
  errors: string[]
}

const SEVERITY_CONFIG = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Shield },
}

export default function SiteRosterUploadPage() {
  const { showToast } = useToast()

  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [autoCreateSite, setAutoCreateSite] = useState(false)
  const [shiftStart, setShiftStart] = useState('06:00')
  const [shiftEnd, setShiftEnd] = useState('18:00')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    )
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles)
      setResult(null)
    } else {
      showToast('error', 'Please upload Excel files (.xlsx)')
    }
  }, [showToast])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) {
      setFiles(selected)
      setResult(null)
    }
  }, [])

  const handlePreview = useCallback(async () => {
    if (files.length === 0) return

    setPreviewing(true)
    setResult(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', files[0])

      const response = await fetch(
        `${getApiUrl()}/api/v1/roster-upload/mafoko/preview`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Preview failed')
      }

      setResult(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Preview failed'
      showToast('error', message)
    } finally {
      setPreviewing(false)
    }
  }, [files, showToast])

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return

    setUploading(true)
    setResult(null)

    try {
      const token = localStorage.getItem('token')

      const isBulk = files.length > 1
      const url = isBulk
        ? `${getApiUrl()}/api/v1/roster-upload/mafoko/bulk`
        : `${getApiUrl()}/api/v1/roster-upload/mafoko`

      const params = new URLSearchParams({
        shift_start: shiftStart,
        shift_end: shiftEnd,
        auto_create_site: autoCreateSite.toString(),
      })

      const formData = new FormData()
      if (isBulk) {
        files.forEach(f => formData.append('files', f))
      } else {
        formData.append('file', files[0])
      }

      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed')
      }

      if (isBulk) {
        showToast('success', `Bulk upload: ${data.successful}/${data.total_files} files processed`)
      } else {
        setResult(data)
        showToast('success', `Roster created: ${data.summary?.assignments_created || 0} assignments`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      showToast('error', message)
    } finally {
      setUploading(false)
    }
  }, [files, shiftStart, shiftEnd, autoCreateSite, showToast])

  const errorSuggestions = result?.suggestions.filter(s => s.severity === 'error') || []
  const warningSuggestions = result?.suggestions.filter(s => s.severity === 'warning') || []
  const infoSuggestions = result?.suggestions.filter(s => s.severity === 'info') || []

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Roster Upload</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload site roster files (D/o grid format) to automatically create shifts, assignments,
            and generate payroll and invoicing data. Supports bulk upload across multiple sites.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Upload Site Roster</h2>
                  <p className="text-sm text-gray-500">Mafoko D/o grid format, one file per site</p>
                </div>
              </div>

              {/* Drag and drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : files.length > 0
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-700">{f.name}</span>
                      </div>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFiles([])
                        setResult(null)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 mt-2"
                    >
                      Clear files
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      Drag & drop roster files here, or <span className="text-indigo-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload multiple files for bulk processing across sites
                    </p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shift End</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={autoCreateSite}
                      onChange={(e) => setAutoCreateSite(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Auto-create site if not found
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={previewing || files.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 border border-indigo-300 text-indigo-700 px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-colors"
                >
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  {previewing ? 'Analyzing...' : 'Preview & Analyze'}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Processing...' : 'Upload & Create Roster'}
                </button>
              </div>
            </div>
          </div>

          {/* How It Works sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Supported Format</h3>
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>Mafoko D/o grid: rows are employees, columns are days</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>Employees matched by Personnel No (MSP#####)</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>Site auto-detected from header (province, client, code)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>Date range parsed from filename</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">Auto Processing</h3>
              <div className="space-y-2 text-xs text-indigo-700">
                <p>Each &quot;D&quot; cell creates a shift assignment with BCEA-compliant cost calculation.</p>
                <p>After upload, payroll and invoicing data is ready to generate.</p>
                <p>Suggestions flag BCEA violations (overtime, consecutive days, rest day gaps).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Parsed Header */}
            {result.parsed_header && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Parsed Header</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {[
                    { label: 'Province', value: result.parsed_header.province },
                    { label: 'Client', value: result.parsed_header.client },
                    { label: 'Site Code', value: result.parsed_header.site_code },
                    { label: 'Site Name', value: result.parsed_header.site_name },
                    { label: 'Schedule', value: result.parsed_header.schedule },
                    { label: 'Period', value: result.parsed_header.start_date && result.parsed_header.end_date
                      ? `${result.parsed_header.start_date} to ${result.parsed_header.end_date}`
                      : null },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-medium text-gray-900">{value || '-'}</p>
                    </div>
                  ))}
                </div>

                {/* Site match status */}
                {result.site_resolved && (
                  <div className="mt-3 flex items-center gap-2">
                    {result.site_resolved.site_id ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          Matched to: {result.site_resolved.site_name} ({result.site_resolved.client_name})
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-700">
                          No matching site found. Enable &quot;Auto-create site&quot; or provide site_id.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{result.summary.employees_in_file}</p>
                <p className="text-xs text-gray-500">In File</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{result.summary.employees_matched}</p>
                <p className="text-xs text-gray-500">Matched</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{result.summary.employees_unmatched}</p>
                <p className="text-xs text-gray-500">Unmatched</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                <Clock className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-indigo-600">
                  {result.summary.shifts_created ?? result.summary.total_working_days}
                </p>
                <p className="text-xs text-gray-500">{result.summary.shifts_created != null ? 'Shifts' : 'Working Days'}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                <DollarSign className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-600">
                  {result.summary.total_cost != null
                    ? `R${result.summary.total_cost.toLocaleString()}`
                    : `${result.summary.matched_working_days} days`}
                </p>
                <p className="text-xs text-gray-500">{result.summary.total_cost != null ? 'Total Cost' : 'Matched Days'}</p>
              </div>
            </div>

            {/* Roster code + success */}
            {result.status === 'success' && result.roster_code && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Roster created successfully! Code: <span className="font-mono">{result.roster_code}</span>
                  </p>
                  <p className="text-xs mt-0.5">
                    Payroll and invoice generation are now available for this period.
                  </p>
                </div>
              </div>
            )}

            {/* Suggestions by severity */}
            {result.suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Intelligent Suggestions ({result.suggestions.length})
                </h3>

                <div className="space-y-4">
                  {[
                    { label: 'Errors', items: errorSuggestions, severity: 'error' as const },
                    { label: 'Warnings', items: warningSuggestions, severity: 'warning' as const },
                    { label: 'Info', items: infoSuggestions, severity: 'info' as const },
                  ].filter(g => g.items.length > 0).map(group => {
                    const cfg = SEVERITY_CONFIG[group.severity]
                    const Icon = cfg.icon
                    return (
                      <div key={group.severity}>
                        <h4 className={`flex items-center gap-1 text-sm font-semibold ${cfg.text} mb-2`}>
                          <Icon className="w-4 h-4" />
                          {group.label} ({group.items.length})
                        </h4>
                        <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-3 max-h-48 overflow-y-auto space-y-1`}>
                          {group.items.map((s, i) => (
                            <div key={i} className={`text-xs ${cfg.text} flex gap-2`}>
                              {s.employee && <span className="font-medium shrink-0">{s.employee}:</span>}
                              <span>{s.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Unmatched employees */}
            {result.unmatched_employees.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Unmatched Employees ({result.unmatched_employees.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Pers No</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Name</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Grade</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Row</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.unmatched_employees.map((emp, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-mono text-xs">{emp.pers_no}</td>
                          <td className="py-2 px-3">{emp.name}</td>
                          <td className="py-2 px-3">{emp.grade}</td>
                          <td className="py-2 px-3 text-gray-500">{emp.row_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Warnings from backend */}
            {result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="flex items-center gap-1 text-sm font-semibold text-amber-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({result.warnings.length})
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700">{w}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
