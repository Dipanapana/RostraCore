'use client'

import { useState, useEffect } from 'react'
import { sitesApi } from '@/services/api'
import { Site } from '@/types'
import SiteForm from '@/components/SiteForm'

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      setLoading(true)
      const response = await sitesApi.getAll()
      setSites(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sites')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this site?')) return

    try {
      await sitesApi.delete(id)
      fetchSites()
    } catch (err: any) {
      alert('Failed to delete site: ' + err.message)
    }
  }

  const handleEdit = (site: Site) => {
    setEditingSite(site)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSite(null)
  }

  const handleFormSuccess = () => {
    fetchSites()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading sites...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sites</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            + Add Site
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No sites found. Click "Add Site" to create one.
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.site_id} className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{site.client_name}</h3>
                  <span className="text-sm text-gray-500">#{site.site_id}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start">
                    <span className="text-gray-600 text-sm">
                      <strong>Address:</strong> {site.address}
                    </span>
                  </div>

                  {site.shift_pattern && (
                    <div className="flex items-center">
                      <span className="text-gray-600 text-sm">
                        <strong>Pattern:</strong> {site.shift_pattern}
                      </span>
                    </div>
                  )}

                  {site.required_skill && (
                    <div className="flex items-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {site.required_skill}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-600">
                      <strong>Min Staff:</strong> {site.min_staff}
                    </span>
                    {site.billing_rate && (
                      <span className="text-sm text-gray-600">
                        <strong>Rate:</strong> ${site.billing_rate}/hr
                      </span>
                    )}
                  </div>
                </div>

                {site.notes && (
                  <div className="text-sm text-gray-500 mb-4 italic">
                    {site.notes}
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(site)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(site.site_id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {showForm && (
          <SiteForm
            site={editingSite}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </div>
  )
}
