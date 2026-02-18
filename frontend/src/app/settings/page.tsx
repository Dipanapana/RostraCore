'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { rosterPreferencesApi, clientsApi, sitesApi, employeesApi, organizationSettingsApi } from '@/services/api'

interface RosterPreference {
  preference_id?: number
  scope: 'organization' | 'client' | 'site' | 'employee'
  org_id?: number
  client_id?: number
  site_id?: number
  employee_id?: number

  // Constraint levels
  psira_compliance_level: 'hard' | 'soft' | 'warning' | 'disabled'
  skill_matching_level: 'hard' | 'soft' | 'warning' | 'disabled'
  availability_check_level: 'hard' | 'soft' | 'warning' | 'disabled'
  client_assignment_level: 'hard' | 'soft' | 'warning' | 'disabled'

  // BCEA settings
  max_hours_week: number
  max_hours_week_level: 'hard' | 'soft' | 'warning' | 'disabled'
  min_rest_hours: number
  min_rest_hours_level: 'hard' | 'soft' | 'warning' | 'disabled'
  max_consecutive_days: number
  max_consecutive_days_level: 'hard' | 'soft' | 'warning' | 'disabled'
  max_consecutive_nights: number
  max_consecutive_nights_level: 'hard' | 'soft' | 'warning' | 'disabled'

  // Preferences
  fairness_weight: number
  allow_emergency_overrides: boolean
  emergency_relaxed_constraints: string[]
  notes?: string

  // Premium pay settings
  night_shift_premium_amount?: number
  sunday_premium_percentage?: number
  holiday_premium_percentage?: number
}

export default function SettingsPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<RosterPreference[]>([])
  const [selectedScope, setSelectedScope] = useState<string>('organization')
  const [showForm, setShowForm] = useState(false)
  const [editingPreference, setEditingPreference] = useState<RosterPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dropdown data
  const [clients, setClients] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  // Client Management State
  const [clientManagementMode, setClientManagementMode] = useState<'all' | 'selected'>('all')
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([])
  const [clientManagementLoading, setClientManagementLoading] = useState(false)
  const [clientManagementSaving, setClientManagementSaving] = useState(false)
  const [clientManagementError, setClientManagementError] = useState<string | null>(null)
  const [clientManagementSuccess, setClientManagementSuccess] = useState(false)

  const defaultPreference: RosterPreference = {
    scope: 'organization',
    psira_compliance_level: 'warning',
    skill_matching_level: 'hard',
    availability_check_level: 'hard',
    client_assignment_level: 'hard',
    max_hours_week: 48,
    max_hours_week_level: 'hard',
    min_rest_hours: 8,
    min_rest_hours_level: 'hard',
    max_consecutive_days: 6,
    max_consecutive_days_level: 'hard',
    max_consecutive_nights: 3,
    max_consecutive_nights_level: 'soft',
    fairness_weight: 0.15,
    allow_emergency_overrides: true,
    emergency_relaxed_constraints: [],
    night_shift_premium_amount: 0,
    sunday_premium_percentage: 50,
    holiday_premium_percentage: 100
  }

  const [formData, setFormData] = useState<RosterPreference>(defaultPreference)

  useEffect(() => {
    fetchPreferences()
  }, [selectedScope])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await rosterPreferencesApi.getAll(selectedScope)
      setPreferences(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch preferences')
    } finally {
      setLoading(false)
    }
  }

  const fetchDropdownData = async () => {
    try {
      const [clientsRes, sitesRes, employeesRes] = await Promise.all([
        clientsApi.getAll(),
        sitesApi.getAll(),
        employeesApi.getAll()
      ])
      setClients(clientsRes.data)
      setSites(sitesRes.data)
      setEmployees(employeesRes.data)
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err)
    }
  }

  const handleCreate = () => {
    setFormData({...defaultPreference, scope: selectedScope as any})
    setEditingPreference(null)
    setShowForm(true)
  }

  const handleEdit = (pref: RosterPreference) => {
    setFormData(pref)
    setEditingPreference(pref)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPreference?.preference_id) {
        await rosterPreferencesApi.update(editingPreference.preference_id, formData)
      } else {
        await rosterPreferencesApi.create(formData)
      }
      setShowForm(false)
      fetchPreferences()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save preference')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will revert to parent-level settings.')) return
    try {
      await rosterPreferencesApi.delete(id)
      fetchPreferences()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete preference')
    }
  }

  // Client Management Functions
  const fetchClientManagement = async () => {
    try {
      setClientManagementLoading(true)
      const response = await organizationSettingsApi.getClientManagement()
      setClientManagementMode(response.data.mode)
      setSelectedClientIds(response.data.managed_client_ids || [])
      setClientManagementError(null)
    } catch (err: any) {
      setClientManagementError(err.response?.data?.detail || 'Failed to fetch client management settings')
    } finally {
      setClientManagementLoading(false)
    }
  }

  const saveClientManagement = async () => {
    try {
      setClientManagementSaving(true)
      setClientManagementError(null)
      setClientManagementSuccess(false)

      await organizationSettingsApi.updateClientManagement({
        mode: clientManagementMode,
        client_ids: clientManagementMode === 'selected' ? selectedClientIds : undefined
      })

      setClientManagementSuccess(true)
      setTimeout(() => setClientManagementSuccess(false), 3000)
    } catch (err: any) {
      setClientManagementError(err.response?.data?.detail || 'Failed to save client management settings')
    } finally {
      setClientManagementSaving(false)
    }
  }

  const toggleClientSelection = (clientId: number) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  useEffect(() => {
    fetchClientManagement()
  }, [])

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'hard': return 'bg-red-100 text-red-800'
      case 'soft': return 'bg-yellow-100 text-yellow-800'
      case 'warning': return 'bg-orange-100 text-orange-800'
      case 'disabled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-3 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your organization settings</p>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Security</h2>
          <p className="text-sm text-gray-600 mb-4">Manage your account security settings</p>
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500 mt-0.5">Update your account password</p>
            </div>
            <button
              onClick={() => router.push('/settings/change-password')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Client Management Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Client Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose which clients your organization manages. This affects which employees, sites, shifts, and rosters you can view and manage.
              </p>
            </div>
          </div>

          {clientManagementError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
              {clientManagementError}
            </div>
          )}

          {clientManagementSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4">
              Settings saved successfully!
            </div>
          )}

          {clientManagementLoading ? (
            <div className="text-center py-4 text-gray-500">Loading client management settings...</div>
          ) : (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="clientMode"
                    value="all"
                    checked={clientManagementMode === 'all'}
                    onChange={() => setClientManagementMode('all')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">All Clients</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      Manage employees, sites, shifts, and rosters for all clients in your organization. New clients will be automatically included.
                    </span>
                  </div>
                </label>

                <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="clientMode"
                    value="selected"
                    checked={clientManagementMode === 'selected'}
                    onChange={() => setClientManagementMode('selected')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">Selected Clients Only</span>
                    <span className="block text-sm text-gray-500 mt-1">
                      Only manage employees, sites, shifts, and rosters for specific clients you select below.
                    </span>
                  </div>
                </label>
              </div>

              {/* Client Selection (visible when 'selected' mode is chosen) */}
              {clientManagementMode === 'selected' && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Select Clients to Manage</h3>
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500">No clients found. Add clients first to select them here.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {clients.map(client => (
                        <label
                          key={client.client_id}
                          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                            selectedClientIds.includes(client.client_id)
                              ? 'bg-blue-100 border border-blue-300'
                              : 'bg-white border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.client_id)}
                            onChange={() => toggleClientSelection(client.client_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 truncate">{client.client_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedClientIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={saveClientManagement}
                  disabled={clientManagementSaving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clientManagementSaving ? 'Saving...' : 'Save Client Settings'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Roster Constraint Settings Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Roster Constraint Settings</h2>
              <p className="text-gray-600 mt-1">Configure rostering constraints at different levels</p>
            </div>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Preference
            </button>
          </div>

          {/* Scope Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Scope</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 w-64"
            >
              <option value="">All Scopes</option>
              <option value="organization">Organization</option>
              <option value="client">Client</option>
              <option value="site">Site</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Preferences List */}
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : preferences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No preferences configured. Using system defaults.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PSIRA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Hours/Week</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Rest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emergency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preferences.map((pref) => (
                    <tr key={pref.preference_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {pref.scope}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pref.scope === 'client' && clients.find(c => c.client_id === pref.client_id)?.client_name}
                        {pref.scope === 'site' && sites.find(s => s.site_id === pref.site_id)?.site_name}
                        {pref.scope === 'employee' && employees.find(e => e.employee_id === pref.employee_id)?.first_name}
                        {pref.scope === 'organization' && 'Default'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(pref.psira_compliance_level)}`}>
                          {pref.psira_compliance_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pref.max_hours_week}h
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLevelBadgeColor(pref.max_hours_week_level)}`}>
                          {pref.max_hours_week_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pref.min_rest_hours}h
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLevelBadgeColor(pref.min_rest_hours_level)}`}>
                          {pref.min_rest_hours_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pref.allow_emergency_overrides ? (
                          <span className="text-green-600 text-sm">✓ Enabled</span>
                        ) : (
                          <span className="text-gray-400 text-sm">✗ Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(pref)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pref.preference_id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Preference Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPreference ? 'Edit Preference' : 'Create Preference'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Scope Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({...formData, scope: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="organization">Organization (Company-wide)</option>
                    <option value="client">Client (Per-client)</option>
                    <option value="site">Site (Per-location)</option>
                    <option value="employee">Employee (Per-guard)</option>
                  </select>
                </div>

                {/* Scope-specific dropdowns */}
                {formData.scope === 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      value={formData.client_id || ''}
                      onChange={(e) => setFormData({...formData, client_id: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => (
                        <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.scope === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                    <select
                      value={formData.site_id || ''}
                      onChange={(e) => setFormData({...formData, site_id: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select Site</option>
                      {sites.map(s => (
                        <option key={s.site_id} value={s.site_id}>{s.site_name || s.client_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.scope === 'employee' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      value={formData.employee_id || ''}
                      onChange={(e) => setFormData({...formData, employee_id: Number(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(e => (
                        <option key={e.employee_id} value={e.employee_id}>
                          {e.first_name} {e.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Constraint Levels */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PSIRA Compliance</label>
                    <select
                      value={formData.psira_compliance_level}
                      onChange={(e) => setFormData({...formData, psira_compliance_level: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="hard">Hard (Blocks assignment)</option>
                      <option value="soft">Soft (Penalized)</option>
                      <option value="warning">Warning (Allowed)</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skill Matching</label>
                    <select
                      value={formData.skill_matching_level}
                      onChange={(e) => setFormData({...formData, skill_matching_level: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="hard">Hard (Blocks assignment)</option>
                      <option value="soft">Soft (Penalized)</option>
                      <option value="warning">Warning (Allowed)</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                {/* BCEA Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Hours/Week</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.max_hours_week}
                        onChange={(e) => setFormData({...formData, max_hours_week: Number(e.target.value)})}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        max="168"
                      />
                      <select
                        value={formData.max_hours_week_level}
                        onChange={(e) => setFormData({...formData, max_hours_week_level: e.target.value as any})}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hard">Hard</option>
                        <option value="soft">Soft</option>
                        <option value="warning">Warning</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Rest Hours</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.min_rest_hours}
                        onChange={(e) => setFormData({...formData, min_rest_hours: Number(e.target.value)})}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        max="24"
                      />
                      <select
                        value={formData.min_rest_hours_level}
                        onChange={(e) => setFormData({...formData, min_rest_hours_level: e.target.value as any})}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hard">Hard</option>
                        <option value="soft">Soft</option>
                        <option value="warning">Warning</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Days</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.max_consecutive_days}
                        onChange={(e) => setFormData({...formData, max_consecutive_days: Number(e.target.value)})}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        max="14"
                      />
                      <select
                        value={formData.max_consecutive_days_level}
                        onChange={(e) => setFormData({...formData, max_consecutive_days_level: e.target.value as any})}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hard">Hard</option>
                        <option value="soft">Soft</option>
                        <option value="warning">Warning</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Nights</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.max_consecutive_nights}
                        onChange={(e) => setFormData({...formData, max_consecutive_nights: Number(e.target.value)})}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2"
                        min="1"
                        max="14"
                      />
                      <select
                        value={formData.max_consecutive_nights_level}
                        onChange={(e) => setFormData({...formData, max_consecutive_nights_level: e.target.value as any})}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="hard">Hard</option>
                        <option value="soft">Soft</option>
                        <option value="warning">Warning</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Premium Pay Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Premium Pay Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Night Shift Premium (R/hour)</label>
                      <input
                        type="number"
                        value={formData.night_shift_premium_amount || 0}
                        onChange={(e) => setFormData({...formData, night_shift_premium_amount: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        step="0.50"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Additional Rands per hour for night shifts</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sunday Premium (%)</label>
                      <input
                        type="number"
                        value={formData.sunday_premium_percentage || 50}
                        onChange={(e) => setFormData({...formData, sunday_premium_percentage: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        max="200"
                        step="5"
                        placeholder="50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentage premium for Sundays (e.g., 50 = 1.5x pay)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Premium (%)</label>
                      <input
                        type="number"
                        value={formData.holiday_premium_percentage || 100}
                        onChange={(e) => setFormData({...formData, holiday_premium_percentage: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        min="0"
                        max="300"
                        step="10"
                        placeholder="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentage premium for public holidays (e.g., 100 = 2x pay)</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Mode */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allow_emergency_overrides}
                      onChange={(e) => setFormData({...formData, allow_emergency_overrides: e.target.checked})}
                      className="mr-2 h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Emergency Overrides</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enables temporary constraint relaxation for sick leave and urgent replacements
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="e.g., Medical restriction, client requirement, etc."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPreference ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
