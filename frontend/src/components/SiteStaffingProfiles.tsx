'use client'

import { useState, useEffect } from 'react'
import { StaffingProfile, PeriodType, DayType } from '@/types'
import { staffingProfilesApi } from '@/services/api'
import { Plus, Trash2, Clock, Users, Sun, Moon, Calendar, Zap } from 'lucide-react'

interface SiteStaffingProfilesProps {
  siteId: number
  siteName: string
  onClose?: () => void
}

const PERIOD_OPTIONS: { value: PeriodType; label: string; icon: React.ReactNode }[] = [
  { value: 'day', label: 'Day Shift (06:00-18:00)', icon: <Sun className="w-4 h-4" /> },
  { value: 'night', label: 'Night Shift (18:00-06:00)', icon: <Moon className="w-4 h-4" /> },
  { value: 'all_day', label: 'All Day (24hr)', icon: <Clock className="w-4 h-4" /> },
  { value: 'custom', label: 'Custom Time', icon: <Calendar className="w-4 h-4" /> },
]

const DAY_OPTIONS: { value: DayType; label: string }[] = [
  { value: 'weekday', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekend', label: 'Weekends (Sat-Sun)' },
  { value: 'all', label: 'All Days' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'public_holiday', label: 'Public Holidays' },
]

const PSIRA_GRADES = ['A', 'B', 'C', 'D', 'E', 'any']

export default function SiteStaffingProfiles({ siteId, siteName, onClose }: SiteStaffingProfilesProps) {
  const [profiles, setProfiles] = useState<StaffingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    profile_name: '',
    period_type: 'day' as PeriodType,
    day_type: 'weekday' as DayType,
    required_staff: 1,
    required_skill: '',
    required_psira_grade: '',
    requires_firearm: false,
    priority: 10,
    custom_start_time: '',
    custom_end_time: '',
  })

  // Quick setup state
  const [quickSetup, setQuickSetup] = useState({
    weekday_day_staff: 4,
    weekday_night_staff: 2,
    weekend_day_staff: 2,
    weekend_night_staff: 1,
  })

  useEffect(() => {
    fetchProfiles()
  }, [siteId])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const response = await staffingProfilesApi.getForSite(siteId, false)
      setProfiles(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch staffing profiles')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const data: any = {
        profile_name: formData.profile_name,
        period_type: formData.period_type,
        day_type: formData.day_type,
        required_staff: formData.required_staff,
        priority: formData.priority,
      }

      if (formData.required_skill) data.required_skill = formData.required_skill
      if (formData.required_psira_grade) data.required_psira_grade = formData.required_psira_grade
      if (formData.requires_firearm) data.requires_firearm = formData.requires_firearm
      if (formData.period_type === 'custom') {
        data.custom_start_time = formData.custom_start_time
        data.custom_end_time = formData.custom_end_time
      }

      await staffingProfilesApi.create(siteId, data)
      await fetchProfiles()
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create profile')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickSetup = async () => {
    setSaving(true)
    setError(null)

    try {
      await staffingProfilesApi.createStandard(siteId, quickSetup)
      await fetchProfiles()
      setShowQuickSetup(false)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create standard profiles')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (profileId: number) => {
    if (!confirm('Are you sure you want to delete this staffing profile?')) return

    try {
      await staffingProfilesApi.delete(siteId, profileId)
      await fetchProfiles()
    } catch (err: any) {
      alert('Failed to delete profile: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleToggleActive = async (profile: StaffingProfile) => {
    try {
      await staffingProfilesApi.update(siteId, profile.profile_id, {
        is_active: !profile.is_active
      })
      await fetchProfiles()
    } catch (err: any) {
      alert('Failed to update profile: ' + (err.response?.data?.detail || err.message))
    }
  }

  const resetForm = () => {
    setFormData({
      profile_name: '',
      period_type: 'day',
      day_type: 'weekday',
      required_staff: 1,
      required_skill: '',
      required_psira_grade: '',
      requires_firearm: false,
      priority: 10,
      custom_start_time: '',
      custom_end_time: '',
    })
  }

  const getPeriodLabel = (period: PeriodType) => {
    const option = PERIOD_OPTIONS.find(o => o.value === period)
    return option?.label || period
  }

  const getDayLabel = (day: DayType) => {
    const option = DAY_OPTIONS.find(o => o.value === day)
    return option?.label || day
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Staffing Profiles for {siteName}
          </h3>
          <p className="text-sm text-gray-500">
            Define different staffing requirements for day/night shifts and weekdays/weekends
          </p>
        </div>
        <div className="flex gap-2">
          {profiles.length === 0 && (
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
            Add Profile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Profiles List */}
      {!loading && profiles.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h4 className="text-lg font-medium text-gray-700 mb-1">
            No Staffing Profiles Yet
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Set up staffing profiles to define how many guards are needed at different times.
          </p>
          <button
            onClick={() => setShowQuickSetup(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick Setup (4 Standard Profiles)
          </button>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid gap-4">
          {profiles.map(profile => (
            <div
              key={profile.profile_id}
              className={`bg-white border rounded-xl p-4 ${
                profile.is_active
                  ? 'border-gray-200'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">
                      {profile.profile_name}
                    </h4>
                    {!profile.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      {profile.period_type === 'day' && <Sun className="w-4 h-4 text-yellow-500" />}
                      {profile.period_type === 'night' && <Moon className="w-4 h-4 text-indigo-500" />}
                      {profile.period_type === 'all_day' && <Clock className="w-4 h-4 text-blue-500" />}
                      {getPeriodLabel(profile.period_type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {getDayLabel(profile.day_type)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-blue-600">
                      <Users className="w-4 h-4" />
                      {profile.required_staff} guard{profile.required_staff !== 1 ? 's' : ''}
                    </span>
                    {profile.required_psira_grade && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        PSIRA {profile.required_psira_grade}
                      </span>
                    )}
                    {profile.requires_firearm && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        Armed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(profile)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      profile.is_active
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    {profile.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(profile.profile_id)}
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
              Quick Setup - Standard Profiles
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Create 4 standard staffing profiles (Weekday Day, Weekday Night, Weekend Day, Weekend Night)
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekday Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickSetup.weekday_day_staff}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekday_day_staff: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekday Night
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickSetup.weekday_night_staff}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekday_night_staff: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekend Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickSetup.weekend_day_staff}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekend_day_staff: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekend Night
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickSetup.weekend_night_staff}
                    onChange={(e) => setQuickSetup(prev => ({ ...prev, weekend_night_staff: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>
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
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create Profiles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Profile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Staffing Profile
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.profile_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_name: e.target.value }))}
                  placeholder="e.g., Weekday Day Shift"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Period <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.period_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_type: e.target.value as PeriodType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    {PERIOD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.day_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, day_type: e.target.value as DayType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    {DAY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.period_type === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.custom_start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.custom_end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_end_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Guards <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.required_staff}
                  onChange={(e) => setFormData(prev => ({ ...prev, required_staff: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skill
                  </label>
                  <select
                    value={formData.required_skill}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_skill: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    <option value="">Any</option>
                    <option value="unarmed">Unarmed</option>
                    <option value="armed">Armed</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min PSIRA Grade
                  </label>
                  <select
                    value={formData.required_psira_grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_psira_grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    <option value="">Any</option>
                    {PSIRA_GRADES.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_firearm"
                  checked={formData.requires_firearm}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_firearm: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="requires_firearm" className="text-sm text-gray-700">
                  Requires Armed Guard
                </label>
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
                  {saving ? 'Saving...' : 'Add Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
