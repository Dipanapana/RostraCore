'use client'

import { useState, useEffect } from 'react'
import { Site } from '@/types'
import { sitesApi } from '@/services/api'

interface SiteFormProps {
  site?: Site | null
  onClose: () => void
  onSuccess: () => void
}

export default function SiteForm({ site, onClose, onSuccess }: SiteFormProps) {
  const [formData, setFormData] = useState({
    site_name: '',
    client_name: '',
    address: '',
    gps_lat: '',
    gps_lng: '',
    shift_pattern: '',
    required_skill: '',
    billing_rate: '',
    min_staff: '1',
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (site) {
      setFormData({
        site_name: site.site_name || '',
        client_name: site.client_name,
        address: site.address,
        gps_lat: site.gps_lat?.toString() || '',
        gps_lng: site.gps_lng?.toString() || '',
        shift_pattern: site.shift_pattern || '',
        required_skill: site.required_skill || '',
        billing_rate: site.billing_rate?.toString() || '',
        min_staff: site.min_staff.toString(),
        notes: site.notes || ''
      })
    }
  }, [site])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        site_name: formData.site_name,
        client_name: formData.client_name,
        address: formData.address,
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : undefined,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : undefined,
        shift_pattern: formData.shift_pattern || undefined,
        required_skill: formData.required_skill || undefined,
        billing_rate: formData.billing_rate ? parseFloat(formData.billing_rate) : undefined,
        min_staff: parseInt(formData.min_staff),
        notes: formData.notes || undefined
      }

      if (site) {
        await sitesApi.update(site.site_id, data)
      } else {
        await sitesApi.create(data)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save site')
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
              {site ? 'Edit Site' : 'Add New Site'}
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
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleChange}
                  required
                  placeholder="Main Gate, Building A, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  placeholder="ABC Corporation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="123 Main Street, City"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GPS Latitude
                </label>
                <input
                  type="number"
                  name="gps_lat"
                  value={formData.gps_lat}
                  onChange={handleChange}
                  step="0.000001"
                  min="-90"
                  max="90"
                  placeholder="-26.2041"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GPS Longitude
                </label>
                <input
                  type="number"
                  name="gps_lng"
                  value={formData.gps_lng}
                  onChange={handleChange}
                  step="0.000001"
                  min="-180"
                  max="180"
                  placeholder="28.0473"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Pattern
                </label>
                <select
                  name="shift_pattern"
                  value={formData.shift_pattern}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select pattern</option>
                  <option value="day">Day (8h)</option>
                  <option value="night">Night (8h)</option>
                  <option value="12hr">12 Hour</option>
                  <option value="24hr">24 Hour</option>
                  <option value="rotating">Rotating</option>
                </select>
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
                  <option value="">Select skill</option>
                  <option value="unarmed">Unarmed</option>
                  <option value="armed">Armed</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="armed response">Armed Response</option>
                  <option value="driver">Driver</option>
                  <option value="dog handler">Dog Handler</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Rate (per hour)
                </label>
                <input
                  type="number"
                  name="billing_rate"
                  value={formData.billing_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Staff <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="min_staff"
                  value={formData.min_staff}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  placeholder="Additional information about the site..."
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
                {loading ? 'Saving...' : (site ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
