'use client'

import { useState, useEffect, useCallback } from 'react'
import { Employee, Client } from '@/types'
import { employeesApi, clientsApi, organizationSettingsApi } from '@/services/api'

interface EmployeeFormProps {
  employee?: Employee | null
  onClose: () => void
  onSuccess: () => void
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    role: 'unarmed' as 'armed' | 'unarmed' | 'supervisor',
    hourly_rate: '',
    max_hours_week: '48',
    cert_level: '',
    home_location: '',
    status: 'active' as 'active' | 'inactive',
    email: '',
    phone: '',
    assigned_client_ids: [] as number[]
  })

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateHint, setRateHint] = useState<string | null>(null)

  // Lookup default hourly rate when grade or role changes
  const lookupDefaultRate = useCallback(async (grade: string, role: string) => {
    if (!grade || !role) return

    // Only auto-populate for new employees or if hourly rate is empty/zero
    if (employee && employee.hourly_rate > 0) return

    try {
      const response = await organizationSettingsApi.lookupHourlyRate(grade, role)
      if (response.data.found && response.data.default_hourly_rate) {
        setFormData(prev => ({
          ...prev,
          hourly_rate: response.data.default_hourly_rate.toString()
        }))
        setRateHint(`Auto-populated from default rate for Grade ${grade} ${role}`)
        setTimeout(() => setRateHint(null), 5000)
      }
    } catch (err) {
      console.log('No default rate found')
    }
  }, [employee])

  // Validate Grade E cannot be armed
  const validateGradeRole = (grade: string, role: string): string | null => {
    if (grade === 'E' && role === 'armed') {
      return 'Grade E (Basic Security Officer) cannot be armed. Grade B or higher is required for armed roles.'
    }
    if ((grade === 'D' || grade === 'E') && role === 'armed') {
      return `Grade ${grade} typically cannot be armed. Grade B is minimum for armed security.`
    }
    return null
  }

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientsApi.getAll()
        setClients(response.data)
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      }
    }
    fetchClients()
  }, [])

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        id_number: employee.id_number,
        role: employee.role,
        hourly_rate: employee.hourly_rate.toString(),
        max_hours_week: employee.max_hours_week.toString(),
        cert_level: employee.cert_level || '',
        home_location: employee.home_location || '',
        status: employee.status,
        email: employee.email || '',
        phone: employee.phone || '',
        assigned_client_ids: employee.assigned_client_ids || (employee.assigned_client_id ? [employee.assigned_client_id] : [])
      })
    }
  }, [employee])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }

      // When PSIRA grade changes, lookup default rate
      if (name === 'cert_level' && value) {
        lookupDefaultRate(value, newData.role)
      }

      // When role changes, lookup default rate
      if (name === 'role' && newData.cert_level) {
        lookupDefaultRate(newData.cert_level, value)
      }

      return newData
    })
  }

  // Get validation warning for current grade/role combination
  const gradeRoleWarning = validateGradeRole(formData.cert_level, formData.role)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate),
        max_hours_week: parseInt(formData.max_hours_week),
        cert_level: formData.cert_level || undefined,
        home_location: formData.home_location || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        assigned_client_ids: formData.assigned_client_ids.length > 0 ? formData.assigned_client_ids : undefined
      }

      if (employee) {
        await employeesApi.update(employee.employee_id, data)
      } else {
        await employeesApi.create(data)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {gradeRoleWarning && (
            <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded mb-4">
              {gradeRoleWarning}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unarmed">Unarmed</option>
                  <option value="armed">Armed</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (ZAR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {rateHint && (
                  <p className="text-xs text-green-600 mt-1">{rateHint}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Hours/Week <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="max_hours_week"
                  value={formData.max_hours_week}
                  onChange={handleChange}
                  required
                  min="0"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSIRA Grade
                </label>
                <select
                  name="cert_level"
                  value={formData.cert_level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select PSIRA Grade</option>
                  <option value="A">Grade A - Security Manager / Armed Response</option>
                  <option value="B">Grade B - Armed Security Officer</option>
                  <option value="C">Grade C - Close Protection Officer</option>
                  <option value="D">Grade D - Door Supervisor / Event Security</option>
                  <option value="E">Grade E - Security Officer (Basic)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="employee@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Location
                </label>
                <input
                  type="text"
                  name="home_location"
                  value={formData.home_location}
                  onChange={handleChange}
                  placeholder="City or GPS coordinates"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Client Assignment */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Clients
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No clients available</p>
                  ) : (
                    clients.map(client => (
                      <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assigned_client_ids.includes(client.client_id)}
                          onChange={(e) => {
                            const clientId = client.client_id
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assigned_client_ids: [...prev.assigned_client_ids, clientId]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assigned_client_ids: prev.assigned_client_ids.filter(id => id !== clientId)
                              }))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{client.client_name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select which clients this guard can work for. Leave empty to allow all clients.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (employee ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
