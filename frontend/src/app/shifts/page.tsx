'use client'

import { useState, useEffect, useMemo } from 'react'
import { shiftsApi, sitesApi, employeesApi } from '@/services/api'
import { Shift, Site, Employee } from '@/types'
import ShiftForm from '@/components/ShiftForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, User, Filter, X } from 'lucide-react'

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

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
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
          <MapPin className="w-4 h-4 text-slate-400" />
          {getSiteName(shift.site_id)}
        </div>
      ),
    },
    {
      header: 'Time',
      cell: (shift) => (
        <div className="flex flex-col text-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3 h-3" />
            {new Date(shift.start_time).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mt-0.5">
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
        <div className={`flex items-center gap-2 ${!shift.assigned_employee_id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
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
            className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${shift.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
              shift.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                shift.status === 'planned' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
              }`}
          >
            {shift.status.toUpperCase()}
          </span>
          {shift.is_overtime && (
            <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Shift Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Schedule and manage security shifts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="shifts" />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Create Shift
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{shifts.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Shifts</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {shifts.filter(s => s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Assigned</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {shifts.filter(s => !s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Unassigned</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {shifts.filter(s => s.status === 'confirmed').length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Confirmed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white mb-2">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
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
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(shift.shift_id)
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
          title={editingShift ? 'Edit Shift' : 'Create New Shift'}
          maxWidth="2xl"
        >
          <ShiftForm
            shift={editingShift}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Modal>
      </div>
    </DashboardLayout>
  )
}
