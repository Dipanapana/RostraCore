'use client'

import { useState, useEffect } from 'react'
import { AvailabilityPattern, AvailabilityCalendarDay, PatternType } from '@/types'
import { availabilityPatternsApi } from '@/services/api'
import { Plus, Trash2, Calendar, Clock, Check, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react'

interface EmployeeAvailabilityPatternsProps {
  employeeId: number
  employeeName: string
  onClose?: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export default function EmployeeAvailabilityPatterns({ employeeId, employeeName, onClose }: EmployeeAvailabilityPatternsProps) {
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarData, setCalendarData] = useState<AvailabilityCalendarDay[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // Form state
  const [formData, setFormData] = useState({
    pattern_name: '',
    pattern_type: 'recurring_weekly' as PatternType,
    effective_from: '',
    effective_to: '',
    priority: 5,
    // Weekly schedule
    monday_available: true,
    monday_start: '06:00',
    monday_end: '18:00',
    tuesday_available: true,
    tuesday_start: '06:00',
    tuesday_end: '18:00',
    wednesday_available: true,
    wednesday_start: '06:00',
    wednesday_end: '18:00',
    thursday_available: true,
    thursday_start: '06:00',
    thursday_end: '18:00',
    friday_available: true,
    friday_start: '06:00',
    friday_end: '18:00',
    saturday_available: false,
    saturday_start: '06:00',
    saturday_end: '14:00',
    sunday_available: false,
    sunday_start: '',
    sunday_end: '',
  })

  // Quick setup state
  const [quickSetup, setQuickSetup] = useState({
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    weekday_start: '06:00',
    weekday_end: '18:00',
    include_saturday: false,
    saturday_start: '06:00',
    saturday_end: '14:00',
  })

  useEffect(() => {
    fetchPatterns()
  }, [employeeId])

  const fetchPatterns = async () => {
    try {
      setLoading(true)
      const response = await availabilityPatternsApi.getForEmployee(employeeId, false)
      setPatterns(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch availability patterns')
    } finally {
      setLoading(false)
    }
  }

  const fetchCalendar = async () => {
    const startDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const endDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)

    try {
      setCalendarLoading(true)
      const response = await availabilityPatternsApi.getCalendar(
        employeeId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      setCalendarData(response.data.calendar)
    } catch (err: any) {
      console.error('Failed to fetch calendar:', err)
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    if (showCalendar) {
      fetchCalendar()
    }
  }, [showCalendar, calendarMonth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data: any = {
        pattern_name: formData.pattern_name,
        pattern_type: formData.pattern_type,
        effective_from: formData.effective_from,
        priority: formData.priority,
      }

      if (formData.effective_to) data.effective_to = formData.effective_to

      // Add weekly schedule
      DAY_KEYS.forEach(day => {
        data[`${day}_available`] = formData[`${day}_available` as keyof typeof formData]
        if (formData[`${day}_available` as keyof typeof formData]) {
          data[`${day}_start`] = formData[`${day}_start` as keyof typeof formData]
          data[`${day}_end`] = formData[`${day}_end` as keyof typeof formData]
        }
      })

      await availabilityPatternsApi.create(employeeId, data)
      await fetchPatterns()
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create pattern')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickSetup = async () => {
    setSaving(true)
    setError(null)

    try {
      await availabilityPatternsApi.createStandard(employeeId, quickSetup)
      await fetchPatterns()
      setShowQuickSetup(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create standard pattern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (patternId: number) => {
    if (!confirm('Are you sure you want to delete this availability pattern?')) return

    try {
      await availabilityPatternsApi.delete(employeeId, patternId)
      await fetchPatterns()
    } catch (err: any) {
      alert('Failed to delete pattern: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleToggleActive = async (pattern: AvailabilityPattern) => {
    try {
      await availabilityPatternsApi.update(employeeId, pattern.pattern_id, {
        is_active: !pattern.is_active
      })
      await fetchPatterns()
    } catch (err: any) {
      alert('Failed to update pattern: ' + (err.response?.data?.detail || err.message))
    }
  }

  const resetForm = () => {
    setFormData({
      pattern_name: '',
      pattern_type: 'recurring_weekly',
      effective_from: '',
      effective_to: '',
      priority: 5,
      monday_available: true,
      monday_start: '06:00',
      monday_end: '18:00',
      tuesday_available: true,
      tuesday_start: '06:00',
      tuesday_end: '18:00',
      wednesday_available: true,
      wednesday_start: '06:00',
      wednesday_end: '18:00',
      thursday_available: true,
      thursday_start: '06:00',
      thursday_end: '18:00',
      friday_available: true,
      friday_start: '06:00',
      friday_end: '18:00',
      saturday_available: false,
      saturday_start: '06:00',
      saturday_end: '14:00',
      sunday_available: false,
      sunday_start: '',
      sunday_end: '',
    })
  }

  const formatDateRange = (pattern: AvailabilityPattern) => {
    const from = new Date(pattern.effective_from).toLocaleDateString()
    if (pattern.effective_to) {
      const to = new Date(pattern.effective_to).toLocaleDateString()
      return `${from} - ${to}`
    }
    return `From ${from} (ongoing)`
  }

  const getActiveDays = (pattern: AvailabilityPattern) => {
    const days = []
    if (pattern.monday_available) days.push('Mon')
    if (pattern.tuesday_available) days.push('Tue')
    if (pattern.wednesday_available) days.push('Wed')
    if (pattern.thursday_available) days.push('Thu')
    if (pattern.friday_available) days.push('Fri')
    if (pattern.saturday_available) days.push('Sat')
    if (pattern.sunday_available) days.push('Sun')
    return days.join(', ') || 'None'
  }

  const renderCalendar = () => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0
    const days = []

    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`pad-${i}`} className="h-10"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const calDay = calendarData.find(d => d.date === dateStr)
      const isAvailable = calDay?.is_available ?? true

      days.push(
        <div
          key={day}
          className={`h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            isAvailable
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
          title={calDay?.reason || (isAvailable ? 'Available' : 'Not available')}
        >
          {day}
        </div>
      )
    }

    return days
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Availability Patterns for {employeeName}
          </h3>
          <p className="text-sm text-gray-500">
            Define recurring weekly availability or specific date ranges
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCalendar
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
          {patterns.length === 0 && (
            <button
              onClick={() => setShowQuickSetup(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Quick Setup
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Pattern
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Calendar View */}
      {showCalendar && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-medium text-gray-900">
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {calendarLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100"></div>
              Available
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-100"></div>
              Not Available
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Patterns List */}
      {!loading && patterns.length === 0 && (
        <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h4 className="text-lg font-medium text-gray-700 mb-1">
            No Availability Patterns Yet
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Set up availability patterns to define when this employee can work.
          </p>
          <button
            onClick={() => setShowQuickSetup(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick Setup (Mon-Fri 06:00-18:00)
          </button>
        </div>
      )}

      {!loading && patterns.length > 0 && (
        <div className="space-y-4">
          {patterns.map(pattern => (
            <div
              key={pattern.pattern_id}
              className={`bg-white border rounded-xl p-4 ${
                pattern.is_active
                  ? 'border-gray-200'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">
                      {pattern.pattern_name}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {pattern.pattern_type.replace('_', ' ')}
                    </span>
                    {!pattern.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(pattern)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getActiveDays(pattern)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(pattern)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      pattern.is_active
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    {pattern.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(pattern.pattern_id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Setup Modal */}
      {showQuickSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Setup - Standard Work Week
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Create a standard Monday-Friday availability pattern
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={quickSetup.effective_from}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, effective_from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={quickSetup.effective_to}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, effective_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekday Start
                  </label>
                  <input
                    type="time"
                    value={quickSetup.weekday_start}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekday_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekday End
                  </label>
                  <input
                    type="time"
                    value={quickSetup.weekday_end}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekday_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_saturday"
                  checked={quickSetup.include_saturday}
                  onChange={(e) => setQuickSetup(prev => ({ ...prev, include_saturday: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="include_saturday" className="text-sm text-gray-700">
                  Include Saturday
                </label>
              </div>

              {quickSetup.include_saturday && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saturday Start
                    </label>
                    <input
                      type="time"
                      value={quickSetup.saturday_start}
                      onChange={(e) => setQuickSetup(prev => ({ ...prev, saturday_start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saturday End
                    </label>
                    <input
                      type="time"
                      value={quickSetup.saturday_end}
                      onChange={(e) => setQuickSetup(prev => ({ ...prev, saturday_end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowQuickSetup(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickSetup}
                disabled={saving || !quickSetup.effective_from}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create Pattern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Pattern Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Availability Pattern
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pattern_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, pattern_name: e.target.value }))}
                    placeholder="e.g., Regular Work Week, Holiday Schedule"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for ongoing</p>
                </div>
              </div>

              {/* Weekly Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Weekly Schedule
                </label>
                <div className="space-y-2">
                  {DAY_KEYS.map((day, idx) => (
                    <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-24">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData[`${day}_available` as keyof typeof formData] as boolean}
                            onChange={(e) => setFormData(prev => ({ ...prev, [`${day}_available`]: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{DAYS[idx]}</span>
                        </label>
                      </div>
                      {formData[`${day}_available` as keyof typeof formData] && (
                        <>
                          <input
                            type="time"
                            value={formData[`${day}_start` as keyof typeof formData] as string}
                            onChange={(e) => setFormData(prev => ({ ...prev, [`${day}_start`]: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded bg-white text-sm text-gray-900"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={formData[`${day}_end` as keyof typeof formData] as string}
                            onChange={(e) => setFormData(prev => ({ ...prev, [`${day}_end`]: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded bg-white text-sm text-gray-900"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Add Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
