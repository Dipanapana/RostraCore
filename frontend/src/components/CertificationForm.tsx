'use client'

import { useState, useEffect } from 'react'
import { Certification, Employee } from '@/types'
import { certificationsApi, employeesApi } from '@/services/api'

interface CertificationFormProps {
  certification?: Certification | null
  onClose: () => void
  onSuccess: () => void
}

export default function CertificationForm({ certification, onClose, onSuccess }: CertificationFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    cert_type: '',
    issue_date: '',
    expiry_date: '',
    verified: false,
    cert_number: '',
    issuing_authority: ''
  })

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
    if (certification) {
      setFormData({
        employee_id: certification.employee_id.toString(),
        cert_type: certification.cert_type,
        issue_date: certification.issue_date,
        expiry_date: certification.expiry_date,
        verified: certification.verified,
        cert_number: certification.cert_number || '',
        issuing_authority: certification.issuing_authority || ''
      })
    }
  }, [certification])

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.getAll()
      setEmployees(response.data.filter((e: Employee) => e.status === 'active'))
    } catch (err) {
      console.error('Failed to fetch employees', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        employee_id: parseInt(formData.employee_id),
        cert_type: formData.cert_type,
        issue_date: formData.issue_date,
        expiry_date: formData.expiry_date,
        verified: formData.verified,
        cert_number: formData.cert_number || null,
        issuing_authority: formData.issuing_authority || null
      }

      if (certification) {
        await certificationsApi.update(certification.cert_id, data)
      } else {
        await certificationsApi.create(data)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save certification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {certification ? 'Edit Certification' : 'Add Certification'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an employee</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certification Type <span className="text-red-500">*</span>
              </label>
              <select
                name="cert_type"
                value={formData.cert_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select certification type</option>
                <option value="PSIRA Grade A">PSIRA Grade A</option>
                <option value="PSIRA Grade B">PSIRA Grade B</option>
                <option value="PSIRA Grade C">PSIRA Grade C</option>
                <option value="PSIRA Grade D">PSIRA Grade D</option>
                <option value="PSIRA Grade E">PSIRA Grade E</option>
                <option value="Firearm Competency">Firearm Competency</option>
                <option value="First Aid">First Aid</option>
                <option value="Fire Fighting">Fire Fighting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificate Number
              </label>
              <input
                type="text"
                name="cert_number"
                value={formData.cert_number}
                onChange={handleChange}
                placeholder="e.g. PSR123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issuing Authority
              </label>
              <input
                type="text"
                name="issuing_authority"
                value={formData.issuing_authority}
                onChange={handleChange}
                placeholder="e.g. PSIRA"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="verified"
                  checked={formData.verified}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Verified
                </span>
              </label>
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
                {loading ? 'Saving...' : (certification ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
