'use client'

import { useState, useEffect, useCallback } from 'react'
import { Employee, Client, Gender, AccountType, EmploymentType, WorkPatternType, EmployeeRole } from '@/types'
import { employeesApi, clientsApi, organizationSettingsApi } from '@/services/api'

interface EmployeeFormProps {
  employee?: Employee | null
  onClose: () => void
  onSuccess: () => void
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    role: 'unarmed' as EmployeeRole,
    hourly_rate: '',
    max_hours_week: '48',
    cert_level: '',
    home_location: '',
    status: 'active' as 'active' | 'inactive',
    email: '',
    phone: '',
    assigned_client_ids: [] as number[],
    // Personal details
    gender: '' as Gender | '',
    address: '',
    province: '',
    employee_number: '',
    // Banking details
    bank_name: '',
    account_number: '',
    branch_code: '',
    account_type: '' as AccountType | '',
    // Tax details
    tax_number: '',
    // PSIRA details
    psira_number: '',
    // Emergency contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    // Phase 1: Multi-type HR platform fields
    employment_type: 'permanent' as EmploymentType,
    work_pattern_type: 'shift_based' as WorkPatternType,
    contract_start_date: '',
    contract_end_date: '',
    daily_rate: '',
    project_name: '',
    invoicing_frequency: '',
    skills: [] as string[],
    department: '',
    job_title: '',
    max_hours_month: '',
    preferred_days: [] as string[],
    standard_work_hours_start: '',
    standard_work_hours_end: '',
    core_hours_start: '',
    core_hours_end: '',
    is_independent_contractor: false
  })

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateHint, setRateHint] = useState<string | null>(null)

  // Lookup default hourly rate when grade or role changes
  const lookupDefaultRate = useCallback(async (grade: string, role: string) => {
    if (!grade || !role) return

    // Only auto-populate for new employees or if hourly rate is empty/zero
    if (employee && employee.hourly_rate > 0) return

    try {
      const response = await organizationSettingsApi.lookupHourlyRate(grade, role)
      if (response.data.found && response.data.default_hourly_rate) {
        setFormData(prev => ({
          ...prev,
          hourly_rate: response.data.default_hourly_rate.toString()
        }))
        setRateHint(`Auto-populated from default rate for Grade ${grade} ${role}`)
        setTimeout(() => setRateHint(null), 5000)
      }
    } catch (err) {
      console.log('No default rate found')
    }
  }, [employee])

  // Validate Grade E cannot be armed
  const validateGradeRole = (grade: string, role: string): string | null => {
    if (grade === 'E' && role === 'armed') {
      return 'Grade E (Basic Security Officer) cannot be armed. Grade B or higher is required for armed roles.'
    }
    if ((grade === 'D' || grade === 'E') && role === 'armed') {
      return `Grade ${grade} typically cannot be armed. Grade B is minimum for armed security.`
    }
    return null
  }

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientsApi.getAll()
        setClients(response.data)
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      }
    }
    fetchClients()
  }, [])

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        id_number: employee.id_number,
        role: employee.role,
        hourly_rate: employee.hourly_rate.toString(),
        max_hours_week: employee.max_hours_week.toString(),
        cert_level: employee.cert_level || '',
        home_location: employee.home_location || '',
        status: employee.status,
        email: employee.email || '',
        phone: employee.phone || '',
        assigned_client_ids: employee.assigned_client_ids || (employee.assigned_client_id ? [employee.assigned_client_id] : []),
        // Personal details
        gender: employee.gender || '',
        address: employee.address || '',
        province: employee.province || '',
        employee_number: employee.employee_number || '',
        // Banking details
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        branch_code: employee.branch_code || '',
        account_type: employee.account_type || '',
        // Tax details
        tax_number: employee.tax_number || '',
        // PSIRA details
        psira_number: employee.psira_number || '',
        // Emergency contact
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        // Phase 1: Multi-type HR platform fields
        employment_type: employee.employment_type || 'permanent',
        work_pattern_type: employee.work_pattern_type || 'shift_based',
        contract_start_date: employee.contract_start_date || '',
        contract_end_date: employee.contract_end_date || '',
        daily_rate: employee.daily_rate?.toString() || '',
        project_name: employee.project_name || '',
        invoicing_frequency: employee.invoicing_frequency || '',
        skills: employee.skills || [],
        department: employee.department || '',
        job_title: employee.job_title || '',
        max_hours_month: employee.max_hours_month?.toString() || '',
        preferred_days: employee.preferred_days || [],
        standard_work_hours_start: employee.standard_work_hours_start || '',
        standard_work_hours_end: employee.standard_work_hours_end || '',
        core_hours_start: employee.core_hours_start || '',
        core_hours_end: employee.core_hours_end || '',
        is_independent_contractor: employee.is_independent_contractor || false
      })
    }
  }, [employee])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }

      // When PSIRA grade changes, lookup default rate
      if (name === 'cert_level' && value) {
        lookupDefaultRate(value, newData.role)
      }

      // When role changes, lookup default rate
      if (name === 'role' && newData.cert_level) {
        lookupDefaultRate(newData.cert_level, value)
      }

      return newData
    })
  }

  // Get validation warning for current grade/role combination
  const gradeRoleWarning = validateGradeRole(formData.cert_level, formData.role)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate),
        max_hours_week: parseInt(formData.max_hours_week),
        cert_level: formData.cert_level || undefined,
        home_location: formData.home_location || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        assigned_client_ids: formData.assigned_client_ids.length > 0 ? formData.assigned_client_ids : undefined,
        // Personal details
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        province: formData.province || undefined,
        employee_number: formData.employee_number || undefined,
        // Banking details
        bank_name: formData.bank_name || undefined,
        account_number: formData.account_number || undefined,
        branch_code: formData.branch_code || undefined,
        account_type: formData.account_type || undefined,
        // Tax details
        tax_number: formData.tax_number || undefined,
        // PSIRA details
        psira_number: formData.psira_number || undefined,
        // Emergency contact
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        // Phase 1: Multi-type HR platform fields
        employment_type: formData.employment_type,
        work_pattern_type: formData.work_pattern_type,
        contract_start_date: formData.contract_start_date || undefined,
        contract_end_date: formData.contract_end_date || undefined,
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : undefined,
        project_name: formData.project_name || undefined,
        invoicing_frequency: formData.invoicing_frequency || undefined,
        skills: formData.skills.length > 0 ? formData.skills : undefined,
        department: formData.department || undefined,
        job_title: formData.job_title || undefined,
        max_hours_month: formData.max_hours_month ? parseInt(formData.max_hours_month) : undefined,
        preferred_days: formData.preferred_days.length > 0 ? formData.preferred_days : undefined,
        standard_work_hours_start: formData.standard_work_hours_start || undefined,
        standard_work_hours_end: formData.standard_work_hours_end || undefined,
        core_hours_start: formData.core_hours_start || undefined,
        core_hours_end: formData.core_hours_end || undefined,
        is_independent_contractor: formData.is_independent_contractor
      }

      if (employee) {
        await employeesApi.update(employee.employee_id, data)
      } else {
        await employeesApi.create(data)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {gradeRoleWarning && (
            <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded mb-4">
              {gradeRoleWarning}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="permanent">Permanent</option>
                  <option value="contract">Fixed-Term Contract</option>
                  <option value="consultant">Consultant / Independent Contractor</option>
                  <option value="part_time">Part-Time</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Pattern <span className="text-red-500">*</span>
                </label>
                <select
                  name="work_pattern_type"
                  value={formData.work_pattern_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="shift_based">Shift-Based (4-on-4-off, 12-hour, etc.)</option>
                  <option value="office_hours">Office Hours (Mon-Fri 9-5)</option>
                  <option value="project_based">Project-Based (No fixed schedule)</option>
                  <option value="flexible">Flexible (Core hours + flex)</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Security Personnel">
                    <option value="unarmed">Unarmed Security Officer</option>
                    <option value="armed">Armed Security Officer</option>
                    <option value="supervisor">Security Supervisor</option>
                  </optgroup>
                  <optgroup label="Other Roles">
                    <option value="office_staff">Office Staff</option>
                    <option value="contractor">Contractor</option>
                    <option value="consultant">Consultant</option>
                  </optgroup>
                </select>
              </div>

              <div></div> {/* Spacer for grid alignment */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (ZAR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {rateHint && (
                  <p className="text-xs text-green-600 mt-1">{rateHint}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Hours/Week <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="max_hours_week"
                  value={formData.max_hours_week}
                  onChange={handleChange}
                  required
                  min="0"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSIRA Grade
                </label>
                <select
                  name="cert_level"
                  value={formData.cert_level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select PSIRA Grade</option>
                  <option value="A">Grade A - Security Manager / Armed Response</option>
                  <option value="B">Grade B - Armed Security Officer</option>
                  <option value="C">Grade C - Close Protection Officer</option>
                  <option value="D">Grade D - Door Supervisor / Event Security</option>
                  <option value="E">Grade E - Security Officer (Basic)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="employee@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+27 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Location
                </label>
                <input
                  type="text"
                  name="home_location"
                  value={formData.home_location}
                  onChange={handleChange}
                  placeholder="City or GPS coordinates"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Consultant/Contractor Specific Fields */}
              {formData.employment_type === 'consultant' && (
                <>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Consultant Details</h3>
                    {formData.is_independent_contractor && (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-3 text-sm">
                        <strong>Independent Contractor:</strong> No PAYE, UIF, or SDL withholding. Responsible for own provisional tax (SARS).
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="contract_start_date"
                      value={formData.contract_start_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="contract_end_date"
                      value={formData.contract_end_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Rate (ZAR)
                    </label>
                    <input
                      type="number"
                      name="daily_rate"
                      value={formData.daily_rate}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      placeholder="Alternative to hourly rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoicing Frequency
                    </label>
                    <select
                      name="invoicing_frequency"
                      value={formData.invoicing_frequency}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Frequency</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="milestone">Milestone-Based</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleChange}
                      placeholder="Project or engagement name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_independent_contractor"
                        checked={formData.is_independent_contractor}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_independent_contractor: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Independent Contractor (SARS - No PAYE/UIF/SDL)</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Check this if the consultant is responsible for their own tax (no employee deductions)
                    </p>
                  </div>
                </>
              )}

              {/* Office Hours Specific Fields */}
              {formData.work_pattern_type === 'office_hours' && (
                <>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Office Work Details</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="HR, Finance, IT, Operations"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleChange}
                      placeholder="Office Manager, Accountant, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Hours Start
                    </label>
                    <input
                      type="time"
                      name="standard_work_hours_start"
                      value={formData.standard_work_hours_start}
                      onChange={handleChange}
                      placeholder="09:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Hours End
                    </label>
                    <input
                      type="time"
                      name="standard_work_hours_end"
                      value={formData.standard_work_hours_end}
                      onChange={handleChange}
                      placeholder="17:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Part-Time Specific Fields */}
              {formData.employment_type === 'part_time' && (
                <>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Part-Time Details</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Hours per Month
                    </label>
                    <input
                      type="number"
                      name="max_hours_month"
                      value={formData.max_hours_month}
                      onChange={handleChange}
                      min="0"
                      placeholder="e.g., 80"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div></div> {/* Spacer */}
                </>
              )}

              {/* Additional Personal Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Number
                </label>
                <input
                  type="text"
                  name="employee_number"
                  value={formData.employee_number}
                  onChange={handleChange}
                  placeholder="Internal employee number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Province</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="North West">North West</option>
                  <option value="Northern Cape">Northern Cape</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSIRA Number
                </label>
                <input
                  type="text"
                  name="psira_number"
                  value={formData.psira_number}
                  onChange={handleChange}
                  placeholder="PSIRA registration number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Physical address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Banking Details Section */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Banking Details (for Payroll)</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <select
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bank</option>
                  <option value="ABSA">ABSA</option>
                  <option value="FNB">FNB (First National Bank)</option>
                  <option value="Standard Bank">Standard Bank</option>
                  <option value="Nedbank">Nedbank</option>
                  <option value="Capitec">Capitec</option>
                  <option value="African Bank">African Bank</option>
                  <option value="TymeBank">TymeBank</option>
                  <option value="Discovery Bank">Discovery Bank</option>
                  <option value="Investec">Investec</option>
                  <option value="Old Mutual">Old Mutual</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Account Type</option>
                  <option value="savings">Savings</option>
                  <option value="cheque">Cheque</option>
                  <option value="current">Current</option>
                  <option value="transmission">Transmission</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="Bank account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code
                </label>
                <input
                  type="text"
                  name="branch_code"
                  value={formData.branch_code}
                  onChange={handleChange}
                  placeholder="6-digit branch code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tax Details Section */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Tax Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleChange}
                  placeholder="SARS tax reference number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div></div> {/* Spacer for grid alignment */}

              {/* Emergency Contact Section */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Emergency Contact</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Emergency contact name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="+27 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Client Assignment */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Clients
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                  {clients.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No clients available</p>
                  ) : (
                    clients.map(client => (
                      <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assigned_client_ids.includes(client.client_id)}
                          onChange={(e) => {
                            const clientId = client.client_id
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assigned_client_ids: [...prev.assigned_client_ids, clientId]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assigned_client_ids: prev.assigned_client_ids.filter(id => id !== clientId)
                              }))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{client.client_name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select which clients this guard can work for. Leave empty to allow all clients.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : (employee ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
