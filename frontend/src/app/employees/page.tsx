'use client'

import { useState, useEffect, useMemo } from 'react'
import { employeesApi } from '@/services/api'
import { Employee } from '@/types'
import EmployeeForm from '@/components/EmployeeForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Upload, Download, Calendar, Eye } from 'lucide-react'
import EmployeeAvailabilityPatterns from '@/components/EmployeeAvailabilityPatterns'

export default function EmployeesPage() {
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

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeesApi.getAll()
      setEmployees(Array.isArray(response.data) ? response.data : [])
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

  const columns: Column<Employee>[] = [
    {
      header: 'ID',
      accessorKey: 'employee_id',
      cell: (emp) => <span className="font-mono text-xs text-gray-500">#{emp.employee_id}</span>,
    },
    {
      header: 'Name',
      cell: (emp) => (
        <div>
          <div className="font-medium text-gray-900">
            {emp.first_name} {emp.last_name}
          </div>
          <div className="text-xs text-gray-500">{emp.email}</div>
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
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${emp.role === 'armed'
            ? 'bg-red-50 text-red-700'
            : emp.role === 'unarmed'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-100 text-blue-800'
            }`}
        >
          {emp.role.toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Grade',
      cell: (emp) => {
        const grade = (emp as any).cert_level?.toUpperCase()
        if (!grade) return <span className="text-xs text-gray-400">—</span>
        const color =
          grade === 'A' ? 'bg-emerald-500' :
          grade === 'B' ? 'bg-blue-500' :
          grade === 'C' ? 'bg-amber-500' :
          grade === 'D' ? 'bg-orange-500' :
          'bg-gray-500'
        return (
          <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-white text-xs ${color}`}>
            {grade}
          </span>
        )
      },
    },
    {
      header: 'Hourly Rate',
      cell: (emp) => (
        <span className="font-medium text-gray-700">
          R{emp.hourly_rate.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (emp) => (
        <span
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${emp.status === 'active'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-gray-100 text-gray-800'
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
            <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
            <p className="text-gray-500 mt-1">
              Manage your security workforce and profiles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="employees" />
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Upload className="w-5 h-5" />
              Import Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Employee
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
          data={employees}
          columns={columns}
          searchKeys={['first_name', 'last_name', 'id_number', 'role', 'status']}
          actions={(emp) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setAvailabilityEmployee(emp)
                }}
                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                title="Availability"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <Link
                href={`/employees/${emp.employee_id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors inline-flex"
                title="View Profile"
              >
                <Eye className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(emp)
                }}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(emp.employee_id)
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Import Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
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
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Excel Template
              </button>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                {importFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600">
                      Selected: {importFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Click to select a different file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Click to select Excel file
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Import Complete
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-green-700 font-medium">
                        {importResult.imported_count} Imported
                      </p>
                    </div>
                    <div>
                      <p className="text-yellow-700 font-medium">
                        {importResult.skipped_count} Skipped
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">
                        {importResult.error_count} Errors
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show skipped rows */}
                {importResult.skipped && importResult.skipped.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2 text-sm">
                      Skipped Rows
                    </h4>
                    <ul className="text-xs text-yellow-800 space-y-1">
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="font-semibold text-red-900 mb-2 text-sm">
                      Errors
                    </h4>
                    <ul className="text-xs text-red-700 space-y-1">
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
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCloseImportModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
