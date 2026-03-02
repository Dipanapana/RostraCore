'use client'

import { useState, useEffect, useCallback } from 'react'
import { Employee, Client, Site, Gender, AccountType, PayType, EmployeeRole } from '@/types'
import { employeesApi, clientsApi, sitesApi, organizationSettingsApi } from '@/services/api'

interface EmployeeFormProps {
  employee?: Employee | null
  onClose: () => void
  onSuccess: () => void
}

const STEP_LABELS = ['Basic Info', 'Compensation', 'Contact & Banking', 'Assignments & Review']

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1'

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: 'armed', label: 'Armed' },
  { value: 'unarmed', label: 'Unarmed' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'field_worker', label: 'Field Worker' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'other', label: 'Other' },
]

const PSIRA_ELIGIBLE_ROLES: EmployeeRole[] = ['armed', 'unarmed', 'supervisor']

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Mpumalanga',
  'Limpopo',
  'North West',
  'Northern Cape',
]

const SA_BANKS = [
  'ABSA',
  'FNB',
  'Standard Bank',
  'Nedbank',
  'Capitec',
  'African Bank',
  'TymeBank',
  'Discovery Bank',
  'Investec',
  'Old Mutual',
  'Other',
]

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({})

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    role: 'unarmed' as EmployeeRole,
    pay_type: 'hourly' as PayType,
    hourly_rate: '',
    monthly_salary: '',
    max_hours_week: '48',
    cert_level: '',
    home_location: '',
    status: 'active' as 'active' | 'inactive',
    email: '',
    phone: '',
    assigned_client_ids: [] as number[],
    preferred_site_ids: [] as number[],
    gender: '' as Gender | '',
    address: '',
    province: '',
    employee_number: '',
    bank_name: '',
    account_number: '',
    branch_code: '',
    account_type: '' as AccountType | '',
    tax_number: '',
    psira_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hire_date: '',
    termination_date: '',
  })

  const [clients, setClients] = useState<Client[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateHint, setRateHint] = useState<string | null>(null)

  // Lookup default hourly rate when grade or role changes
  const lookupDefaultRate = useCallback(
    async (grade: string, role: string) => {
      if (!grade || !role) return
      if (employee && employee.hourly_rate && employee.hourly_rate > 0) return

      try {
        const response = await organizationSettingsApi.lookupHourlyRate(grade, role)
        if (response.data.found && response.data.default_hourly_rate) {
          setFormData((prev) => ({
            ...prev,
            hourly_rate: response.data.default_hourly_rate.toString(),
          }))
          setRateHint(`Auto-populated from default rate for Grade ${grade} ${role}`)
          setTimeout(() => setRateHint(null), 5000)
        }
      } catch {
        console.log('No default rate found')
      }
    },
    [employee]
  )

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

  // Fetch clients and sites on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, sitesRes] = await Promise.all([
          clientsApi.getAll(),
          sitesApi.getAll(),
        ])
        setClients(Array.isArray(clientsRes.data) ? clientsRes.data : [])
        setSites(Array.isArray(sitesRes.data) ? sitesRes.data : [])
      } catch (err) {
        console.error('Failed to fetch clients/sites:', err)
      }
    }
    fetchData()
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        id_number: employee.id_number,
        role: employee.role,
        pay_type: employee.pay_type || 'hourly',
        hourly_rate: employee.hourly_rate?.toString() || '',
        monthly_salary: employee.monthly_salary?.toString() || '',
        max_hours_week: employee.max_hours_week.toString(),
        cert_level: employee.cert_level || '',
        home_location: employee.home_location || '',
        status: employee.status,
        email: employee.email || '',
        phone: employee.phone || '',
        assigned_client_ids:
          employee.assigned_client_ids ||
          (employee.assigned_client_id ? [employee.assigned_client_id] : []),
        preferred_site_ids: (employee as any).preferred_site_ids || [],
        gender: employee.gender || '',
        address: employee.address || '',
        province: employee.province || '',
        employee_number: employee.employee_number || '',
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        branch_code: employee.branch_code || '',
        account_type: employee.account_type || '',
        tax_number: employee.tax_number || '',
        psira_number: employee.psira_number || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        hire_date: employee.hire_date || '',
        termination_date: employee.termination_date || '',
      })
    }
  }, [employee])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // When PSIRA grade changes, lookup default rate
      if (name === 'cert_level' && value) {
        lookupDefaultRate(value, newData.role)
      }

      // When role changes, lookup default rate if cert_level set
      if (name === 'role' && newData.cert_level) {
        lookupDefaultRate(newData.cert_level, value)
      }

      return newData
    })
  }

  const gradeRoleWarning = validateGradeRole(formData.cert_level, formData.role)

  // Step validation
  const validateStep = (step: number): string[] => {
    const errors: string[] = []
    switch (step) {
      case 1:
        if (!formData.first_name.trim()) errors.push('First Name is required')
        if (!formData.last_name.trim()) errors.push('Last Name is required')
        if (!formData.id_number.trim()) errors.push('ID Number is required')
        if (!formData.role) errors.push('Role is required')
        if (!formData.pay_type) errors.push('Pay Type is required')
        break
      case 2:
        if (formData.pay_type === 'hourly' && !formData.hourly_rate) {
          errors.push('Hourly Rate is required for hourly pay type')
        }
        if (formData.pay_type === 'monthly_fixed' && !formData.monthly_salary) {
          errors.push('Monthly Salary is required for monthly fixed pay type')
        }
        break
      // Steps 3 and 4 have no required fields
    }
    return errors
  }

  const goToNext = () => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: errors }))
      return
    }
    setStepErrors((prev) => ({ ...prev, [currentStep]: [] }))
    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  const goToPrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const handleSubmit = async () => {
    // Validate all steps before submitting
    for (let step = 1; step <= 4; step++) {
      const errors = validateStep(step)
      if (errors.length > 0) {
        setStepErrors((prev) => ({ ...prev, [step]: errors }))
        setCurrentStep(step)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const data: Record<string, any> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        id_number: formData.id_number,
        role: formData.role,
        pay_type: formData.pay_type,
        max_hours_week: parseInt(formData.max_hours_week),
        status: formData.status,
        cert_level: formData.cert_level || undefined,
        home_location: formData.home_location || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        assigned_client_ids:
          formData.assigned_client_ids.length > 0 ? formData.assigned_client_ids : undefined,
        preferred_site_ids:
          formData.preferred_site_ids.length > 0 ? formData.preferred_site_ids : undefined,
        gender: formData.gender || undefined,
        address: formData.address || undefined,
        province: formData.province || undefined,
        employee_number: formData.employee_number || undefined,
        bank_name: formData.bank_name || undefined,
        account_number: formData.account_number || undefined,
        branch_code: formData.branch_code || undefined,
        account_type: formData.account_type || undefined,
        tax_number: formData.tax_number || undefined,
        psira_number: formData.psira_number || undefined,
        emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        hire_date: formData.hire_date || undefined,
        termination_date: formData.termination_date || undefined,
      }

      // Send the appropriate compensation field based on pay type
      if (formData.pay_type === 'hourly') {
        data.hourly_rate = parseFloat(formData.hourly_rate)
      } else {
        data.monthly_salary = parseFloat(formData.monthly_salary)
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

  // ---- Step Indicator ----
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        return (
          <div key={stepNum} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-xs mt-1.5 whitespace-nowrap ${
                  isCurrent
                    ? 'text-blue-600 font-medium'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {/* Connecting line */}
            {stepNum < 4 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1 mb-5 ${
                  stepNum < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  // ---- Step 1: Basic Info ----
  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Basic Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>
        <div className="md:col-span-2">
          <label className={LABEL_CLASS}>
            ID Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="id_number"
            value={formData.id_number}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-gray-500 mt-1">
            South African ID: 13 digits (YYMMDD SSSS C A Z)
          </p>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Role <span className="text-red-500">*</span>
          </label>
          <select name="role" value={formData.role} onChange={handleChange} className={INPUT_CLASS}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Pay Type <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pay_type"
                value="hourly"
                checked={formData.pay_type === 'hourly'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hourly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pay_type"
                value="monthly_fixed"
                checked={formData.pay_type === 'monthly_fixed'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Monthly Fixed Salary
              </span>
            </label>
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={INPUT_CLASS}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className={INPUT_CLASS}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Hire Date</label>
          <input
            type="date"
            name="hire_date"
            value={formData.hire_date}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Termination Date</label>
          <input
            type="date"
            name="termination_date"
            value={formData.termination_date}
            onChange={handleChange}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  )

  // ---- Step 2: Compensation ----
  const renderStep2 = () => {
    const showPsira = PSIRA_ELIGIBLE_ROLES.includes(formData.role)
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Compensation
        </h3>

        {gradeRoleWarning && (
          <div className="bg-amber-50 border border-amber-400 text-amber-700 px-4 py-3 rounded-lg mb-4">
            {gradeRoleWarning}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.pay_type === 'hourly' ? (
            <div>
              <label className={LABEL_CLASS}>
                Hourly Rate (ZAR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={INPUT_CLASS}
              />
              {rateHint && (
                <p className="text-xs text-green-600 mt-1">{rateHint}</p>
              )}
            </div>
          ) : (
            <div>
              <label className={LABEL_CLASS}>
                Monthly Salary (ZAR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthly_salary"
                value={formData.monthly_salary}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={INPUT_CLASS}
              />
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>Max Hours/Week</label>
            <input
              type="number"
              name="max_hours_week"
              value={formData.max_hours_week}
              onChange={handleChange}
              min="0"
              max="168"
              className={INPUT_CLASS}
            />
          </div>

          {showPsira && (
            <>
              <div>
                <label className={LABEL_CLASS}>PSIRA Grade</label>
                <select
                  name="cert_level"
                  value={formData.cert_level}
                  onChange={handleChange}
                  className={INPUT_CLASS}
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
                <label className={LABEL_CLASS}>PSIRA Number</label>
                <input
                  type="text"
                  name="psira_number"
                  value={formData.psira_number}
                  onChange={handleChange}
                  placeholder="PSIRA registration number"
                  className={INPUT_CLASS}
                />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ---- Step 3: Contact & Banking ----
  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Contact Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="employee@example.com"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+27 123 456 789"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Home Location</label>
          <input
            type="text"
            name="home_location"
            value={formData.home_location}
            onChange={handleChange}
            placeholder="City or GPS coordinates"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Province</label>
          <select
            name="province"
            value={formData.province}
            onChange={handleChange}
            className={INPUT_CLASS}
          >
            <option value="">Select Province</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={LABEL_CLASS}>Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Physical address"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Emergency Contact Name</label>
          <input
            type="text"
            name="emergency_contact_name"
            value={formData.emergency_contact_name}
            onChange={handleChange}
            placeholder="Emergency contact name"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Emergency Contact Phone</label>
          <input
            type="tel"
            name="emergency_contact_phone"
            value={formData.emergency_contact_phone}
            onChange={handleChange}
            placeholder="+27 123 456 789"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Banking Details Divider */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Banking Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Bank Name</label>
            <select
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
              className={INPUT_CLASS}
            >
              <option value="">Select Bank</option>
              {SA_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b === 'FNB' ? 'FNB (First National Bank)' : b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Account Type</label>
            <select
              name="account_type"
              value={formData.account_type}
              onChange={handleChange}
              className={INPUT_CLASS}
            >
              <option value="">Select Account Type</option>
              <option value="savings">Savings</option>
              <option value="cheque">Cheque</option>
              <option value="current">Current</option>
              <option value="transmission">Transmission</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Account Number</label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              placeholder="Bank account number"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Branch Code</label>
            <input
              type="text"
              name="branch_code"
              value={formData.branch_code}
              onChange={handleChange}
              placeholder="6-digit branch code"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Tax Number</label>
            <input
              type="text"
              name="tax_number"
              value={formData.tax_number}
              onChange={handleChange}
              placeholder="SARS tax reference number"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>
    </div>
  )

  // ---- Step 4: Assignments & Review ----
  const renderStep4 = () => {
    const assignedClientNames = clients
      .filter((c) => formData.assigned_client_ids.includes(c.client_id))
      .map((c) => c.client_name)

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Assignments
        </h3>

        {/* Client Assignment */}
        <div>
          <label className={LABEL_CLASS}>Assigned Clients</label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1 bg-white">
            {clients.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">
                No clients available
              </p>
            ) : (
              clients.map((client) => (
                <label
                  key={client.client_id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.assigned_client_ids.includes(client.client_id)}
                    onChange={(e) => {
                      const clientId = client.client_id
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          assigned_client_ids: [...prev.assigned_client_ids, clientId],
                        }))
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          assigned_client_ids: prev.assigned_client_ids.filter(
                            (id) => id !== clientId
                          ),
                        }))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {client.client_name}
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select which clients this employee can work for. Leave empty to allow all clients.
          </p>
        </div>

        {/* Preferred Sites */}
        <div>
          <label className={LABEL_CLASS}>Preferred Sites</label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1 bg-white">
            {sites.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">
                No sites available
              </p>
            ) : (
              sites.map((site: any) => (
                <label
                  key={site.site_id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.preferred_site_ids.includes(site.site_id)}
                    onChange={(e) => {
                      const siteId = site.site_id
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          preferred_site_ids: [...prev.preferred_site_ids, siteId],
                        }))
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          preferred_site_ids: prev.preferred_site_ids.filter(
                            (id) => id !== siteId
                          ),
                        }))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">
                    {site.site_name}
                    {site.client_name && (
                      <span className="text-gray-400 ml-1">({site.client_name})</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sites where this guard is preferentially deployed. The optimizer will try to assign them here first.
          </p>
        </div>

        {/* Employee Number */}
        <div className="max-w-sm">
          <label className={LABEL_CLASS}>Employee Number</label>
          <input
            type="text"
            name="employee_number"
            value={formData.employee_number}
            onChange={handleChange}
            placeholder="Internal employee number"
            className={INPUT_CLASS}
          />
        </div>

        {/* Summary / Review Card */}
        <div className="border-t border-gray-200 pt-6 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Review Summary
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3 text-sm">
            {/* Row 1: Identity */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-900">
                  {formData.first_name} {formData.last_name}
                </p>
              </div>
              <div>
                <span className="text-gray-500">ID Number</span>
                <p className="font-medium text-gray-900">
                  {formData.id_number}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Role</span>
                <p className="font-medium text-gray-900 capitalize">
                  {formData.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Row 2: Compensation */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
              <div>
                <span className="text-gray-500">Pay Type</span>
                <p className="font-medium text-gray-900">
                  {formData.pay_type === 'hourly' ? 'Hourly' : 'Monthly Fixed'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  {formData.pay_type === 'hourly' ? 'Hourly Rate' : 'Monthly Salary'}
                </span>
                <p className="font-medium text-gray-900">
                  {formData.pay_type === 'hourly'
                    ? formData.hourly_rate
                      ? `R ${parseFloat(formData.hourly_rate).toFixed(2)}`
                      : '--'
                    : formData.monthly_salary
                      ? `R ${parseFloat(formData.monthly_salary).toFixed(2)}`
                      : '--'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p className="font-medium text-gray-900 capitalize">
                  {formData.status}
                </p>
              </div>
            </div>

            {/* Row 3: Contact */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
              {formData.email && (
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium text-gray-900">
                    {formData.email}
                  </p>
                </div>
              )}
              {formData.phone && (
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium text-gray-900">
                    {formData.phone}
                  </p>
                </div>
              )}
              {formData.province && (
                <div>
                  <span className="text-gray-500">Province</span>
                  <p className="font-medium text-gray-900">
                    {formData.province}
                  </p>
                </div>
              )}
            </div>

            {/* Row 4: Banking (if any set) */}
            {formData.bank_name && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border-t border-gray-200 pt-3">
                <div>
                  <span className="text-gray-500">Bank</span>
                  <p className="font-medium text-gray-900">
                    {formData.bank_name}
                  </p>
                </div>
                {formData.account_type && (
                  <div>
                    <span className="text-gray-500">Account Type</span>
                    <p className="font-medium text-gray-900 capitalize">
                      {formData.account_type}
                    </p>
                  </div>
                )}
                {formData.account_number && (
                  <div>
                    <span className="text-gray-500">Account No.</span>
                    <p className="font-medium text-gray-900">
                      {'****' + formData.account_number.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Row 5: Assignments */}
            {assignedClientNames.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <span className="text-gray-500">Assigned Clients</span>
                <p className="font-medium text-gray-900">
                  {assignedClientNames.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- Render current step content ----
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {employee ? 'Edit Employee' : 'Enroll New Employee'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
          {renderStepIndicator()}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Global error */}
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step validation errors */}
          {stepErrors[currentStep] && stepErrors[currentStep].length > 0 && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {stepErrors[currentStep].map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {renderCurrentStep()}
        </div>

        {/* Footer navigation */}
        <div className="p-6 pt-4 border-t border-gray-200 flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPrevious}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={goToNext}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? 'Saving...'
                  : employee
                    ? 'Update Employee'
                    : 'Create Employee'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
