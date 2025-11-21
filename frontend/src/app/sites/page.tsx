'use client'

import { useState, useEffect } from 'react'
import { sitesApi } from '@/services/api'
import { Site } from '@/types'
import SiteForm from '@/components/SiteForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, MapPin, Users, Clock } from 'lucide-react'

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
    handleCloseForm()
  }

  const columns: Column<Site>[] = [
    {
      header: 'Site Name',
      cell: (site) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{site.site_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{site.client_name}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (site) => (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <MapPin className="w-4 h-4" />
          <span className="truncate max-w-[200px]" title={site.address}>
            {site.address || 'No address'}
          </span>
        </div>
      ),
    },
    {
      header: 'Requirements',
      className: 'hidden md:table-cell',
      cell: (site) => (
        <div className="space-y-1">
          {site.required_skill && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {site.required_skill}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Users className="w-3 h-3" />
            <span>Min Staff: {site.min_staff}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Shift Pattern',
      className: 'hidden lg:table-cell',
      cell: (site) => (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{site.shift_pattern || 'Standard'}</span>
        </div>
      ),
    },
    {
      header: 'Rate',
      className: 'hidden sm:table-cell',
      cell: (site) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {site.billing_rate ? `R${site.billing_rate}/hr` : '-'}
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sites</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage client locations and facilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="sites" />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Site
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={sites}
          columns={columns}
          searchKeys={['site_name', 'client_name', 'address', 'required_skill']}
          actions={(site) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(site)
                }}
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(site.site_id)
                }}
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        />

        {/* Modal Form */}
        <Modal
          isOpen={showForm}
          onClose={handleCloseForm}
          title={editingSite ? 'Edit Site' : 'Add New Site'}
          maxWidth="2xl"
        >
          <SiteForm
            site={editingSite}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Modal>
      </div>
    </DashboardLayout>
  )
}
