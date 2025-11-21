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

    if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
    if (daysUntilExpiry <= 30) return { status: 'expiring', label: 'Expiring Soon', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' }
    if (daysUntilExpiry <= 90) return { status: 'warning', label: 'Expiring', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' }
    return { status: 'valid', label: 'Valid', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' }
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
          <User className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900 dark:text-white">
            {getEmployeeName(cert.employee_id)}
          </span>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (cert) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">{cert.cert_type}</span>
        </div>
      ),
    },
    {
      header: 'Cert Number',
      cell: (cert) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {cert.cert_number || '-'}
        </span>
      ),
    },
    {
      header: 'Dates',
      cell: (cert) => (
        <div className="flex flex-col text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Issued: {formatDate(cert.issue_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mt-0.5">
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
              {status.status === 'valid' && <CheckCircle className="w-3 h-3" />}
              {status.label}
            </span>
            {cert.verified && (
              <span className="px-2 py-0.5 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Certifications Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Track and manage employee certifications and licenses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="certifications" />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Certification
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{certifications.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Certifications</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{validCount}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Valid</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{expiringSoonCount}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Expiring Soon</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{expiredCount}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Expired</div>
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

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          data={filteredCertifications}
          columns={columns}
          searchKeys={['cert_type', 'cert_number']}
          actions={(cert) => (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(cert)
                }}
                className="p-2 text-slate-400 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(cert.cert_id)
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
