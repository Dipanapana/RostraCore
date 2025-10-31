'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { sitesApi } from '@/services/api'
import { Site } from '@/types'
import SiteForm from '@/components/SiteForm'
import ExportButtons from '@/components/ExportButtons'

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  // Pagination and search
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9)

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

  // Filter and paginate sites
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const searchLower = searchTerm.toLowerCase()
      return (
        site.client_name.toLowerCase().includes(searchLower) ||
        site.address.toLowerCase().includes(searchLower) ||
        (site.required_skill?.toLowerCase().includes(searchLower)) ||
        (site.shift_pattern?.toLowerCase().includes(searchLower))
      )
    })
  }, [sites, searchTerm])

  const totalPages = Math.ceil(filteredSites.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSites = filteredSites.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading sites...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sites</h1>
          <div className="flex items-center gap-3">
            <ExportButtons type="sites" />
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              + Add Site
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fadeIn">
            {error}
          </div>
        )}

        {/* Search and Items Per Page */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search sites by name, address, skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 font-medium">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentSites.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              {searchTerm ? `No sites match "${searchTerm}"` : 'No sites found. Click "Add Site" to create one.'}
            </div>
          ) : (
            currentSites.map((site) => (
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
                        <strong>Rate:</strong> R{site.billing_rate}/hr
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

        {/* Pagination */}
        {filteredSites.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow-md">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredSites.length)}</span> of{' '}
                  <span className="font-medium">{filteredSites.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNumber = idx + 1
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? 'z-10 bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <span key={pageNumber} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
                    }
                    return null
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

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
