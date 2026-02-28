'use client'

import { useState, useEffect, useRef } from 'react'
import { rosterApi, clientsApi } from '@/services/api'
import { getApiUrl } from '@/lib/config'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DatePicker from '@/components/DatePicker'
import Modal from '@/components/ui/Modal'
import { Client, RosterGenerateResponse, RosterAssignment } from '@/types'


export default function RosterPage() {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<RosterGenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoCreatedCount, setAutoCreatedCount] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Algorithm configuration state
  const [algorithm, setAlgorithm] = useState('auto')
  const [fairnessWeight, setFairnessWeight] = useState(0.2)
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null)
  const [nightStartHour, setNightStartHour] = useState(18)
  const [nightEndHour, setNightEndHour] = useState(6)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

  // Progress state
  const [progress, setProgress] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Audit trail / history state
  const [showHistory, setShowHistory] = useState(false)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Saved rosters state
  const [savedRosters, setSavedRosters] = useState<any[]>([])
  const [savedRostersLoading, setSavedRostersLoading] = useState(false)

  // Snapshot history modal state
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false)
  const [snapshotRosterId, setSnapshotRosterId] = useState<number | null>(null)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientsApi.getAll()
        setClients(response.data)
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      }
    }
    fetchClients()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Timer effect for elapsed seconds
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [loading])

  // Simulate progress for better UX
  useEffect(() => {
    if (loading) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      return () => clearInterval(interval)
    } else {
      setProgress(0)
    }
  }, [loading])

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)
      setAutoCreatedCount(null)

      // Call roster generation API directly (synchronous for now)
      const token = localStorage.getItem('access_token')

      // Format dates to YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const response = await fetch(`${getApiUrl()}/api/v1/roster/generate?algorithm=${algorithm}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          site_ids: [],
          client_ids: selectedClients.length > 0 ? selectedClients : undefined,
          algorithm: algorithm,
          fairness_weight: fairnessWeight,
          budget_limit: budgetLimit,
          night_shift_start_hour: nightStartHour,
          night_shift_end_hour: nightEndHour,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate roster')
      }

      const data = await response.json()

      // Handle result
      if (data.shifts_auto_created) {
        setAutoCreatedCount(data.shifts_auto_created)
      }
      if (data.status === 'empty' && !data.shifts_auto_created) {
        setError('No shifts found and no site profiles configured. Set up staffing profiles on the Sites page, or create shifts manually.')
        setResult(null)
      } else if (!data.assignments || data.assignments.length === 0) {
        setError('Shifts exist but no guards could be assigned. Check that employees are active with matching roles and are not already fully scheduled.')
        setResult(null)
      } else {
        setResult(data)
        setError(null)
      }
      setLoading(false)

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate roster')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setLoading(false)
    setError('Generation cancelled by user')
  }

  // Fetch audit log
  const fetchAuditLog = async () => {
    setAuditLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/audit-log?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAuditLog(Array.isArray(data.entries) ? data.entries : Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch audit log:', err)
    } finally {
      setAuditLoading(false)
    }
  }

  // Fetch saved rosters
  const fetchSavedRosters = async () => {
    setSavedRostersLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSavedRosters(data.rosters || data || [])
      }
    } catch (err) {
      console.error('Failed to fetch saved rosters:', err)
    } finally {
      setSavedRostersLoading(false)
    }
  }

  // Toggle history panel
  const toggleHistory = () => {
    const next = !showHistory
    setShowHistory(next)
    if (next) {
      fetchAuditLog()
      fetchSavedRosters()
    }
  }

  // Quick action: Clone roster
  const handleCloneRoster = async (rosterId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const today = new Date()
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7))
      const newStartDate = nextMonday.toISOString().split('T')[0]

      const res = await fetch(`${getApiUrl()}/api/v1/roster/clone/${rosterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ new_start_date: newStartDate }),
      })
      if (res.ok) {
        alert('Roster cloned successfully!')
        fetchSavedRosters()
      } else {
        const err = await res.json()
        alert('Failed to clone: ' + (err.detail || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Failed to clone roster: ' + err.message)
    }
  }

  // Quick action: Update roster status (publish/archive)
  const handleRosterStatus = async (rosterId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/status?new_status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        alert(`Roster ${newStatus} successfully!`)
        fetchSavedRosters()
      } else {
        const err = await res.json()
        alert(`Failed to ${newStatus}: ` + (err.detail || 'Unknown error'))
      }
    } catch (err: any) {
      alert(`Failed to ${newStatus} roster: ` + err.message)
    }
  }

  // Fetch snapshots for a given roster
  const fetchSnapshots = async (rosterId: number) => {
    setSnapshotsLoading(true)
    setSnapshots([])
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${getApiUrl()}/api/v1/roster/saved/${rosterId}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSnapshots(data.snapshots || data || [])
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err)
    } finally {
      setSnapshotsLoading(false)
    }
  }

  // Open snapshot history modal
  const handleViewHistory = (rosterId: number) => {
    setSnapshotRosterId(rosterId)
    setSnapshotModalOpen(true)
    fetchSnapshots(rosterId)
  }

  // Audit action badge color
  const getActionBadge = (action: string) => {
    const lower = (action || '').toLowerCase()
    if (lower.includes('create') || lower.includes('generate')) return 'bg-green-100 text-green-700'
    if (lower.includes('update') || lower.includes('edit')) return 'bg-blue-100 text-blue-700'
    if (lower.includes('delete') || lower.includes('archive')) return 'bg-red-100 text-red-700'
    if (lower.includes('publish')) return 'bg-purple-100 text-purple-700'
    if (lower.includes('clone')) return 'bg-indigo-100 text-indigo-700'
    return 'bg-gray-100 text-gray-700'
  }

  const handleConfirm = async () => {
    if (!result || !result.assignments) return

    try {
      setLoading(true)
      const response = await rosterApi.confirm(result.assignments)

      // Auto-download PDF if URL is provided
      if (response.data.pdf_url) {
        const token = localStorage.getItem('access_token')
        const pdfUrl = `${getApiUrl()}${response.data.pdf_url}`

        // Secure PDF download using fetch with Authorization header
        try {
          const pdfResponse = await fetch(pdfUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `roster_${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
          } else {
            console.error('Failed to download PDF:', pdfResponse.status)
          }
        } catch (pdfErr) {
          console.error('PDF download error:', pdfErr)
        }
      }

      alert('Roster confirmed successfully! PDF report is downloading...')
      setResult(null)
    } catch (err: any) {
      alert('Failed to confirm roster: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Progress overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Animated spinner */}
              <div className="mb-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
              </div>

              {/* Status message */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generating Roster...
              </h3>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Progress percentage */}
              <div className="text-sm text-gray-600 mb-4">
                {progress}% complete
              </div>

              {/* Elapsed time */}
              <div className="text-xs text-gray-500 mb-4">
                Elapsed time: {elapsedSeconds}s
              </div>

              {/* Cancel button */}
              <button
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Roster Generation</h1>
              <p className="text-gray-600">AI-powered shift optimization and scheduling</p>
            </div>
            <button
              onClick={toggleHistory}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showHistory
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHistory ? 'Hide History' : 'View History'}
            </button>
          </div>

          {/* Generation Form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Generate Optimized Roster</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholderText="Select start date"
                  disabled={loading}
                  label="Start Date"
                />
              </div>

              <div>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate || undefined}
                  placeholderText="Select end date"
                  disabled={loading}
                  label="End Date"
                />
              </div>

              <div className="relative" ref={clientDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Clients (Optional)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <span className="truncate">
                      {selectedClients.length === 0
                        ? 'All Clients'
                        : selectedClients.length === 1
                        ? clients.find(c => c.client_id === selectedClients[0])?.client_name || '1 client'
                        : `${selectedClients.length} clients selected`}
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {clientDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-200 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClients(clients.map(c => c.client_id))}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedClients([])}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Clear All
                        </button>
                      </div>
                      {clients.map((client: Client) => (
                        <label
                          key={client.client_id}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.client_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients([...selectedClients, client.client_id])
                              } else {
                                setSelectedClients(selectedClients.filter(id => id !== client.client_id))
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{client.client_name}</span>
                        </label>
                      ))}
                      {clients.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No clients found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  <svg className={`w-4 h-4 transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configure
                </button>
              </div>
            </div>

            {/* Algorithm Configuration Panel */}
            {showAdvancedConfig && (
              <div className="border border-gray-200 rounded-lg p-5 mb-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Algorithm Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Algorithm Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="auto">Auto (Recommended)</option>
                      <option value="production">Production CP-SAT</option>
                      <option value="milp">MILP (Legacy)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {algorithm === 'auto' && 'Automatically selects the best solver for your data.'}
                      {algorithm === 'production' && 'Google OR-Tools CP-SAT constraint solver.'}
                      {algorithm === 'milp' && 'Mixed-Integer Linear Programming solver.'}
                    </p>
                  </div>

                  {/* Fairness Weight Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fairness Weight: <span className="font-semibold text-blue-600">{fairnessWeight.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={fairnessWeight}
                      onChange={(e) => setFairnessWeight(parseFloat(e.target.value))}
                      disabled={loading}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Cost Priority</span>
                      <span>Balanced</span>
                      <span>Fairness Priority</span>
                    </div>
                  </div>

                  {/* Budget Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget Limit (ZAR)</label>
                    <input
                      type="number"
                      min={0}
                      value={budgetLimit ?? ''}
                      onChange={(e) => setBudgetLimit(e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={loading}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for unconstrained optimization.</p>
                  </div>

                  {/* Night Shift Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Night Shift Hours</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">Start</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={nightStartHour}
                          onChange={(e) => setNightStartHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                      <span className="text-gray-400 mt-4">-</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">End</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={nightEndHour}
                          onChange={(e) => setNightEndHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{nightStartHour}:00 - {nightEndHour}:00 (next day)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mb-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Roster'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Background Processing</p>
                  <p>Roster generation now runs in the background. You can navigate away and come back later to check results. Large rosters may take several minutes to optimize.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-created shifts info banner */}
          {autoCreatedCount && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4 text-sm">
              <strong>Auto-setup:</strong> Created {autoCreatedCount} shifts from site staffing profiles before generating the roster.
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="space-y-6 mb-8">
              {/* Saved Rosters with Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Saved Rosters</h2>
                {savedRostersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600"></div>
                  </div>
                ) : savedRosters.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No saved rosters found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignments</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {savedRosters.map((roster: any) => (
                          <tr key={roster.id || roster.roster_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">#{roster.id || roster.roster_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {roster.start_date} - {roster.end_date}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                roster.status === 'published' ? 'bg-green-100 text-green-700' :
                                roster.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {roster.status || 'draft'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {roster.assignment_count ?? roster.total_assignments ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                  {roster.snapshot_count ?? roster.version_count ?? 1}
                                </span>
                                <button
                                  onClick={() => handleViewHistory(roster.id || roster.roster_id)}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                  title="View version history"
                                >
                                  View History
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {roster.created_at ? new Date(roster.created_at).toLocaleDateString('en-ZA') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCloneRoster(roster.id || roster.roster_id)}
                                  className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                                  title="Clone to next week"
                                >
                                  Clone
                                </button>
                                {roster.status !== 'published' && (
                                  <button
                                    onClick={() => handleRosterStatus(roster.id || roster.roster_id, 'published')}
                                    className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                  >
                                    Publish
                                  </button>
                                )}
                                {roster.status !== 'archived' && (
                                  <button
                                    onClick={() => handleRosterStatus(roster.id || roster.roster_id, 'archived')}
                                    className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    Archive
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit Log */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Audit History</h2>
                {auditLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600"></div>
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No audit history available.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLog.map((entry: any, idx: number) => (
                      <div key={entry.id || idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getActionBadge(entry.action)}`}>
                          {entry.action}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{entry.entity_type || 'roster'}</span>
                            {entry.entity_id ? ` #${entry.entity_id}` : ''}
                          </p>
                          {entry.changes && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {typeof entry.changes === 'string' ? entry.changes : JSON.stringify(entry.changes)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {entry.user_email || 'System'} &middot;{' '}
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-ZA') : '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && result.summary && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm text-gray-600">Total Cost</div>
                  <div className="text-2xl font-bold text-gray-900">
                    R{result.summary.total_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm text-gray-600">Filled Shifts</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.total_shifts_filled || 0}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm text-gray-600">Fill Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.fill_rate?.toFixed(1) || '0'}%
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm text-gray-600">Employees Used</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.summary.employees_utilized || 0}
                  </div>
                </div>
              </div>

              {/* Assignments Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Shift Assignments</h2>
                  <div className="flex items-center gap-3">
                    <ExportButtons type="roster" filters={{ start_date: startDate ? startDate.toISOString().split('T')[0] : '', end_date: endDate ? endDate.toISOString().split('T')[0] : '' }} />
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Confirm Roster
                    </button>
                  </div>
                </div>

                {result.assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No assignments could be generated. Check constraints and availability.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Site
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Start Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              End Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.assignments
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((assignment: RosterAssignment, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {assignment.employee_name || `Employee ${assignment.employee_id}`}
                                  </div>
                                  <div className="text-xs text-gray-500">ID: {assignment.employee_id}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  Site {assignment.site_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {assignment.start_time ? new Date(assignment.start_time).toLocaleString('en-ZA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {assignment.end_time ? new Date(assignment.end_time).toLocaleString('en-ZA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  R{assignment.cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {result.assignments.length > itemsPerPage && (
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
                        <div className="flex justify-between flex-1 sm:hidden">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(result.assignments.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(result.assignments.length / itemsPerPage)}
                            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                              <span className="font-medium">
                                {Math.min(currentPage * itemsPerPage, result.assignments.length)}
                              </span>{' '}
                              of <span className="font-medium">{result.assignments.length}</span> assignments
                            </p>
                          </div>
                          <div>
                            <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {Array.from({ length: Math.ceil(result.assignments.length / itemsPerPage) }, (_, i) => i + 1)
                                .filter(page => {
                                  const totalPages = Math.ceil(result.assignments.length / itemsPerPage);
                                  if (totalPages <= 7) return true;
                                  if (page === 1 || page === totalPages) return true;
                                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                                  return false;
                                })
                                .map((page, idx, arr) => {
                                  if (idx > 0 && arr[idx - 1] !== page - 1) {
                                    return (
                                      <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                        ...
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPage(page)}
                                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20'
                                        }`}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(result.assignments.length / itemsPerPage)))}
                                disabled={currentPage === Math.ceil(result.assignments.length / itemsPerPage)}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Unfilled Shifts */}
              {result.unfilled_shifts && result.unfilled_shifts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    Unfilled Shifts ({result.unfilled_shifts.length})
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Some shifts could not be filled due to constraints. Consider adjusting availability,
                    hiring more staff, or relaxing constraints.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Snapshot History Modal */}
        <Modal
          isOpen={snapshotModalOpen}
          onClose={() => { setSnapshotModalOpen(false); setSnapshotRosterId(null); setSnapshots([]); }}
          title={`Version History — Roster #${snapshotRosterId ?? ''}`}
          maxWidth="lg"
        >
          {snapshotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600"></div>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm">No version snapshots found for this roster.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              <div className="space-y-4">
                {snapshots.map((snapshot: any, idx: number) => (
                  <div key={snapshot.id || idx} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      idx === 0 ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'
                    }`}></div>

                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            Version {snapshot.version ?? snapshots.length - idx}
                          </span>
                          {idx === 0 && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              Latest
                            </span>
                          )}
                          {snapshot.status && (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                              snapshot.status === 'published' ? 'bg-green-100 text-green-700' :
                              snapshot.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {snapshot.status}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {snapshot.created_at
                            ? new Date(snapshot.created_at).toLocaleString('en-ZA', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                        {snapshot.assignment_count != null && (
                          <span>Assignments: <span className="font-medium text-gray-900">{snapshot.assignment_count}</span></span>
                        )}
                        {snapshot.total_cost != null && (
                          <span>Cost: <span className="font-medium text-gray-900">R{Number(snapshot.total_cost).toFixed(2)}</span></span>
                        )}
                        {snapshot.fill_rate != null && (
                          <span>Fill Rate: <span className="font-medium text-gray-900">{Number(snapshot.fill_rate).toFixed(1)}%</span></span>
                        )}
                        {snapshot.algorithm && (
                          <span>Algorithm: <span className="font-medium text-gray-900">{snapshot.algorithm}</span></span>
                        )}
                      </div>

                      {snapshot.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{snapshot.notes}</p>
                      )}

                      {snapshot.changed_by && (
                        <p className="text-xs text-gray-400 mt-1">by {snapshot.changed_by}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </DashboardLayout>
    </>
  )
}
