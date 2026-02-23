'use client'

import { useState, useEffect, useMemo } from 'react'
import { shiftsApi, sitesApi, employeesApi } from '@/services/api'
import api from '@/services/api'
import { getApiUrl } from '@/lib/config'
import { Shift, Site, Employee } from '@/types'
import ShiftForm from '@/components/ShiftForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, User, Filter, X, Wand2, CheckSquare, Loader2 } from 'lucide-react'

// Shift template type for bulk generation
interface ShiftTemplate {
  day_of_week: number
  start_time: string
  end_time: string
  required_staff: number
  required_skill?: string
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  // Bulk Generation State
  const [showBulkGenerate, setShowBulkGenerate] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<any>(null)
  const [selectedSites, setSelectedSites] = useState<number[]>([])
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([
    { day_of_week: 0, start_time: '06:00', end_time: '18:00', required_staff: 1 },
    { day_of_week: 0, start_time: '18:00', end_time: '06:00', required_staff: 1 },
  ])

  // Filters
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [shiftsRes, sitesRes, employeesRes] = await Promise.all([
        shiftsApi.getAll(),
        sitesApi.getAll(),
        employeesApi.getAll()
      ])
      setShifts(shiftsRes.data)
      setSites(sitesRes.data)
      setEmployees(employeesRes.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shift?')) return

    try {
      await shiftsApi.delete(id)
      fetchData()
    } catch (err: any) {
      alert('Failed to delete shift: ' + err.message)
    }
  }

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingShift(null)
  }

  const handleFormSuccess = () => {
    fetchData()
    handleCloseForm()
  }

  // Bulk Generation Functions
  const handleBulkGenerate = async () => {
    if (selectedSites.length === 0) {
      alert('Please select at least one site')
      return
    }
    if (!bulkStartDate || !bulkEndDate) {
      alert('Please select start and end dates')
      return
    }
    if (shiftTemplates.length === 0) {
      alert('Please add at least one shift template')
      return
    }

    setBulkLoading(true)
    setBulkResult(null)

    try {
      const response = await api.post(`${getApiUrl()}/api/v1/shifts/bulk-generate`, {
        site_ids: selectedSites,
        start_date: bulkStartDate,
        end_date: bulkEndDate,
        pattern: 'weekly',
        shift_templates: shiftTemplates,
        default_required_staff: 1
      })

      setBulkResult(response.data)
      if (response.data.success) {
        fetchData() // Refresh shifts list
      }
    } catch (err: any) {
      setBulkResult({
        success: false,
        errors: [err.response?.data?.detail || err.message || 'Failed to generate shifts']
      })
    } finally {
      setBulkLoading(false)
    }
  }

  const addShiftTemplate = () => {
    setShiftTemplates([
      ...shiftTemplates,
      { day_of_week: 0, start_time: '06:00', end_time: '18:00', required_staff: 1 }
    ])
  }

  const removeShiftTemplate = (index: number) => {
    setShiftTemplates(shiftTemplates.filter((_, i) => i !== index))
  }

  const updateShiftTemplate = (index: number, field: keyof ShiftTemplate, value: any) => {
    const updated = [...shiftTemplates]
    updated[index] = { ...updated[index], [field]: value }
    setShiftTemplates(updated)
  }

  const toggleSiteSelection = (siteId: number) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    )
  }

  const selectAllSites = () => {
    setSelectedSites(sites.map(s => s.site_id))
  }

  const deselectAllSites = () => {
    setSelectedSites([])
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Get site name by ID
  const getSiteName = (siteId: number) => {
    const site = sites.find(s => s.site_id === siteId)
    return site ? site.client_name : `Site #${siteId}`
  }

  // Get employee name by ID
  const getEmployeeName = (employeeId?: number) => {
    if (!employeeId) return 'Unassigned'
    const employee = employees.find(e => e.employee_id === employeeId)
    return employee ? `${employee.first_name} ${employee.last_name}` : `Employee #${employeeId}`
  }

  // Format date/time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (filterSite && shift.site_id.toString() !== filterSite) return false
      if (filterStatus && shift.status !== filterStatus) return false
      if (filterEmployee && shift.assigned_employee_id?.toString() !== filterEmployee) return false
      return true
    })
  }, [shifts, filterSite, filterStatus, filterEmployee])

  const columns: Column<Shift>[] = [
    {
      header: 'Site',
      cell: (shift) => (
        <div className="flex items-center gap-2 text-gray-900 font-medium">
          <MapPin className="w-4 h-4 text-gray-400" />
          {getSiteName(shift.site_id)}
        </div>
      ),
    },
    {
      header: 'Time',
      cell: (shift) => (
        <div className="flex flex-col text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-3 h-3" />
            {new Date(shift.start_time).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
            <Clock className="w-3 h-3" />
            {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
            {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned To',
      cell: (shift) => (
        <div className={`flex items-center gap-2 ${!shift.assigned_employee_id ? 'text-amber-600' : 'text-gray-700'}`}>
          <User className="w-4 h-4" />
          <span className="font-medium">{getEmployeeName(shift.assigned_employee_id)}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (shift) => (
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${shift.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
              shift.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                shift.status === 'planned' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
              }`}
          >
            {shift.status.toUpperCase()}
          </span>
          {shift.is_overtime && (
            <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              OT
            </span>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
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
            <h1 className="text-2xl font-semibold text-gray-900">Shift Management</h1>
            <p className="text-gray-500 mt-1">
              Schedule and manage security shifts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="shifts" />
            <button
              onClick={() => setShowBulkGenerate(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Wand2 className="w-5 h-5" />
              Bulk Generate
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Shift
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{shifts.length}</div>
            <div className="text-sm text-gray-600">Total Shifts</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {shifts.filter(s => s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-gray-600">Assigned</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-2xl font-bold text-amber-600">
              {shifts.filter(s => !s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-gray-600">Unassigned</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-2xl font-bold text-purple-600">
              {shifts.filter(s => s.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Sites</option>
              {sites.map(site => (
                <option key={site.site_id} value={site.site_id}>
                  {site.client_name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setFilterSite('')
                setFilterStatus('')
                setFilterEmployee('')
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={filteredShifts}
          columns={columns}
          searchKeys={['status']} // Basic search, real filtering is done above
          actions={(shift) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(shift)
                }}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(shift.shift_id)
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
          title={editingShift ? 'Edit Shift' : 'Create New Shift'}
          maxWidth="2xl"
        >
          <ShiftForm
            shift={editingShift}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Modal>

        {/* Bulk Generate Modal */}
        <Modal
          isOpen={showBulkGenerate}
          onClose={() => {
            setShowBulkGenerate(false)
            setBulkResult(null)
          }}
          title="Bulk Generate Shifts"
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Success/Error Result */}
            {bulkResult && (
              <div className={`p-4 rounded-lg ${bulkResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`font-medium ${bulkResult.success ? 'text-emerald-800' : 'text-red-700'}`}>
                  {bulkResult.success ? '✓ Shifts Generated Successfully' : '✗ Generation Failed'}
                </h4>
                {bulkResult.success && (
                  <div className="mt-2 text-sm text-emerald-700">
                    <p>Created {bulkResult.shifts_created} shifts across {bulkResult.sites_processed} sites</p>
                    <p className="text-xs mt-1">{bulkResult.date_range}</p>
                    {bulkResult.details?.map((d: any, i: number) => (
                      <p key={i} className="text-xs">• {d.site_name}: {d.shifts_created} shifts</p>
                    ))}
                  </div>
                )}
                {bulkResult.errors?.length > 0 && (
                  <div className="mt-2 text-sm text-red-700 max-h-32 overflow-y-auto">
                    {bulkResult.errors.slice(0, 10).map((err: string, i: number) => (
                      <p key={i} className="text-xs">• {err}</p>
                    ))}
                    {bulkResult.errors.length > 10 && (
                      <p className="text-xs">...and {bulkResult.errors.length - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Site Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Sites ({selectedSites.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllSites}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllSites}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {sites.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No sites available</p>
                ) : (
                  sites.map(site => (
                    <label
                      key={site.site_id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedSites.includes(site.site_id)
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSites.includes(site.site_id)}
                        onChange={() => toggleSiteSelection(site.site_id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {site.site_name || site.client_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6)
                  setBulkStartDate(startOfWeek.toISOString().split('T')[0])
                  setBulkEndDate(endOfWeek.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - today.getDay() + 8) // Next Monday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6)
                  setBulkStartDate(startOfWeek.toISOString().split('T')[0])
                  setBulkEndDate(endOfWeek.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
              >
                Next Week
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
                  const endOfBiWeek = new Date(startOfWeek)
                  endOfBiWeek.setDate(startOfWeek.getDate() + 13)
                  setBulkStartDate(startOfWeek.toISOString().split('T')[0])
                  setBulkEndDate(endOfBiWeek.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
              >
                2 Weeks
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                  setBulkStartDate(startOfMonth.toISOString().split('T')[0])
                  setBulkEndDate(endOfMonth.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
              >
                This Month
              </button>
            </div>

            {/* Shift Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Shift Templates ({shiftTemplates.length})
                </label>
                <button
                  type="button"
                  onClick={addShiftTemplate}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Template
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shiftTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <select
                      value={template.day_of_week}
                      onChange={(e) => updateShiftTemplate(index, 'day_of_week', parseInt(e.target.value))}
                      className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900"
                    >
                      {dayNames.map((day, dayIndex) => (
                        <option key={dayIndex} value={dayIndex}>{day}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={template.start_time}
                      onChange={(e) => updateShiftTemplate(index, 'start_time', e.target.value)}
                      className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={template.end_time}
                      onChange={(e) => updateShiftTemplate(index, 'end_time', e.target.value)}
                      className="px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900"
                    />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={template.required_staff}
                      onChange={(e) => updateShiftTemplate(index, 'required_staff', parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-sm bg-white border border-gray-200 rounded text-gray-900"
                      title="Guards needed"
                    />
                    <span className="text-xs text-gray-500">guards</span>
                    <button
                      type="button"
                      onClick={() => removeShiftTemplate(index)}
                      className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Templates apply to all selected days in the date range. For overnight shifts (e.g., 18:00 to 06:00), end time is assumed to be the next day.
              </p>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowBulkGenerate(false)
                  setBulkResult(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkGenerate}
                disabled={bulkLoading || selectedSites.length === 0 || !bulkStartDate || !bulkEndDate}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {bulkLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Shifts
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
