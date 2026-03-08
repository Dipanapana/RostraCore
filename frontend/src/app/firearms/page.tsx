'use client'

import { useState, useEffect, useCallback } from 'react'
import { firearmsApi, employeesApi } from '@/services/api'
import PageHeader from '@/components/ui/PageHeader'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Crosshair,
  Plus,
  RefreshCw,
  X,
  Search,
  ArrowRightLeft,
  CornerDownLeft,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FirearmItem {
  firearm_id: number
  org_id: number
  serial_number: string
  make: string
  model: string | null
  caliber: string | null
  firearm_type: string
  license_number: string | null
  license_expiry: string | null
  status: string
  current_holder_id: number | null
  current_holder_name: string | null
  purchase_date: string | null
  created_at: string | null
}

interface Employee {
  employee_id: number
  first_name: string
  last_name: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'in_armory', label: 'In Armory' },
  { value: 'issued', label: 'Issued' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'lost', label: 'Lost' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

const STATUS_COLORS: Record<string, string> = {
  in_armory: 'bg-emerald-100 text-emerald-800',
  issued: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-amber-100 text-amber-800',
  lost: 'bg-red-100 text-red-800',
  decommissioned: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  in_armory: 'In Armory',
  issued: 'Issued',
  maintenance: 'Maintenance',
  lost: 'Lost',
  decommissioned: 'Decommissioned',
}

const CONDITION_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'unserviceable']
const ISSUE_CONDITION_OPTIONS = ['good', 'fair', 'poor']
const FIREARM_TYPES = ['handgun', 'shotgun', 'rifle', 'other']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FirearmsPage() {
  const [firearms, setFirearms] = useState<FirearmItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [showIssue, setShowIssue] = useState<FirearmItem | null>(null)
  const [showReturn, setShowReturn] = useState<FirearmItem | null>(null)
  const [showInspect, setShowInspect] = useState<FirearmItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState({
    serial_number: '',
    make: '',
    model: '',
    caliber: '',
    firearm_type: 'handgun',
    license_number: '',
    license_expiry: '',
    purchase_date: '',
  })

  // Issue form
  const [issueForm, setIssueForm] = useState({
    employee_id: 0,
    ammunition_issued: 0,
    condition_on_issue: 'good',
  })

  // Return form
  const [returnForm, setReturnForm] = useState({
    ammunition_returned: 0,
    condition_on_return: 'good',
  })

  // Inspect form
  const [inspectForm, setInspectForm] = useState({
    condition: 'good',
    passed: true,
    next_inspection_due: '',
    notes: '',
  })

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchFirearms = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter) params.status_filter = statusFilter
      const res = await firearmsApi.list(params)
      setFirearms(res.data)
    } catch (err) {
      console.error('Failed to fetch firearms:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeesApi.getAll({ status: 'active', limit: 500 })
      setEmployees(res.data?.employees || res.data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }, [])

  useEffect(() => {
    fetchFirearms()
  }, [fetchFirearms])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await firearmsApi.create({
        ...createForm,
        license_expiry: createForm.license_expiry || null,
        purchase_date: createForm.purchase_date || null,
      })
      setShowCreate(false)
      setCreateForm({
        serial_number: '',
        make: '',
        model: '',
        caliber: '',
        firearm_type: 'handgun',
        license_number: '',
        license_expiry: '',
        purchase_date: '',
      })
      fetchFirearms()
    } catch (err) {
      console.error('Failed to create firearm:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleIssue = async () => {
    if (!showIssue || !issueForm.employee_id) return
    setActionLoading(true)
    try {
      await firearmsApi.issue(showIssue.firearm_id, {
        employee_id: issueForm.employee_id,
        ammunition_issued: issueForm.ammunition_issued,
        condition_on_issue: issueForm.condition_on_issue,
      })
      setShowIssue(null)
      setIssueForm({ employee_id: 0, ammunition_issued: 0, condition_on_issue: 'good' })
      fetchFirearms()
    } catch (err: any) {
      console.error('Failed to issue firearm:', err)
      alert(err.response?.data?.detail || 'Failed to issue firearm')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    if (!showReturn) return
    setActionLoading(true)
    try {
      await firearmsApi.returnFirearm(showReturn.firearm_id, {
        ammunition_returned: returnForm.ammunition_returned,
        condition_on_return: returnForm.condition_on_return,
      })
      setShowReturn(null)
      setReturnForm({ ammunition_returned: 0, condition_on_return: 'good' })
      fetchFirearms()
    } catch (err: any) {
      console.error('Failed to return firearm:', err)
      alert(err.response?.data?.detail || 'Failed to return firearm')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInspect = async () => {
    if (!showInspect) return
    setActionLoading(true)
    try {
      await firearmsApi.inspect(showInspect.firearm_id, {
        condition: inspectForm.condition,
        passed: inspectForm.passed,
        next_inspection_due: inspectForm.next_inspection_due || null,
        notes: inspectForm.notes || null,
      })
      setShowInspect(null)
      setInspectForm({ condition: 'good', passed: true, next_inspection_due: '', notes: '' })
      fetchFirearms()
    } catch (err) {
      console.error('Failed to record inspection:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Firearms Register"
        subtitle="Manage firearms, issue/return, inspections & compliance"
        icon={<Crosshair className="text-blue-600" size={28} />}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Firearm
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchFirearms}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Serial #</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Make / Model</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Caliber</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">License #</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">License Expiry</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-gray-500 font-medium">Holder</th>
                <th className="text-right px-4 py-3 text-xs uppercase text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading firearms...
                  </td>
                </tr>
              ) : firearms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No firearms found. Register your first firearm above.
                  </td>
                </tr>
              ) : (
                firearms.map((f) => {
                  const isExpired =
                    f.license_expiry &&
                    new Date(f.license_expiry) < new Date()
                  return (
                    <tr
                      key={f.firearm_id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                        {f.serial_number}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {f.make}
                        {f.model ? ` ${f.model}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.caliber || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {f.firearm_type}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {f.license_number || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isExpired
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                          }
                        >
                          {f.license_expiry || '-'}
                          {isExpired && (
                            <AlertTriangle className="w-3 h-3 inline ml-1 text-red-600" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {STATUS_LABELS[f.status] || f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.current_holder_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {f.status === 'in_armory' && (
                            <button
                              onClick={() => {
                                setShowIssue(f)
                                setIssueForm({
                                  employee_id: 0,
                                  ammunition_issued: 0,
                                  condition_on_issue: 'good',
                                })
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Issue"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          {f.status === 'issued' && (
                            <button
                              onClick={() => {
                                setShowReturn(f)
                                setReturnForm({
                                  ammunition_returned: 0,
                                  condition_on_return: 'good',
                                })
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Return"
                            >
                              <CornerDownLeft className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowInspect(f)
                              setInspectForm({
                                condition: 'good',
                                passed: true,
                                next_inspection_due: '',
                                notes: '',
                              })
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Inspect"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Create Modal */}
      {/* ------------------------------------------------------------------- */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Register Firearm</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    value={createForm.serial_number}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, serial_number: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. SN-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Make *</label>
                  <input
                    type="text"
                    value={createForm.make}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, make: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Glock"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Model</label>
                  <input
                    type="text"
                    value={createForm.model}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, model: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 17 Gen5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Caliber</label>
                  <input
                    type="text"
                    value={createForm.caliber}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, caliber: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 9mm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Firearm Type *</label>
                  <select
                    value={createForm.firearm_type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, firearm_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {FIREARM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">License Number</label>
                  <input
                    type="text"
                    value={createForm.license_number}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, license_number: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="License #"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={createForm.license_expiry}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, license_expiry: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={createForm.purchase_date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, purchase_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !createForm.serial_number || !createForm.make}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {actionLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Issue Modal */}
      {/* ------------------------------------------------------------------- */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Issue Firearm
              </h2>
              <button
                onClick={() => setShowIssue(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-500">
                Issuing: <span className="text-gray-900 font-medium">{showIssue.make} {showIssue.model || ''}</span>{' '}
                (SN: {showIssue.serial_number})
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Assign to Employee *</label>
                <select
                  value={issueForm.employee_id}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, employee_id: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value={0}>-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Ammunition Issued</label>
                  <input
                    type="number"
                    min={0}
                    value={issueForm.ammunition_issued}
                    onChange={(e) =>
                      setIssueForm({
                        ...issueForm,
                        ammunition_issued: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Condition on Issue</label>
                  <select
                    value={issueForm.condition_on_issue}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, condition_on_issue: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {ISSUE_CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowIssue(null)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleIssue}
                disabled={actionLoading || !issueForm.employee_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {actionLoading ? 'Issuing...' : 'Issue Firearm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Return Modal */}
      {/* ------------------------------------------------------------------- */}
      {showReturn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Return Firearm
              </h2>
              <button
                onClick={() => setShowReturn(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-500">
                Returning: <span className="text-gray-900 font-medium">{showReturn.make} {showReturn.model || ''}</span>{' '}
                (SN: {showReturn.serial_number})
                <br />
                Held by: <span className="text-gray-900">{showReturn.current_holder_name || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Ammunition Returned</label>
                  <input
                    type="number"
                    min={0}
                    value={returnForm.ammunition_returned}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        ammunition_returned: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Condition on Return</label>
                  <select
                    value={returnForm.condition_on_return}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, condition_on_return: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {ISSUE_CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowReturn(null)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {actionLoading ? 'Returning...' : 'Return to Armory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Inspect Modal */}
      {/* ------------------------------------------------------------------- */}
      {showInspect && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Record Inspection
              </h2>
              <button
                onClick={() => setShowInspect(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-500">
                Inspecting: <span className="text-gray-900 font-medium">{showInspect.make} {showInspect.model || ''}</span>{' '}
                (SN: {showInspect.serial_number})
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Condition *</label>
                <select
                  value={inspectForm.condition}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, condition: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="inspection-passed"
                  checked={inspectForm.passed}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, passed: e.target.checked })
                  }
                  className="w-4 h-4 rounded bg-white border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="inspection-passed" className="text-sm text-gray-700">
                  Inspection Passed
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Next Inspection Due</label>
                <input
                  type="date"
                  value={inspectForm.next_inspection_due}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, next_inspection_due: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Notes</label>
                <textarea
                  value={inspectForm.notes}
                  onChange={(e) =>
                    setInspectForm({ ...inspectForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Optional inspection notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowInspect(null)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInspect}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {actionLoading ? 'Recording...' : 'Record Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
