'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getApiUrl } from '@/lib/config'
import { useToast } from '@/context/ToastContext'
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Loader2, Users } from 'lucide-react'

interface Client {
  client_id: number
  client_name: string
}

interface Site {
  site_id: number
  site_name: string
  client_name: string
}

interface UploadResult {
  status: string
  roster_id: number
  roster_code: string
  period: string
  summary: {
    rows_processed: number
    shifts_created: number
    assignments_created: number
    total_cost: number
    warnings_count: number
    errors_count: number
  }
  warnings: string[]
  errors: string[]
}

interface EasyRosterResult {
  status: string
  format: string
  created_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  created: Array<{ row: number; employee_id: number; name: string; id_number: string }>
  updated: Array<{ row: number; employee_id: number; name: string }>
  skipped: Array<{ row: number; name: string; reason: string }>
  errors: Array<{ row: number; error: string }>
}

export default function RosterTemplatesPage() {
  const { showToast } = useToast()

  // Download state
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // EasyRoster import state
  const [easyRosterFile, setEasyRosterFile] = useState<File | null>(null)
  const [easyRosterUploading, setEasyRosterUploading] = useState(false)
  const [easyRosterResult, setEasyRosterResult] = useState<EasyRosterResult | null>(null)
  const easyRosterFileRef = useRef<HTMLInputElement>(null)

  // Load clients and sites
  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    fetch(`${getApiUrl()}/api/v1/clients/`, { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setClients(data)
      })
      .catch(() => {})

    fetch(`${getApiUrl()}/api/v1/sites/`, { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSites(data)
      })
      .catch(() => {})

    // Set default date range (current month)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setPeriodStart(start.toISOString().split('T')[0])
    setPeriodEnd(end.toISOString().split('T')[0])
  }, [])

  // Filter sites by selected client
  const filteredSites = selectedClientId
    ? sites.filter(s => {
        const client = clients.find(c => c.client_id === Number(selectedClientId))
        return client && s.client_name === client.client_name
      })
    : sites

  // Download template
  const handleDownload = useCallback(async () => {
    if (!periodStart || !periodEnd) {
      showToast('error', 'Please select a date range')
      return
    }

    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        period_start: periodStart,
        period_end: periodEnd,
      })
      if (selectedSiteId) params.set('site_id', selectedSiteId)
      if (selectedClientId) params.set('client_id', selectedClientId)

      const response = await fetch(
        `${getApiUrl()}/api/v1/roster-templates/download?${params}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Download failed' }))
        throw new Error(err.detail || 'Download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Roster_Template_${periodStart}_to_${periodEnd}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('success', 'Template downloaded successfully')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      showToast('error', message)
    } finally {
      setDownloading(false)
    }
  }, [periodStart, periodEnd, selectedSiteId, selectedClientId, showToast])

  // Upload handlers
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

    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadFile(file)
      setUploadResult(null)
    } else {
      showToast('error', 'Please upload an Excel file (.xlsx)')
    }
  }, [showToast])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setUploadResult(null)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return

    setUploading(true)
    setUploadResult(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', uploadFile)

      const params = new URLSearchParams()
      if (selectedSiteId) params.set('site_id', selectedSiteId)
      if (selectedClientId) params.set('client_id', selectedClientId)

      const response = await fetch(
        `${getApiUrl()}/api/v1/roster-templates/upload?${params}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed')
      }

      setUploadResult(result)
      showToast(
        'success',
        `Roster uploaded: ${result.summary.assignments_created} assignments created`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      showToast('error', message)
    } finally {
      setUploading(false)
    }
  }, [uploadFile, selectedSiteId, selectedClientId, showToast])

  // EasyRoster import handler
  const handleEasyRosterUpload = useCallback(async () => {
    if (!easyRosterFile) return

    setEasyRosterUploading(true)
    setEasyRosterResult(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', easyRosterFile)

      const response = await fetch(
        `${getApiUrl()}/api/v1/employees/import-easyroster`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Import failed')
      }

      setEasyRosterResult(result)
      showToast(
        'success',
        `EasyRoster import: ${result.created_count} created, ${result.updated_count} updated`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      showToast('error', message)
    } finally {
      setEasyRosterUploading(false)
    }
  }, [easyRosterFile, showToast])

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Download empty roster templates, fill in your schedule, then upload to create rosters with
            automatic payroll, invoicing, and compliance checking.
          </p>
        </div>

        {/* Selectors Row */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Select Client, Site & Period
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value)
                  setSelectedSiteId('')
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sites</option>
                {filteredSites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.site_name || s.client_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Download Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Download Template</h2>
                <p className="text-sm text-gray-500">Get a pre-formatted Excel template</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>Pre-filled with dates, day/night shifts, and site info</span>
              </div>
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>Columns: Date, Day, Shift Start/End, Guard Name, Employee ID, PSIRA, Grade, Notes</span>
              </div>
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>Weekend rows highlighted in blue for easy identification</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading || !periodStart || !periodEnd}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Generating...' : 'Download Template'}
            </button>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload Roster</h2>
                <p className="text-sm text-gray-500">Import a filled roster template</p>
              </div>
            </div>

            {/* Drag and drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${
                dragActive
                  ? 'border-green-500 bg-green-50'
                  : uploadFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{uploadFile.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploadFile(null)
                      setUploadResult(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag & drop your Excel file here, or <span className="text-blue-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports .xlsx files</p>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Processing...' : 'Upload & Create Roster'}
            </button>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{uploadResult.summary.rows_processed}</p>
                <p className="text-xs text-gray-500">Rows Processed</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{uploadResult.summary.shifts_created}</p>
                <p className="text-xs text-gray-500">Shifts Created</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{uploadResult.summary.assignments_created}</p>
                <p className="text-xs text-gray-500">Assignments</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  R{uploadResult.summary.total_cost.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Cost</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm font-mono text-gray-600">{uploadResult.roster_code}</p>
                <p className="text-xs text-gray-500">Roster Code</p>
              </div>
            </div>

            {/* Warnings */}
            {uploadResult.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-1 text-sm font-semibold text-amber-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({uploadResult.summary.warnings_count})
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 py-0.5">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {uploadResult.errors.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1 text-sm font-semibold text-red-700 mb-2">
                  <XCircle className="w-4 h-4" />
                  Errors ({uploadResult.summary.errors_count})
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700 py-0.5">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Success message */}
            {uploadResult.summary.errors_count === 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Roster created successfully! Payroll, reporting, and compliance dashboards have been updated.
                </span>
              </div>
            )}
          </div>
        )}

        {/* EasyRoster Import Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import from EasyRoster</h2>
              <p className="text-sm text-gray-500">
                Import employees from EasyRoster payroll Excel format (36-column layout)
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <span>Accepts EasyRoster payroll format: SURNAME, NAME(S), ID NUMBER, PSIRA, RATE P/HR, etc.</span>
            </div>
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <span>Creates new employees or updates existing ones (matched by SA ID number)</span>
            </div>
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <span>Imports: names, ID, PSIRA, hourly rate, bank details, tax number, employee number</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <input
              ref={easyRosterFileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setEasyRosterFile(file)
                  setEasyRosterResult(null)
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => easyRosterFileRef.current?.click()}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {easyRosterFile ? easyRosterFile.name : 'Select EasyRoster file...'}
            </button>
            {easyRosterFile && (
              <button
                onClick={() => { setEasyRosterFile(null); setEasyRosterResult(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleEasyRosterUpload}
            disabled={easyRosterUploading || !easyRosterFile}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {easyRosterUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {easyRosterUploading ? 'Importing Employees...' : 'Import Employees from EasyRoster'}
          </button>

          {/* EasyRoster Import Results */}
          {easyRosterResult && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{easyRosterResult.created_count}</p>
                  <p className="text-xs text-gray-500">Created</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{easyRosterResult.updated_count}</p>
                  <p className="text-xs text-gray-500">Updated</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{easyRosterResult.skipped_count}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{easyRosterResult.error_count}</p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>

              {easyRosterResult.created.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1 text-sm font-semibold text-green-700 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Created ({easyRosterResult.created_count})
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {easyRosterResult.created.map((e, i) => (
                      <p key={i} className="text-xs text-green-700 py-0.5">
                        Row {e.row}: {e.name} (ID: {e.id_number})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {easyRosterResult.errors.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1 text-sm font-semibold text-red-700 mb-2">
                    <XCircle className="w-4 h-4" />
                    Errors ({easyRosterResult.error_count})
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {easyRosterResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700 py-0.5">
                        Row {e.row}: {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {easyRosterResult.error_count === 0 && easyRosterResult.created_count > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    All employees imported successfully! They are now available for roster generation.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Download', desc: 'Get a template pre-filled with dates and shift times for your selected period' },
              { step: '2', title: 'Fill In', desc: 'Add guard names, employee IDs, PSIRA numbers, and grades to each shift' },
              { step: '3', title: 'Upload', desc: 'System validates employees, PSIRA registrations, and BCEA compliance' },
              { step: '4', title: 'Auto-Integrate', desc: 'Payroll, invoicing, dashboards, and reports update automatically' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {step}
                </div>
                <h3 className="font-semibold text-blue-900 text-sm">{title}</h3>
                <p className="text-xs text-blue-700 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
