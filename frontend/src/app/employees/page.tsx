'use client'

import { useState, useEffect, useMemo } from 'react'
import { employeesApi } from '@/services/api'
import { Employee } from '@/types'
import EmployeeForm from '@/components/EmployeeForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

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
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${emp.role === 'armed'
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            : emp.role === 'unarmed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
        >
          {emp.role.toUpperCase()}
        </span>
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
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Employee
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
          data={employees}
          columns={columns}
          searchKeys={['first_name', 'last_name', 'id_number', 'role', 'status']}
          actions={(emp) => (
            <>
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
      </div>
    </DashboardLayout>
  )
}
