'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DatePicker from '@/components/DatePicker'
import { clientsApi, sitesApi } from '@/services/api'
import { getApiUrl } from '@/lib/config'
import { useToast } from '@/context/ToastContext'
import {
  Client,
  Site,
  RosterGenerateResponse,
  RosterConstraints,
  RosterPreferences,
  ConstraintLevel,
  RosterAlgorithm,
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
  const steps = ['Dates & Sites', 'Constraints', 'Preferences', 'Results']

  // Step 1: Dates & Sites
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [selectedSites, setSelectedSites] = useState<number[]>([])
  const [selectAllSites, setSelectAllSites] = useState(true)

  // Step 2: Constraints
  const [constraints, setConstraints] = useState<RosterConstraints>({
    psira_compliance: 'WARNING',
    firearm_competency: 'HARD',
    skill_matching: 'HARD',
    availability: 'HARD',
    client_assignment: 'SOFT',
    max_hours_per_week: 48,
    min_rest_hours: 8,
    max_consecutive_days: 6,
    max_consecutive_nights: 3,
  })
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>(undefined)

  // Step 3: Preferences
  const [algorithm, setAlgorithm] = useState<RosterAlgorithm>('auto')
  const [fairnessWeight, setFairnessWeight] = useState(0.2)
  const [preferences, setPreferences] = useState<RosterPreferences>({
    fairness_weight: 0.2,
    prefer_client_experience: true,
    prefer_site_experience: true,
    minimize_travel: false,
  })

  // Step 4: Results
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
        setClients(clientsRes.data)
        setSites(sitesRes.data)
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
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${getApiUrl()}/api/v1/roster/generate?algorithm=${algorithm}`,
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
        setStep(3) // Go to results
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate roster')
      showError('Generation Failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Confirm roster
  const handleConfirm = async () => {
    if (!result || !result.assignments) return

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${getApiUrl()}/api/v1/roster/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(result.assignments),
      })

      if (!response.ok) {
        throw new Error('Failed to confirm roster')
      }

      success('Roster Confirmed', 'Shift assignments have been saved')
      router.push('/roster/assignments')
    } catch (err: any) {
      showError('Confirmation Failed', err.message)
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
  const isDateRangeWarning = dayCount > 7 && dayCount <= 14
  const isDateRangeBlocked = dayCount > 14

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
    if (step === 2) {
      handleGenerate()
    } else if (canProceed()) {
      setStep((prev) => Math.min(prev + 1, 3))
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
                {step === 3 ? 'Confirming Roster...' : 'Generating Roster...'}
              </h3>
              <p className="text-sm text-gray-600">
                This may take a few minutes for large date ranges
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
                            Maximum 14 days per roster. Please generate week by week for best results.
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
                            Longer ranges may take more time to optimize. Consider generating week by week for faster results.
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
                    2 Weeks (max)
                  </button>
                </div>
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
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Optimization Preferences</h2>

              {/* Algorithm Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Algorithm
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="algorithm"
                      value="auto"
                      checked={algorithm === 'auto'}
                      onChange={() => setAlgorithm('auto')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">
                      <span className="font-medium">Auto</span>
                      <span className="text-gray-500 text-sm ml-2">(Recommended)</span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="algorithm"
                      value="production"
                      checked={algorithm === 'production'}
                      onChange={() => setAlgorithm('production')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">
                      <span className="font-medium">Production</span>
                      <span className="text-gray-500 text-sm ml-2">(Precise, slower)</span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="algorithm"
                      value="milp"
                      checked={algorithm === 'milp'}
                      onChange={() => setAlgorithm('milp')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">
                      <span className="font-medium">Legacy MILP</span>
                      <span className="text-gray-500 text-sm ml-2">(Older algorithm)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Fairness Weight Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost vs Fairness Balance
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
                <div className="text-center text-sm text-gray-600 mt-1">
                  {fairnessWeight.toFixed(1)}
                </div>
              </div>

              {/* Preference Checkboxes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimization Preferences
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.prefer_client_experience}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          prefer_client_experience: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Prefer employees with client experience
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.prefer_site_experience}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          prefer_site_experience: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Prefer employees with site experience
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.minimize_travel}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          minimize_travel: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Minimize travel distance
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Generation Results</h2>

              {generationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  <strong>Error:</strong> {generationError}
                </div>
              )}

              {result && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        R{result.summary.total_cost?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-blue-600">Total Cost</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {result.summary.fill_rate?.toFixed(0) || 0}%
                      </div>
                      <div className="text-sm text-green-600">Fill Rate</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {result.summary.total_shifts_filled || 0}
                      </div>
                      <div className="text-sm text-purple-600">Shifts Filled</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-700">
                        {result.summary.employees_utilized || 0}
                      </div>
                      <div className="text-sm text-orange-600">Staff Used</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        ⚠ {result.warnings.length} Warning(s)
                      </h3>
                      <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                        {result.warnings.slice(0, 10).map((w: RosterWarning, i: number) => (
                          <li key={i}>• {w.message}</li>
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
                            • Site {s.site_id}: {new Date(s.start_time).toLocaleDateString()}
                            {s.reason && ` - ${s.reason}`}
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

                  {/* Status */}
                  <div className="mb-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        result.status === 'optimal'
                          ? 'bg-emerald-50 text-emerald-700'
                          : result.status === 'feasible'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      Status: {result.status}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      Algorithm: {result.algorithm_used}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={handleConfirm}
                      disabled={loading || result.assignments.length === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Confirm Roster
                    </button>
                    <button
                      onClick={() => router.push('/roster/assignments')}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      View Assignments
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
          {step < 3 && (
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
                {step === 2 ? 'Generate Roster' : 'Next →'}
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
