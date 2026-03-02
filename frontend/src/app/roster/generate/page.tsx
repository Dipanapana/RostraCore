'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DatePicker from '@/components/DatePicker'
import { clientsApi, sitesApi, shiftsApi } from '@/services/api'
import { getApiUrl } from '@/lib/config'
import { downloadRosterExcel } from '@/lib/excelExport'
import { useToast } from '@/context/ToastContext'
import {
  Client,
  Site,
  RosterGenerateResponse,
  RosterConstraints,
  RosterPreferences,
  ConstraintLevel,
  RosterWarning,
  UnfilledShift,
} from '@/types'

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 w-16 md:w-24 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <span
            key={index}
            className={`text-xs md:text-sm ${
              index === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

// Constraint dropdown component
function ConstraintDropdown({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: ConstraintLevel
  onChange: (value: ConstraintLevel) => void
  description?: string
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ConstraintLevel)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="HARD">Required (Hard)</option>
        <option value="SOFT">Preferred (Soft)</option>
        <option value="WARNING">Warn Only</option>
        <option value="DISABLED">Disabled</option>
      </select>
    </div>
  )
}

export default function RosterGenerateWizard() {
  const router = useRouter()
  const { success, error: showError, warning } = useToast()
  const [step, setStep] = useState(0)
  const steps = ['Dates & Sites', 'Constraints', 'Results']

  // Step 1: Dates & Sites
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [selectedSites, setSelectedSites] = useState<number[]>([])
  const [selectAllSites, setSelectAllSites] = useState(true)
  const [autoGenerateShifts, setAutoGenerateShifts] = useState(true)

  // Step 2: Constraints
  const [constraints, setConstraints] = useState<RosterConstraints>({
    psira_compliance: 'WARNING',
    firearm_competency: 'HARD',
    skill_matching: 'HARD',
    availability: 'HARD',
    client_assignment: 'SOFT',
    max_hours_per_week: 48,
    min_rest_hours: 12,
    max_consecutive_days: 6,
    max_consecutive_nights: 3,
  })
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>(undefined)

  // Step 2 continued: Preferences (merged with Constraints step)
  const [fairnessWeight, setFairnessWeight] = useState(0.2)
  const [preferences, setPreferences] = useState<RosterPreferences>({
    fairness_weight: 0.2,
    prefer_client_experience: true,
    prefer_site_experience: true,
    minimize_travel: false,
  })

  // Step 3: Results
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RosterGenerateResponse | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Fetch clients and sites on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, sitesRes] = await Promise.all([
          clientsApi.getAll(),
          sitesApi.getAll(),
        ])
        setClients(Array.isArray(clientsRes.data) ? clientsRes.data : [])
        setSites(Array.isArray(sitesRes.data) ? sitesRes.data : [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }
    fetchData()
  }, [])

  // Quick date range selectors
  const setThisWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setStartDate(monday)
    setEndDate(sunday)
  }

  const setNextWeek = () => {
    const today = new Date()
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() - today.getDay() + 8)
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    setStartDate(nextMonday)
    setEndDate(nextSunday)
  }

  const setTwoWeeks = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const twoWeeksLater = new Date(monday)
    twoWeeksLater.setDate(monday.getDate() + 13)
    setStartDate(monday)
    setEndDate(twoWeeksLater)
  }

  const setThisMonth = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setStartDate(firstDay)
    setEndDate(lastDay)
  }

  const setNextMonth = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    setStartDate(firstDay)
    setEndDate(lastDay)
  }

  // Filter sites by selected clients
  const filteredSites = selectedClients.length > 0
    ? sites.filter((site: any) => selectedClients.includes(site.client_id))
    : sites

  // Handle site selection
  const toggleSite = (siteId: number) => {
    setSelectAllSites(false)
    setSelectedSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    )
  }

  const handleSelectAllSites = () => {
    setSelectAllSites(true)
    setSelectedSites([])
  }

  // Format date for API
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Generate roster
  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showError('Missing Dates', 'Please select start and end dates')
      return
    }

    setLoading(true)
    setGenerationError(null)
    setResult(null)

    try {
      // Auto-generate shifts from site profiles if enabled
      if (autoGenerateShifts) {
        try {
          const siteIdsToGenerate = selectAllSites ? undefined : selectedSites
          await shiftsApi.generateFromProfiles({
            site_ids: siteIdsToGenerate,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
          })
        } catch (err: any) {
          console.warn('Auto-generate shifts warning:', err.message)
          // Continue with roster generation even if shift auto-gen has issues
        }
      }

      const token = localStorage.getItem('access_token')
      // In dev, call backend directly to avoid Next.js proxy 30s timeout
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : getApiUrl()
      const response = await fetch(
        `${baseUrl}/api/v1/roster/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            site_ids: selectAllSites ? undefined : selectedSites,
            client_ids: selectedClients.length > 0 ? selectedClients : undefined,
            budget_limit: budgetLimit,
            // Note: constraints and preferences might need backend support
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate roster')
      }

      const data: RosterGenerateResponse = await response.json()

      if (data.status === 'error' || (data.assignments && data.assignments.length === 0 && data.unfilled_shifts?.length === 0)) {
        setGenerationError('No shifts found for the selected date range and sites. Please create shifts first.')
        setResult(null)
      } else {
        setResult(data)
        if (data.warnings && data.warnings.length > 0) {
          warning(
            `Generated with ${data.warnings.length} warning(s)`,
            'Review warnings before confirming'
          )
        } else {
          success('Roster Generated', `${data.summary.total_shifts_filled} shifts assigned`)
        }
        setStep(2) // Go to results
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate roster')
      showError('Generation Failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Download roster as formatted Excel spreadsheet (3 sheets: Summary, Assignments, By Site)
  const handleDownloadExcel = (data: RosterGenerateResponse) => {
    downloadRosterExcel(data, startDate, endDate)
  }

  // Save & confirm roster (creates a Roster entry + assignments for the board)
  const handleConfirm = async () => {
    if (!result || !result.assignments) return

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')

      // Build roster name from dates
      const startStr = startDate ? startDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
      const endStr = endDate ? endDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
      const rosterName = `Roster ${startStr} - ${endStr}`

      // Save via /roster/save which creates a Roster record + ShiftAssignments
      const response = await fetch(`${getApiUrl()}/api/v1/roster/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: rosterName,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
          assignments: result.assignments,
          summary: result.summary || {},
          solver_status: result.status || 'optimal',
          algorithm_used: result.algorithm_used || 'cpsat_partitioned',
          optimization_duration_seconds: result.timing?.total || 0,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to save roster')
      }

      const savedRoster = await response.json()
      success('Roster Saved', `${rosterName} saved with ${result.assignments.length} assignments`)

      // Navigate to the roster board with the new roster selected
      router.push(`/roster/board?id=${savedRoster.roster_id}`)
    } catch (err: any) {
      showError('Save Failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate days between dates
  const getDaysBetween = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0
    const diffTime = end.getTime() - start.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end
  }

  const dayCount = getDaysBetween(startDate, endDate)
  const isDateRangeWarning = dayCount > 14 && dayCount <= 31
  const isDateRangeBlocked = dayCount > 31

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 0:
        return startDate && endDate && !isDateRangeBlocked
      case 1:
        return true
      case 2:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === 1) {
      handleGenerate()
    } else if (canProceed()) {
      setStep((prev) => Math.min(prev + 1, 2))
    }
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Generate Roster</h1>
          <p className="text-gray-600 text-sm md:text-base">
            AI-powered shift optimization wizard
          </p>
        </div>

        <StepIndicator currentStep={step} steps={steps} />

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step === 2 ? 'Confirming Roster...' : 'Generating Roster...'}
              </h3>
              <p className="text-sm text-gray-600">
                {dayCount <= 7
                  ? 'Optimizing weekly roster...'
                  : dayCount <= 14
                  ? 'Optimizing bi-weekly roster — this may take 15-30 seconds...'
                  : 'Optimizing monthly roster — this may take up to 60 seconds...'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {/* Step 0: Dates & Sites */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Date Range & Sites</h2>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <DatePicker
                  selected={startDate}
                  onChange={setStartDate}
                  label="Start Date"
                  placeholderText="Select start date"
                />
                <DatePicker
                  selected={endDate}
                  onChange={setEndDate}
                  minDate={startDate || undefined}
                  label="End Date"
                  placeholderText="Select end date"
                />
              </div>

              {/* Date Range Feedback */}
              {dayCount > 0 && (
                <div className="mb-4">
                  {isDateRangeBlocked ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            Date range too long ({dayCount} days)
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Maximum 31 days per roster. Use monthly presets or select a shorter range.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isDateRangeWarning ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            {dayCount} days selected
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Longer ranges may take more time to optimize. Monthly rosters typically solve within 60 seconds.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-800">
                          {dayCount} day{dayCount !== 1 ? 's' : ''} selected - optimal range
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Select Buttons */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Select (Recommended)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={setThisWeek}
                    className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md font-medium"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={setNextWeek}
                    className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md font-medium"
                  >
                    Next Week
                  </button>
                  <button
                    type="button"
                    onClick={setTwoWeeks}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    2 Weeks
                  </button>
                  <button
                    type="button"
                    onClick={setThisMonth}
                    className="px-3 py-1.5 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md font-medium"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={setNextMonth}
                    className="px-3 py-1.5 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md font-medium"
                  >
                    Next Month
                  </button>
                </div>
              </div>

              {/* Auto-Generate Shifts Toggle */}
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateShifts}
                    onChange={(e) => setAutoGenerateShifts(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-emerald-800">Auto-generate shifts for this period</span>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Creates day and night shifts from site staffing profiles before running the optimizer.
                      This ensures shifts exist for the selected dates. Existing shifts are not duplicated.
                    </p>
                  </div>
                </label>
              </div>

              {/* Client Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Clients (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClients(clients.map((c) => c.client_id))}
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
                <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                  {clients.map((client) => (
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
                            setSelectedClients(
                              selectedClients.filter((id) => id !== client.client_id)
                            )
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{client.client_name}</span>
                    </label>
                  ))}
                  {clients.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No clients found</div>
                  )}
                </div>
              </div>

              {/* Site Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sites
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSites}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      selectAllSites
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    All Sites ({filteredSites.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectAllSites(false)
                      setSelectedSites(filteredSites.map((s: any) => s.site_id))
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      !selectAllSites && selectedSites.length === filteredSites.length
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Select Specific
                  </button>
                </div>
                {!selectAllSites && (
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {filteredSites.map((site: any) => (
                      <label
                        key={site.site_id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site.site_id)}
                          onChange={() => toggleSite(site.site_id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {site.site_name}
                          {site.client_name && (
                            <span className="text-gray-400 ml-1">({site.client_name})</span>
                          )}
                        </span>
                      </label>
                    ))}
                    {filteredSites.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No sites found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Constraints */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Constraints & Budget</h2>

              {/* Budget */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Limit (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">R</span>
                  <input
                    type="number"
                    value={budgetLimit || ''}
                    onChange={(e) =>
                      setBudgetLimit(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="No limit"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Constraint Enforcement */}
              <h3 className="text-lg font-medium mb-3">Constraint Enforcement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <ConstraintDropdown
                  label="PSIRA Compliance"
                  value={constraints.psira_compliance || 'WARNING'}
                  onChange={(v) => setConstraints({ ...constraints, psira_compliance: v })}
                  description="Require valid PSIRA registration"
                />
                <ConstraintDropdown
                  label="Firearm Competency"
                  value={constraints.firearm_competency || 'HARD'}
                  onChange={(v) => setConstraints({ ...constraints, firearm_competency: v })}
                  description="For armed response positions"
                />
                <ConstraintDropdown
                  label="Skill Matching"
                  value={constraints.skill_matching || 'HARD'}
                  onChange={(v) => setConstraints({ ...constraints, skill_matching: v })}
                  description="Match employee skills to site requirements"
                />
                <ConstraintDropdown
                  label="Availability"
                  value={constraints.availability || 'HARD'}
                  onChange={(v) => setConstraints({ ...constraints, availability: v })}
                  description="Respect employee availability"
                />
                <ConstraintDropdown
                  label="Client Assignment"
                  value={constraints.client_assignment || 'SOFT'}
                  onChange={(v) => setConstraints({ ...constraints, client_assignment: v })}
                  description="Prefer employees assigned to specific clients"
                />
              </div>

              {/* BCEA Limits */}
              <h3 className="text-lg font-medium mb-3">BCEA Compliance Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Hours/Week
                  </label>
                  <input
                    type="number"
                    value={constraints.max_hours_per_week || 48}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        max_hours_per_week: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Rest Hours
                  </label>
                  <input
                    type="number"
                    value={constraints.min_rest_hours || 8}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        min_rest_hours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Consec. Days
                  </label>
                  <input
                    type="number"
                    value={constraints.max_consecutive_days || 6}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        max_consecutive_days: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Consec. Nights
                  </label>
                  <input
                    type="number"
                    value={constraints.max_consecutive_nights || 3}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        max_consecutive_nights: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Fairness Weight Slider */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Optimization Balance</h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost vs Fairness
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Cost</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={fairnessWeight}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setFairnessWeight(value)
                      setPreferences({ ...preferences, fairness_weight: value })
                    }}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Fair</span>
                </div>
                <p className="text-center text-sm text-gray-600 mt-1">
                  {fairnessWeight.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Results */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              {generationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  <strong>Error:</strong> {generationError}
                </div>
              )}

              {result && (
                <>
                  {/* Success Banner */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-6 mb-6 text-white animate-slideIn">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 bg-white/5 rounded-full" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Roster Generated Successfully</h2>
                        <p className="text-emerald-100 text-sm mt-0.5">
                          {result.summary?.total_shifts_filled || 0} shifts across {result.summary?.employees_utilized || 0} guards
                          {result.status === 'optimal' ? ' — Optimal solution found' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Animated Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                      <div className="text-2xl font-bold text-blue-700 animate-count-up">
                        R{(result.summary?.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs font-medium text-blue-500 mt-1 uppercase tracking-wide">Total Cost</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                      <div className="text-2xl font-bold text-emerald-700 animate-count-up">
                        {result.summary?.fill_rate?.toFixed(0) || 0}%
                      </div>
                      <div className="text-xs font-medium text-emerald-500 mt-1 uppercase tracking-wide">Fill Rate</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                      <div className="text-2xl font-bold text-purple-700 animate-count-up">
                        {result.summary?.total_shifts_filled || 0}
                      </div>
                      <div className="text-xs font-medium text-purple-500 mt-1 uppercase tracking-wide">Shifts Filled</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                      <div className="text-2xl font-bold text-amber-700 animate-count-up">
                        {result.summary?.employees_utilized || 0}
                      </div>
                      <div className="text-xs font-medium text-amber-500 mt-1 uppercase tracking-wide">Guards Deployed</div>
                    </div>
                  </div>

                  {/* Status + Engine Badge */}
                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        result.status === 'optimal'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : result.status === 'feasible'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        result.status === 'optimal' ? 'bg-emerald-500' : result.status === 'feasible' ? 'bg-blue-500' : 'bg-red-500'
                      }`} />
                      {result.status === 'optimal' ? 'Optimal' : result.status === 'feasible' ? 'Feasible' : result.status}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      OR-Tools CP-SAT
                    </span>
                    {result.timing?.total && (
                      <span className="text-sm text-gray-400">
                        Solved in {result.timing.total.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        {result.warnings.length} Warning(s)
                      </h3>
                      <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                        {result.warnings.slice(0, 10).map((w: RosterWarning, i: number) => (
                          <li key={i}>- {w.message}</li>
                        ))}
                        {result.warnings.length > 10 && (
                          <li className="italic">
                            ... and {result.warnings.length - 10} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Unfilled Shifts */}
                  {result.unfilled_shifts && result.unfilled_shifts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-red-800 mb-2">
                        {result.unfilled_shifts.length} Unfilled Shift(s)
                      </h3>
                      <p className="text-sm text-red-700 mb-2">
                        These shifts could not be filled due to constraints:
                      </p>
                      <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        {result.unfilled_shifts.slice(0, 5).map((s: UnfilledShift, i: number) => (
                          <li key={i}>
                            - Site {s.site_id}: {new Date(s.start_time).toLocaleDateString()}
                            {s.reason && ` — ${s.reason}`}
                          </li>
                        ))}
                        {result.unfilled_shifts.length > 5 && (
                          <li className="italic">
                            ... and {result.unfilled_shifts.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => handleDownloadExcel(result)}
                      disabled={result.assignments.length === 0}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Excel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading || result.assignments.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      {loading ? 'Saving...' : 'Save & Open Board'}
                    </button>
                    <button
                      onClick={() => router.push('/roster/board')}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      View Rosters
                    </button>
                    <button
                      onClick={() => {
                        setResult(null)
                        setStep(0)
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Start Over
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 2 && (
            <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {step === 1 ? 'Generate Roster' : 'Next →'}
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Need help?{' '}
          <a href="/shifts" className="text-blue-600 hover:underline">
            Create shifts first
          </a>{' '}
          or{' '}
          <a href="/roster" className="text-blue-600 hover:underline">
            use the simple generator
          </a>
        </div>
      </div>
    </DashboardLayout>
  )
}
