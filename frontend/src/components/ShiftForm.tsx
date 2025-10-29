'use client'

import { useState, useEffect } from 'react'
import { Shift, Site, Employee } from '@/types'
import { shiftsApi, sitesApi, employeesApi } from '@/services/api'

interface ShiftFormProps {
  shift?: Shift | null
  onClose: () => void
  onSuccess: () => void
}

export default function ShiftForm({ shift, onClose, onSuccess }: ShiftFormProps) {
  const [formData, setFormData] = useState({
    site_id: '',
    start_time: '',
    end_time: '',
    required_skill: '',
    assigned_employee_id: '',
    status: 'planned' as 'planned' | 'confirmed' | 'completed' | 'cancelled',
    is_overtime: false,
    notes: ''
  })

  const [sites, setSites] = useState<Site[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSitesAndEmployees()
    if (shift) {
      setFormData({
        site_id: shift.site_id.toString(),
        start_time: shift.start_time,
        end_time: shift.end_time,
        required_skill: shift.required_skill || '',
        assigned_employee_id: shift.assigned_employee_id?.toString() || '',
        status: shift.status,
        is_overtime: shift.is_overtime,
        notes: shift.notes || ''
      })
    }
  }, [shift])

  const fetchSitesAndEmployees = async () => {
    try {
      const [sitesRes, employeesRes] = await Promise.all([
        sitesApi.getAll(),
        employeesApi.getAll()
      ])
      setSites(sitesRes.data)
      setEmployees(employeesRes.data.filter((e: Employee) => e.status === 'active'))
    } catch (err) {
      console.error('Failed to fetch sites/employees', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        site_id: parseInt(formData.site_id),
        start_time: formData.start_time,
        end_time: formData.end_time,
        required_skill: formData.required_skill || undefined,
        assigned_employee_id: formData.assigned_employee_id ? parseInt(formData.assigned_employee_id) : undefined,
        status: formData.status,
        is_overtime: formData.is_overtime,
        notes: formData.notes || undefined
      }

      if (shift) {
        await shiftsApi.update(shift.shift_id, data)
      } else {
        await shiftsApi.create(data)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save shift')
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
              {shift ? 'Edit Shift' : 'Create New Shift'}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site <span className="text-red-500">*</span>
                </label>
                <select
                  name="site_id"
                  value={formData.site_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a site</option>
                  {sites.map(site => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.client_name} - {site.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Skill
                </label>
                <select
                  name="required_skill"
                  value={formData.required_skill}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any skill</option>
                  <option value="unarmed">Unarmed</option>
                  <option value="armed">Armed</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="armed response">Armed Response</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Employee
                </label>
                <select
                  name="assigned_employee_id"
                  value={formData.assigned_employee_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name} ({emp.role})
                    </option>
                  ))}
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
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_overtime"
                    checked={formData.is_overtime}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as Overtime</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Additional information about the shift..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                {loading ? 'Saving...' : (shift ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
