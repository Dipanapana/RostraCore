'use client'

import { useState, useEffect, useMemo } from 'react'
import { employeesApi } from '@/services/api'
import { Employee } from '@/types'
import EmployeeForm from '@/components/EmployeeForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, Upload, Download, Calendar } from 'lucide-react'
import EmployeeAvailabilityPatterns from '@/components/EmployeeAvailabilityPatterns'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

type EmployeeFilter = 'all' | 'security' | 'office' | 'contractors' | 'consultants'

export default function EmployeesPage() {
  const { isOffline } = useOfflineStatus()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [availabilityEmployee, setAvailabilityEmployee] = useState<Employee | null>(null)
  const [activeFilter, setActiveFilter] = useState<EmployeeFilter>('all')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeesApi.getAll()
      setEmployees(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      await employeesApi.delete(id)
      fetchEmployees()
    } catch (err: any) {
      alert('Failed to delete employee: ' + err.message)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingEmployee(null)
  }

  const handleFormSuccess = () => {
    fetchEmployees()
    handleCloseForm()
  }

  const handleDownloadTemplate = () => {
    const { getApiUrl } = require('@/lib/config')
    window.open(`${getApiUrl()}/api/v1/employees/download-template`, '_blank')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please select an Excel file (.xlsx or .xls)')
        return
      }
      setImportFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    try {
      setImporting(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', importFile)

      const response = await employeesApi.importFromExcel(formData)

      setImportResult(response.data)

      // Refresh employee list after successful import
      if (response.data.imported_count > 0) {
        await fetchEmployees()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to import employees')
    } finally {
      setImporting(false)
    }
  }

  const handleCloseImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportResult(null)
    setError(null)
  }

  // Filter employees based on active tab
  const filteredEmployees = useMemo(() => {
    switch (activeFilter) {
      case 'security':
        return employees.filter(emp =>
          emp.role === 'armed' || emp.role === 'unarmed' || emp.role === 'supervisor'
        )
      case 'office':
        return employees.filter(emp => emp.role === 'office_staff')
      case 'contractors':
        return employees.filter(emp => emp.role === 'contractor')
      case 'consultants':
        return employees.filter(emp => emp.role === 'consultant' || emp.employment_type === 'consultant')
      default:
        return employees
    }
  }, [employees, activeFilter])

  // Calculate counts for each category
  const employeeCounts = useMemo(() => ({
    all: employees.length,
    security: employees.filter(emp => emp.role === 'armed' || emp.role === 'unarmed' || emp.role === 'supervisor').length,
    office: employees.filter(emp => emp.role === 'office_staff').length,
    contractors: employees.filter(emp => emp.role === 'contractor').length,
    consultants: employees.filter(emp => emp.role === 'consultant' || emp.employment_type === 'consultant').length,
  }), [employees])

  const columns: Column<Employee>[] = [
    {
      header: 'ID',
      accessorKey: 'employee_id',
      cell: (emp) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">#{emp.employee_id}</span>,
    },
    {
      header: 'Name',
      cell: (emp) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">
            {emp.first_name} {emp.last_name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</div>
        </div>
      ),
    },
    {
      header: 'ID Number',
      accessorKey: 'id_number',
    },
    {
      header: 'Role',
      cell: (emp) => (
        <span
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${
            emp.role === 'armed'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : emp.role === 'unarmed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : emp.role === 'supervisor'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : emp.role === 'office_staff'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
          }`}
        >
          {emp.role.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Type',
      cell: (emp) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div className="font-medium">{emp.employment_type || 'Permanent'}</div>
          <div className="text-slate-500 dark:text-slate-500">{(emp.work_pattern_type || 'shift_based').replace('_', ' ')}</div>
        </div>
      ),
    },
    {
      header: 'Hourly Rate',
      cell: (emp) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          R{emp.hourly_rate.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (emp) => (
        <span
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${emp.status === 'active'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
            }`}
        >
          {emp.status.toUpperCase()}
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Employees</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage your security workforce and profiles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="employees" />
            <button
              onClick={() => setShowImportModal(true)}
              disabled={isOffline}
              title={isOffline ? 'Requires internet connection' : 'Import employees from Excel'}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Upload className="w-5 h-5" />
              Import Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              disabled={isOffline}
              title={isOffline ? 'Requires internet connection' : 'Add new employee'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Plus className="w-5 h-5" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Employees
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeFilter === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}>
                {employeeCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('security')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'security'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Security Guards
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeFilter === 'security'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}>
                {employeeCounts.security}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('office')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'office'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Office Staff
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeFilter === 'office'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}>
                {employeeCounts.office}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('contractors')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'contractors'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Contractors
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeFilter === 'contractors'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}>
                {employeeCounts.contractors}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('consultants')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeFilter === 'consultants'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Consultants
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeFilter === 'consultants'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}>
                {employeeCounts.consultants}
              </span>
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
          data={filteredEmployees}
          columns={columns}
          searchKeys={['first_name', 'last_name', 'id_number', 'role', 'status', 'employment_type', 'department', 'job_title']}
          actions={(emp) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAvailabilityEmployee(emp)
                }}
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="Availability"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(emp)
                }}
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(emp.employee_id)
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
          title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          maxWidth="2xl"
        >
          <EmployeeForm
            employee={editingEmployee}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Modal>

        {/* Import Modal */}
        <Modal
          isOpen={showImportModal}
          onClose={handleCloseImportModal}
          title="Import Employees from Excel"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Import Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>Download the Excel template using the button below</li>
                <li>Fill in employee data (first_name, last_name, id_number are required)</li>
                <li>Upload the completed Excel file</li>
                <li>Review the import results</li>
              </ol>
            </div>

            {/* Download Template Button */}
            <div className="flex justify-center">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-medium border border-slate-300 dark:border-slate-600 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download Excel Template
              </button>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                {importFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Selected: {importFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click to select a different file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Click to select Excel file
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    Import Complete
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        {importResult.imported_count} Imported
                      </p>
                    </div>
                    <div>
                      <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                        {importResult.skipped_count} Skipped
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 dark:text-red-300 font-medium">
                        {importResult.error_count} Errors
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show skipped rows */}
                {importResult.skipped && importResult.skipped.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2 text-sm">
                      Skipped Rows
                    </h4>
                    <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                      {importResult.skipped.map((skip: any, idx: number) => (
                        <li key={idx}>
                          Row {skip.row}: {skip.reason} (ID: {skip.id_number})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show errors */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2 text-sm">
                      Errors
                    </h4>
                    <ul className="text-xs text-red-800 dark:text-red-300 space-y-1">
                      {importResult.errors.map((error: any, idx: number) => (
                        <li key={idx}>
                          Row {error.row}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCloseImportModal}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
                >
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    'Import Employees'
                  )}
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* Availability Patterns Modal */}
        <Modal
          isOpen={!!availabilityEmployee}
          onClose={() => setAvailabilityEmployee(null)}
          title="Employee Availability"
          maxWidth="2xl"
        >
          {availabilityEmployee && (
            <EmployeeAvailabilityPatterns
              employeeId={availabilityEmployee.employee_id}
              employeeName={`${availabilityEmployee.first_name} ${availabilityEmployee.last_name}`}
              onClose={() => setAvailabilityEmployee(null)}
            />
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
