'use client'

import { useState, useEffect, useMemo } from 'react'
import { certificationsApi, employeesApi } from '@/services/api'
import { Certification, Employee } from '@/types'
import CertificationForm from '@/components/CertificationForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, Award, Calendar, AlertTriangle, CheckCircle, Filter, X, User } from 'lucide-react'
import TableSkeleton from '@/components/ui/TableSkeleton'

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null)

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [certsRes, employeesRes] = await Promise.all([
        certificationsApi.getAll(),
        employeesApi.getAll()
      ])
      setCertifications(certsRes.data)
      setEmployees(employeesRes.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this certification?')) return

    try {
      await certificationsApi.delete(id)
      fetchData()
    } catch (err: any) {
      alert('Failed to delete certification: ' + err.message)
    }
  }

  const handleEdit = (certification: Certification) => {
    setEditingCertification(certification)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingCertification(null)
  }

  const handleFormSuccess = () => {
    fetchData()
    handleCloseForm()
  }

  // Get employee name by ID
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.employee_id === employeeId)
    return employee ? `${employee.first_name} ${employee.last_name}` : `Employee #${employeeId}`
  }

  // Check if certification is expired or expiring soon
  const getCertificationStatus = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired', color: 'bg-red-50 text-red-700' }
    if (daysUntilExpiry <= 30) return { status: 'expiring', label: 'Expiring Soon', color: 'bg-orange-100 text-orange-800' }
    if (daysUntilExpiry <= 90) return { status: 'warning', label: 'Expiring', color: 'bg-amber-100 text-amber-800' }
    return { status: 'valid', label: 'Valid', color: 'bg-emerald-100 text-emerald-800' }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get unique cert types for filter
  const certTypes = [...new Set(certifications.map(c => c.cert_type))]

  // Filter certifications
  const filteredCertifications = useMemo(() => {
    return certifications.filter(cert => {
      if (filterEmployee && cert.employee_id.toString() !== filterEmployee) return false
      if (filterType && cert.cert_type !== filterType) return false
      if (filterStatus) {
        const status = getCertificationStatus(cert.expiry_date).status
        if (filterStatus !== status) return false
      }
      return true
    })
  }, [certifications, filterEmployee, filterType, filterStatus])

  // Stats
  const expiredCount = certifications.filter(c => getCertificationStatus(c.expiry_date).status === 'expired').length
  const expiringSoonCount = certifications.filter(c => getCertificationStatus(c.expiry_date).status === 'expiring').length
  const validCount = certifications.filter(c => getCertificationStatus(c.expiry_date).status === 'valid').length

  const columns: Column<Certification>[] = [
    {
      header: 'Employee',
      cell: (cert) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {getEmployeeName(cert.employee_id)}
          </span>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (cert) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">{cert.cert_type}</span>
        </div>
      ),
    },
    {
      header: 'Cert Number',
      cell: (cert) => (
        <span className="font-mono text-xs text-gray-500">
          {cert.cert_number || '-'}
        </span>
      ),
    },
    {
      header: 'Dates',
      cell: (cert) => (
        <div className="flex flex-col text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Issued: {formatDate(cert.issue_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 mt-0.5">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Expires: {formatDate(cert.expiry_date)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (cert) => {
        const status = getCertificationStatus(cert.expiry_date)
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-xs font-medium rounded-full ${status.color}`}>
              {status.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
              {(status.status === 'expiring' || status.status === 'warning') && <Calendar className="w-3 h-3" />}
              {status.status === 'valid' && <CheckCircle className="w-3 h-3" />}
              {status.label}
            </span>
            {cert.verified && (
              <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Verified
              </span>
            )}
          </div>
        )
      },
    },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
          <TableSkeleton rows={6} columns={5} />
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
            <h1 className="text-2xl font-semibold text-gray-900">Certifications Management</h1>
            <p className="text-gray-500 mt-1">
              Track and manage employee certifications and licenses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="certifications" />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Certification
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">{certifications.length}</div>
            <div className="text-sm text-gray-600">Total Certifications</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600">{validCount}</div>
            <div className="text-sm text-gray-600">Valid</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-orange-600">{expiringSoonCount}</div>
            <div className="text-sm text-gray-600">Expiring Soon</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            <div className="text-sm text-gray-600">Expired</div>
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
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              aria-label="Filter by employee"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter by type"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Types</option>
              {certTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by status"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="warning">Expiring (90 days)</option>
              <option value="expiring">Expiring Soon (30 days)</option>
              <option value="expired">Expired</option>
            </select>

            <button
              onClick={() => {
                setFilterEmployee('')
                setFilterType('')
                setFilterStatus('')
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
          data={filteredCertifications}
          columns={columns}
          searchKeys={['cert_type', 'cert_number']}
          emptyMessage="No certifications tracked"
          emptyAction={
            <button
              onClick={() => setShowForm(true)}
              className="mt-1 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Certification
            </button>
          }
          actions={(cert) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(cert)
                }}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
                aria-label="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(cert.cert_id)
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
                aria-label="Delete"
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
          title={editingCertification ? 'Edit Certification' : 'Add New Certification'}
          maxWidth="2xl"
        >
          <CertificationForm
            certification={editingCertification}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        </Modal>
      </div>
    </DashboardLayout>
  )
}
