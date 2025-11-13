'use client'

import { useState, useEffect, useMemo } from 'react'
import { shiftsApi, sitesApi, employeesApi } from '@/services/api'
import { Shift, Site, Employee } from '@/types'
import ShiftForm from '@/components/ShiftForm'
import ExportButtons from '@/components/ExportButtons'
import DashboardLayout from '@/components/layout/DashboardLayout'

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

  // Pagination and search
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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

  // Filter and search shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      // Apply existing filters
      if (filterSite && shift.site_id.toString() !== filterSite) return false
      if (filterStatus && shift.status !== filterStatus) return false
      if (filterEmployee && shift.assigned_employee_id?.toString() !== filterEmployee) return false

      // Apply search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const siteName = getSiteName(shift.site_id).toLowerCase()
        const employeeName = getEmployeeName(shift.assigned_employee_id).toLowerCase()
        const status = shift.status.toLowerCase()
        const requiredSkill = shift.required_skill?.toLowerCase() || ''

        return (
          siteName.includes(searchLower) ||
          employeeName.includes(searchLower) ||
          status.includes(searchLower) ||
          requiredSkill.includes(searchLower)
        )
      }

      return true
    })
  }, [shifts, filterSite, filterStatus, filterEmployee, searchTerm])

  const totalPages = Math.ceil(filteredShifts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentShifts = filteredShifts.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Format date/time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-lg">Loading shifts...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Shift Management</h1>
            <p className="text-gray-600">Schedule and manage security shifts</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButtons type="shifts" />
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              + Create Shift
            </button>
          </div>
        </div>

        {/* Search and Items Per Page */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search shifts..."
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
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Site
              </label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Sites</option>
                {sites.map(site => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Employee
              </label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterSite('')
                  setFilterStatus('')
                  setFilterEmployee('')
                }}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-600">{shifts.length}</div>
            <div className="text-sm text-gray-600">Total Shifts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-green-600">
              {shifts.filter(s => s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-gray-600">Assigned</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-yellow-600">
              {shifts.filter(s => !s.assigned_employee_id).length}
            </div>
            <div className="text-sm text-gray-600">Unassigned</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-purple-600">
              {shifts.filter(s => s.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Shifts Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentShifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm
                        ? `No shifts match "${searchTerm}"`
                        : shifts.length === 0
                        ? 'No shifts found. Click "Create Shift" to add one.'
                        : 'No shifts match your filters.'}
                    </td>
                  </tr>
                ) : (
                  currentShifts.map((shift) => (
                    <tr key={shift.shift_id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{shift.shift_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getSiteName(shift.site_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(shift.start_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(shift.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={shift.assigned_employee_id ? '' : 'text-red-600 font-medium'}>
                          {getEmployeeName(shift.assigned_employee_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                          shift.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          shift.status === 'planned' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shift.status}
                        </span>
                        {shift.is_overtime && (
                          <span className="ml-1 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            OT
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(shift.shift_id)}
                          className="text-red-600 hover:text-red-900 ml-4 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredShifts.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-md">
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
                  <span className="font-medium">{Math.min(endIndex, filteredShifts.length)}</span> of{' '}
                  <span className="font-medium">{filteredShifts.length}</span> results
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
                    // Show first page, last page, current page, and pages around current
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
        <ShiftForm
          shift={editingShift}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
      </div>
    </DashboardLayout>
  )
}
