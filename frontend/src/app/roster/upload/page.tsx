'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useToast } from '@/context/ToastContext'
import { rosterUploadApi } from '@/services/api'
import type {
  FormatDetection,
  ColumnMapping,
  RosterUploadPreview,
  RosterImportResult,
} from '@/types'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle,
  Loader2, Users, Clock, DollarSign, Shield, ArrowRight, ArrowLeft,
  ChevronDown, MapPin, Zap, FileText, Receipt,
} from 'lucide-react'

// ── Column mapping field definitions ────────────────────────────────────────

const MAPPING_FIELDS = [
  { key: 'employee_name', label: 'Employee Name', required: true, description: 'Full name or surname of the guard' },
  { key: 'employee_id', label: 'Employee ID', required: false, description: 'Employee number / personnel ID' },
  { key: 'date', label: 'Date', required: true, description: 'Shift date' },
  { key: 'start_time', label: 'Start Time', required: false, description: 'Shift start (defaults to 06:00)' },
  { key: 'end_time', label: 'End Time', required: false, description: 'Shift end (defaults to 18:00)' },
  { key: 'site_name', label: 'Site', required: false, description: 'Site or location name' },
  { key: 'client_name', label: 'Client', required: false, description: 'Client / company name' },
  { key: 'grade', label: 'Grade', required: false, description: 'PSIRA grade (A-E)' },
  { key: 'psira_number', label: 'PSIRA No', required: false, description: 'PSIRA registration number' },
  { key: 'notes', label: 'Notes', required: false, description: 'Comments or remarks' },
] as const

const SEVERITY_CONFIG = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Shield },
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'success'

export default function RosterUploadPage() {
  const { showToast } = useToast()
  const router = useRouter()

  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload')

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detection, setDetection] = useState<FormatDetection | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Column mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})

  // Step 3: Preview
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<RosterUploadPreview | null>(null)
  const [shiftStart, setShiftStart] = useState('06:00')
  const [shiftEnd, setShiftEnd] = useState('18:00')
  const [autoCreateSite, setAutoCreateSite] = useState(false)

  // Step 4: Success
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<RosterImportResult | null>(null)

  // ── Step 1: File upload & detection ─────────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = Array.from(e.dataTransfer.files).find(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    )
    if (f) {
      setFile(f)
      setDetection(null)
      setPreview(null)
      setImportResult(null)
    } else {
      showToast('error', 'Invalid file', 'Please upload an Excel file (.xlsx)')
    }
  }, [showToast])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setDetection(null)
      setPreview(null)
      setImportResult(null)
    }
  }, [])

  const handleDetect = useCallback(async () => {
    if (!file) return
    setDetecting(true)
    try {
      const res = await rosterUploadApi.detect(file)
      const data: FormatDetection = res.data
      setDetection(data)

      // Auto-advance based on detection confidence
      if (data.detected_format === 'mafoko_do_grid') {
        // Known Mafoko format — skip mapping, go straight to preview
        setColumnMapping({})
        setStep('preview')
        handlePreview(file, {}, data)
      } else if (data.confidence >= 0.7 && Object.keys(data.suggested_mapping).length >= 2) {
        // High confidence — pre-fill mapping and go to preview
        setColumnMapping({ ...data.suggested_mapping, _header_row: data.header_row, _data_start_row: data.data_start_row })
        setStep('preview')
        handlePreview(file, { ...data.suggested_mapping, _header_row: data.header_row, _data_start_row: data.data_start_row }, data)
      } else {
        // Need user to map columns
        setColumnMapping({ ...data.suggested_mapping, _header_row: data.header_row, _data_start_row: data.data_start_row })
        setStep('mapping')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Detection failed'
      showToast('error', 'Detection failed', msg)
    } finally {
      setDetecting(false)
    }
  }, [file, showToast])

  // ── Step 3: Preview ─────────────────────────────────────────────────────

  const handlePreview = useCallback(async (
    previewFile?: File,
    mapping?: ColumnMapping,
    det?: FormatDetection,
  ) => {
    const f = previewFile || file
    const m = mapping || columnMapping
    if (!f) return

    setPreviewing(true)
    try {
      const res = await rosterUploadApi.preview(f, m as Record<string, number | undefined>, {
        default_start_time: shiftStart,
        default_end_time: shiftEnd,
      })
      setPreview(res.data)
      if (res.data.status === 'error') {
        showToast('error', 'Preview issue', res.data.message || 'Check column mapping')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Preview failed'
      showToast('error', 'Preview failed', msg)
    } finally {
      setPreviewing(false)
    }
  }, [file, columnMapping, shiftStart, shiftEnd, showToast])

  // ── Step 4: Import ──────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!file) return
    setImporting(true)
    try {
      const res = await rosterUploadApi.import(file, columnMapping as Record<string, number | undefined>, {
        default_start_time: shiftStart,
        default_end_time: shiftEnd,
        auto_create_site: autoCreateSite,
      })
      const data: RosterImportResult = res.data
      setImportResult(data)

      if (data.status === 'success') {
        setStep('success')
        showToast('success', 'Roster imported', `${data.summary?.assignments_created || 0} assignments created`)
      } else if (data.status === 'duplicate') {
        showToast('warning', 'Duplicate', data.message || 'This file was already uploaded')
      } else {
        showToast('error', 'Import failed', data.message || 'Check errors below')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      showToast('error', 'Import failed', msg)
    } finally {
      setImporting(false)
    }
  }, [file, columnMapping, shiftStart, shiftEnd, autoCreateSite, showToast])

  const resetWizard = useCallback(() => {
    setStep('upload')
    setFile(null)
    setDetection(null)
    setColumnMapping({})
    setPreview(null)
    setImportResult(null)
  }, [])

  // ── Render helpers ────────────────────────────────────────────────────

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string; num: number }[] = [
      { key: 'upload', label: 'Upload', num: 1 },
      { key: 'mapping', label: 'Map Columns', num: 2 },
      { key: 'preview', label: 'Preview', num: 3 },
      { key: 'success', label: 'Done', num: 4 },
    ]
    const currentIdx = steps.findIndex(s => s.key === step)

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < currentIdx ? 'bg-green-500 text-white' :
              i === currentIdx ? 'bg-indigo-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < currentIdx ? <CheckCircle className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-sm hidden sm:inline ${i === currentIdx ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          </div>
        ))}
      </div>
    )
  }

  const renderSuggestions = (suggestions: RosterUploadPreview['suggestions']) => {
    if (!suggestions || suggestions.length === 0) return null
    const groups = [
      { label: 'Errors', items: suggestions.filter(s => s.severity === 'error'), severity: 'error' as const },
      { label: 'Warnings', items: suggestions.filter(s => s.severity === 'warning'), severity: 'warning' as const },
      { label: 'Info', items: suggestions.filter(s => s.severity === 'info'), severity: 'info' as const },
    ].filter(g => g.items.length > 0)

    return (
      <div className="space-y-3">
        {groups.map(group => {
          const cfg = SEVERITY_CONFIG[group.severity]
          const Icon = cfg.icon
          return (
            <div key={group.severity}>
              <h4 className={`flex items-center gap-1 text-sm font-semibold ${cfg.text} mb-1`}>
                <Icon className="w-4 h-4" /> {group.label} ({group.items.length})
              </h4>
              <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-3 max-h-40 overflow-y-auto space-y-1`}>
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
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Roster</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload any Excel roster file. We&apos;ll auto-detect the format or let you map columns manually.
          </p>
        </div>

        {renderStepIndicator()}

        {/* ── Step 1: Upload & Detect ──────────────────────────────────── */}
        {step === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Select Roster File</h2>
                    <p className="text-sm text-gray-500">Any Excel format — we&apos;ll detect columns automatically</p>
                  </div>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
                    dragActive ? 'border-indigo-500 bg-indigo-50' :
                    file ? 'border-indigo-300 bg-indigo-50' :
                    'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {file ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-indigo-600 mx-auto" />
                      <p className="text-sm font-medium text-indigo-700">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); setDetection(null) }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Change file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        Drag & drop a roster file, or <span className="text-indigo-600 font-medium">browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">.xlsx or .xls files supported</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDetect}
                  disabled={detecting || !file}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {detecting ? 'Analyzing file...' : 'Detect Format & Continue'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Supported Formats</h3>
                <div className="space-y-3 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900">Auto-detected:</span> Mafoko D/o grid, RostraCore template
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900">Generic Excel:</span> Map columns if auto-detect can&apos;t match
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    <span>Minimum: Employee name/ID + Date</span>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                <h3 className="font-semibold text-indigo-900 mb-2 text-sm">After Upload</h3>
                <div className="space-y-1.5 text-xs text-indigo-700">
                  <p>Shifts and assignments created with BCEA-compliant costs.</p>
                  <p>Generate payroll, invoices, and payslips from the uploaded data.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Column Mapping ───────────────────────────────────── */}
        {step === 'mapping' && detection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Map Columns</h2>
                <p className="text-sm text-gray-500">
                  {detection.confidence > 0.3
                    ? 'We suggested some mappings — verify and adjust as needed.'
                    : 'Select which column corresponds to each field.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  detection.confidence >= 0.7 ? 'bg-green-100 text-green-700' :
                  detection.confidence >= 0.3 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {Math.round(detection.confidence * 100)}% confidence
                </span>
              </div>
            </div>

            {/* Spreadsheet preview */}
            {detection.headers.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-2 px-3 text-left text-gray-500 font-medium">#</th>
                      {detection.headers.map((h, i) => (
                        <th key={i} className={`py-2 px-3 text-left font-medium ${
                          Object.values(columnMapping).includes(i) ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700'
                        }`}>
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detection.sample_rows.slice(0, 4).map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-100">
                        <td className="py-1.5 px-3 text-gray-400">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`py-1.5 px-3 ${
                            Object.values(columnMapping).includes(ci) ? 'bg-indigo-50/50' : ''
                          }`}>
                            {cell || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Field mapping dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MAPPING_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <label className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <p className="text-xs text-gray-400">{field.description}</p>
                  </div>
                  <div className="relative flex-1">
                    <select
                      value={columnMapping[field.key as keyof ColumnMapping] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setColumnMapping(prev => ({
                          ...prev,
                          [field.key]: val === '' ? undefined : parseInt(val),
                        }))
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm appearance-none bg-white pr-8"
                    >
                      <option value="">— Not mapped —</option>
                      {detection.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => {
                  // Validate required fields
                  const hasName = columnMapping.employee_name !== undefined
                  const hasId = columnMapping.employee_id !== undefined
                  const hasDate = columnMapping.date !== undefined
                  if (!hasDate) {
                    showToast('error', 'Date column required', 'Please map the Date column')
                    return
                  }
                  if (!hasName && !hasId) {
                    showToast('error', 'Employee column required', 'Map at least Employee Name or Employee ID')
                    return
                  }
                  setStep('preview')
                  handlePreview()
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Preview Import <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview & Confirm ────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-6">
            {previewing ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Analyzing roster and matching employees...</p>
              </div>
            ) : preview ? (
              <>
                {/* Format detection badge */}
                {preview.detected_format && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                      Format: {preview.detected_format === 'mafoko_do_grid' ? 'Mafoko D/o Grid' :
                               preview.detected_format === 'rostracore_template' ? 'RostraCore Template' :
                               'Generic Excel'}
                    </span>
                    {preview.period?.start && preview.period?.end && (
                      <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {preview.period.start} to {preview.period.end}
                      </span>
                    )}
                  </div>
                )}

                {/* Site resolution */}
                {preview.site_resolved && (
                  <div className="flex items-center gap-2 text-sm">
                    {preview.site_resolved.site_id ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-700">
                          Site: {preview.site_resolved.site_name}
                          {preview.site_resolved.client_name && ` (${preview.site_resolved.client_name})`}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700">
                          No matching site found
                          {preview.site_resolved.site_name && ` for "${preview.site_resolved.site_name}"`}.
                          Enable auto-create below.
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { icon: Users, value: preview.summary.total_entries, label: 'Total Entries', color: 'text-blue-500' },
                    { icon: CheckCircle, value: preview.summary.employees_matched, label: 'Matched', color: 'text-green-500' },
                    { icon: XCircle, value: preview.summary.employees_unmatched, label: 'Unmatched', color: 'text-red-500' },
                    { icon: Clock, value: preview.summary.total_assignments, label: 'Assignments', color: 'text-indigo-500' },
                    { icon: DollarSign, value: `R${(preview.summary.estimated_cost || 0).toLocaleString()}`, label: 'Est. Cost', color: 'text-purple-500' },
                  ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                      <p className="text-xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* BCEA Suggestions */}
                {preview.suggestions && preview.suggestions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                      BCEA Compliance ({preview.suggestions.length})
                    </h3>
                    {renderSuggestions(preview.suggestions)}
                  </div>
                )}

                {/* Unmatched employees */}
                {preview.unmatched_employees && preview.unmatched_employees.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                      Unmatched Employees ({preview.unmatched_employees.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Identifier</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Name</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Grade</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Row</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.unmatched_employees.slice(0, 20).map((emp, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1.5 px-3 font-mono text-xs">{emp.identifier || emp.employee_id}</td>
                              <td className="py-1.5 px-3">{emp.name}</td>
                              <td className="py-1.5 px-3">{emp.grade || '-'}</td>
                              <td className="py-1.5 px-3 text-gray-500">{emp.row_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import options */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Import Options</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(detection && detection.detected_format !== 'mafoko_do_grid' ? 'mapping' : 'upload')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePreview()}
                      disabled={previewing}
                      className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm rounded-lg hover:bg-gray-50"
                    >
                      {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Refresh Preview
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || preview?.status === 'error'}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {importing ? 'Importing...' : 'Import Roster'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Step 4: Success ──────────────────────────────────────────── */}
        {step === 'success' && importResult && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-green-800">Roster Imported Successfully!</h2>
                <p className="text-sm text-green-700 mt-1">
                  Code: <span className="font-mono font-semibold">{importResult.roster_code}</span>
                  {importResult.summary && (
                    <> — {importResult.summary.assignments_created} assignments, {importResult.summary.shifts_created} shifts, R{importResult.summary.total_cost?.toLocaleString()}</>
                  )}
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Next Steps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => router.push('/payroll')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate Payroll</p>
                    <p className="text-xs text-gray-500">Calculate employee pay for this period</p>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/billing/invoices')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate Invoices</p>
                    <p className="text-xs text-gray-500">Bill clients for deployed guards</p>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/reports')}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">View Reports</p>
                    <p className="text-xs text-gray-500">Dashboards and PDF exports</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Import summary */}
            {importResult.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Matched', value: importResult.summary.employees_matched, color: 'text-green-600' },
                  { label: 'Unmatched', value: importResult.summary.employees_unmatched, color: 'text-red-600' },
                  { label: 'Shifts', value: importResult.summary.shifts_created, color: 'text-indigo-600' },
                  { label: 'Assignments', value: importResult.summary.assignments_created, color: 'text-blue-600' },
                  { label: 'Total Cost', value: `R${importResult.summary.total_cost?.toLocaleString()}`, color: 'text-purple-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions from import */}
            {importResult.suggestions && importResult.suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  BCEA Compliance Notes
                </h3>
                {renderSuggestions(importResult.suggestions)}
              </div>
            )}

            <button
              onClick={resetWizard}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Upload className="w-4 h-4" /> Upload Another Roster
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
