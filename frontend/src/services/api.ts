import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    console.log('[API] Request to:', config.url)
    console.log('[API] Token in localStorage:', token ? token.substring(0, 20) + '...' : 'NONE')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[API] Authorization header set')
    } else {
      console.log('[API] No token - request will be unauthenticated')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// API endpoints
export const employeesApi = {
  getAll: () => api.get('/api/v1/employees'),
  getById: (id: number) => api.get(`/api/v1/employees/${id}`),
  create: (data: any) => api.post('/api/v1/employees', data),
  update: (id: number, data: any) => api.put(`/api/v1/employees/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/employees/${id}`),
  importFromExcel: (formData: FormData) => api.post('/api/v1/employees/import-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getDataQualityDashboard: () => api.get('/api/v1/employees/dashboard/data-quality'),
}

export const clientsApi = {
  getAll: () => api.get('/api/v1/clients'),
  getById: (id: number) => api.get(`/api/v1/clients/${id}`),
  create: (data: any) => api.post('/api/v1/clients', data),
  update: (id: number, data: any) => api.put(`/api/v1/clients/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/clients/${id}`),
}

export const sitesApi = {
  getAll: () => api.get('/api/v1/sites'),
  getById: (id: number) => api.get(`/api/v1/sites/${id}`),
  create: (data: any) => api.post('/api/v1/sites', data),
  update: (id: number, data: any) => api.put(`/api/v1/sites/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/sites/${id}`),
}

export const shiftsApi = {
  getAll: (params?: any) => api.get('/api/v1/shifts', { params }),
  getById: (id: number) => api.get(`/api/v1/shifts/${id}`),
  create: (data: any) => api.post('/api/v1/shifts', data),
  update: (id: number, data: any) => api.put(`/api/v1/shifts/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/shifts/${id}`),
  getAssignments: (shiftId: number) => api.get(`/api/v1/shifts/${shiftId}/assignments`),
  assignEmployee: (shiftId: number, employeeId: number) => api.post(`/api/v1/shifts/${shiftId}/assign/${employeeId}`),
  unassignEmployee: (shiftId: number, employeeId: number) => api.delete(`/api/v1/shifts/${shiftId}/assignments/${employeeId}`),
}

export const rosterApi = {
  generate: (data: any) => api.post('/api/v1/roster/generate', data, { timeout: 180000 }), // 180 second timeout for optimization
  preview: (params?: any) => api.get('/api/v1/roster/preview', { params }),
  confirm: (data: any) => api.post('/api/v1/roster/confirm', data),
  getBudgetSummary: (params?: any) => api.get('/api/v1/roster/budget-summary', { params }),
  getUnfilledShifts: () => api.get('/api/v1/roster/unfilled-shifts'),
  getEmployeeHours: (params?: any) => api.get('/api/v1/roster/employee-hours', { params }),
  getAssignmentDashboard: (params?: { start_date?: string; end_date?: string; client_id?: number }) =>
    api.get('/api/v1/roster/assignment-dashboard', { params }),
}

export const availabilityApi = {
  getAll: (params?: any) => api.get('/api/v1/availability', { params }),
  getById: (id: number) => api.get(`/api/v1/availability/${id}`),
  create: (data: any) => api.post('/api/v1/availability', data),
  update: (id: number, data: any) => api.put(`/api/v1/availability/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/availability/${id}`),
}

export const certificationsApi = {
  getAll: (params?: any) => api.get('/api/v1/certifications', { params }),
  getExpiring: (days?: number) => api.get('/api/v1/certifications/expiring', { params: { days } }),
  getById: (id: number) => api.get(`/api/v1/certifications/${id}`),
  create: (data: any) => api.post('/api/v1/certifications', data),
  update: (id: number, data: any) => api.put(`/api/v1/certifications/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/certifications/${id}`),
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const rosterPreferencesApi = {
  getAll: (scope?: string) => {
    const params = scope ? `?scope=${scope}` : ''
    return api.get(`/api/v1/roster-preferences${params}`)
  },
  getById: (id: number) => api.get(`/api/v1/roster-preferences/${id}`),
  create: (data: any) => api.post('/api/v1/roster-preferences', data),
  update: (id: number, data: any) => api.put(`/api/v1/roster-preferences/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/roster-preferences/${id}`),
  previewResolved: (params: {
    employee_id?: number
    site_id?: number
    client_id?: number
    emergency_mode?: boolean
  }) => {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return api.get(`/api/v1/roster-preferences/resolve/preview?${queryString}`)
  },
  createEmergencyRequest: (data: any) => api.post('/api/v1/roster-preferences/emergency-shifts', data),
  getEmergencyRequests: (status?: string) => {
    const params = status ? `?status=${status}` : ''
    return api.get(`/api/v1/roster-preferences/emergency-shifts${params}`)
  },
}

export const billingApi = {
  // Get subscription status
  getSubscriptionStatus: () => api.get('/api/v1/payments/subscription/status'),

  // Start subscription (returns PayFast checkout data)
  subscribe: () => api.post('/api/v1/payments/subscribe'),

  // Start trial
  startTrial: () => api.post('/api/v1/payments/start-trial'),

  // Extend trial (superadmin only)
  extendTrial: (orgId?: number, days: number = 30) =>
    api.post('/api/v1/payments/extend-trial', null, { params: { org_id: orgId, days } }),
}

export const organizationUsersApi = {
  getAll: () => api.get('/api/v1/organization/users'),
  getById: (userId: number) => api.get(`/api/v1/organization/users/${userId}`),
  invite: (data: {
    email: string
    full_name: string
    role: string
    managed_client_ids?: number[]
    send_email?: boolean
  }) => api.post('/api/v1/organization/users/invite', data),
  updateRole: (userId: number, newRole: string) =>
    api.patch(`/api/v1/organization/users/${userId}/role`, null, { params: { new_role: newRole } }),
  updateClients: (userId: number, clientIds: number[]) =>
    api.patch(`/api/v1/organization/users/${userId}/clients`, { managed_client_ids: clientIds }),
  updateOwnerStatus: (userId: number, isOwner: boolean) =>
    api.patch(`/api/v1/organization/users/${userId}/owner`, { is_owner: isOwner }),
  remove: (userId: number) => api.delete(`/api/v1/organization/users/${userId}`),
  resetPassword: (userId: number) => api.post(`/api/v1/organization/users/${userId}/reset-password`),
  getUserClients: (userId: number) => api.get(`/api/v1/organization/users/${userId}/clients`),
}

export const superadminApi = {
  // System stats
  getStats: () => api.get('/api/v1/superadmin/stats'),

  // Comprehensive Analytics (Data Scientist Dashboard)
  getComprehensiveAnalytics: () => api.get('/api/v1/superadmin/analytics/comprehensive'),

  // Organizations
  getOrganizations: (params?: { status?: string; search?: string }) =>
    api.get('/api/v1/superadmin/organizations', { params }),
  getOrganization: (orgId: number) => api.get(`/api/v1/superadmin/organizations/${orgId}`),

  // Organization actions
  approveOrganization: (orgId: number) => api.post(`/api/v1/superadmin/organizations/${orgId}/approve`),
  suspendOrganization: (orgId: number, reason?: string) =>
    api.post(`/api/v1/superadmin/organizations/${orgId}/suspend`, null, { params: { reason } }),
  activateOrganization: (orgId: number) => api.post(`/api/v1/superadmin/organizations/${orgId}/activate`),
  extendTrial: (orgId: number, days: number = 30) =>
    api.post(`/api/v1/superadmin/organizations/${orgId}/extend-trial`, null, { params: { days } }),
  updateTier: (orgId: number, tier: string) =>
    api.put(`/api/v1/superadmin/organizations/${orgId}/tier`, null, { params: { tier } }),

  // SuperAdmin Invitations
  inviteSuperadmin: (data: { email: string; full_name: string }) =>
    api.post('/api/v1/superadmin/invite-superadmin', data),
  getInvitations: () => api.get('/api/v1/superadmin/invitations'),
  revokeInvitation: (invitationId: number) =>
    api.delete(`/api/v1/superadmin/invitations/${invitationId}`),
  validateInvitation: (token: string) =>
    api.get(`/api/v1/superadmin/invitations/validate/${token}`),
  acceptInvitation: (data: { token: string; password: string; full_name?: string }) =>
    api.post('/api/v1/superadmin/accept-invitation', data),
}

// Site Staffing Profiles API
export const staffingProfilesApi = {
  getForSite: (siteId: number, activeOnly: boolean = true) =>
    api.get(`/api/v1/sites/${siteId}/staffing-profiles`, { params: { active_only: activeOnly } }),
  create: (siteId: number, data: any) =>
    api.post(`/api/v1/sites/${siteId}/staffing-profiles`, data),
  createStandard: (siteId: number, config: {
    weekday_day_staff: number
    weekday_night_staff: number
    weekend_day_staff: number
    weekend_night_staff: number
  }) => api.post(`/api/v1/sites/${siteId}/staffing-profiles/standard`, config),
  update: (siteId: number, profileId: number, data: any) =>
    api.put(`/api/v1/sites/${siteId}/staffing-profiles/${profileId}`, data),
  delete: (siteId: number, profileId: number) =>
    api.delete(`/api/v1/sites/${siteId}/staffing-profiles/${profileId}`),
  preview: (siteId: number, startDate: string, endDate: string) =>
    api.post(`/api/v1/sites/${siteId}/staffing-preview`, { start_date: startDate, end_date: endDate }),
}

// Employee Availability Patterns API
export const availabilityPatternsApi = {
  getForEmployee: (employeeId: number, activeOnly: boolean = true) =>
    api.get(`/api/v1/employees/${employeeId}/availability-patterns`, { params: { active_only: activeOnly } }),
  create: (employeeId: number, data: any) =>
    api.post(`/api/v1/employees/${employeeId}/availability-patterns`, data),
  createStandard: (employeeId: number, config: {
    effective_from: string
    effective_to?: string
    weekday_start?: string
    weekday_end?: string
    include_saturday?: boolean
    saturday_start?: string
    saturday_end?: string
  }) => api.post(`/api/v1/employees/${employeeId}/availability-patterns/standard`, config),
  update: (employeeId: number, patternId: number, data: any) =>
    api.put(`/api/v1/employees/${employeeId}/availability-patterns/${patternId}`, data),
  delete: (employeeId: number, patternId: number) =>
    api.delete(`/api/v1/employees/${employeeId}/availability-patterns/${patternId}`),
  getCalendar: (employeeId: number, startDate: string, endDate: string) =>
    api.post(`/api/v1/employees/${employeeId}/availability-calendar`, { start_date: startDate, end_date: endDate }),
  checkAvailability: (employeeId: number, date: string, time?: string) => {
    const params: any = { date }
    if (time) params.time = time
    return api.get(`/api/v1/employees/${employeeId}/check-availability`, { params })
  },
}

// Organization Settings API (Client Management and Hourly Rates)
export const organizationSettingsApi = {
  getClientManagement: () => api.get('/api/v1/organization-settings/client-management'),
  updateClientManagement: (data: { mode: 'all' | 'selected'; client_ids?: number[] }) =>
    api.put('/api/v1/organization-settings/client-management', data),
  getClientManagementMode: () => api.get('/api/v1/organization-settings/client-management/mode'),

  // Default Hourly Rates
  getHourlyRates: () => api.get('/api/v1/organization-settings/hourly-rates'),
  updateHourlyRates: (rates: Array<{ psira_grade: string; role: string; default_hourly_rate: number }>) =>
    api.put('/api/v1/organization-settings/hourly-rates', { rates }),
  lookupHourlyRate: (psiraGrade: string, role: string) =>
    api.get('/api/v1/organization-settings/hourly-rates/lookup', { params: { psira_grade: psiraGrade, role } }),
  applyDefaultRates: (data: { employee_ids?: number[]; overwrite_existing?: boolean }) =>
    api.post('/api/v1/organization-settings/hourly-rates/apply', data),
  seedDefaultRates: () => api.post('/api/v1/organization-settings/hourly-rates/seed-defaults'),
}

export const exportsApi = {
  // PDF Reports
  rosterPdf: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${API_BASE_URL}/api/v1/exports/roster/pdf${queryString ? '?' + queryString : ''}`
  },

  // CSV Exports
  employeesCsv: () => `${API_BASE_URL}/api/v1/exports/employees/csv`,
  sitesCsv: () => `${API_BASE_URL}/api/v1/exports/sites/csv`,
  shiftsCsv: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${API_BASE_URL}/api/v1/exports/shifts/csv${queryString ? '?' + queryString : ''}`
  },
  certificationsCsv: () => `${API_BASE_URL}/api/v1/exports/certifications/csv`,

  // Excel Exports
  employeesExcel: () => `${API_BASE_URL}/api/v1/exports/employees/excel`,
  sitesExcel: () => `${API_BASE_URL}/api/v1/exports/sites/excel`,
  shiftsExcel: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${API_BASE_URL}/api/v1/exports/shifts/excel${queryString ? '?' + queryString : ''}`
  },
  certificationsExcel: () => `${API_BASE_URL}/api/v1/exports/certifications/excel`,
}

// Payroll Deductions API (SA Tax Calculations)
export const payrollDeductionsApi = {
  calculatePaye: (grossMonthly: number, age: number = 35) =>
    api.get('/api/v1/payroll-deductions/paye', { params: { gross_monthly: grossMonthly, age } }),
  calculateUif: (grossMonthly: number) =>
    api.get('/api/v1/payroll-deductions/uif', { params: { gross_monthly: grossMonthly } }),
  calculateSdl: (totalMonthlyPayroll: number, isExempt: boolean = false) =>
    api.get('/api/v1/payroll-deductions/sdl', { params: { total_monthly_payroll: totalMonthlyPayroll, is_exempt: isExempt } }),
  calculateNetPay: (grossMonthly: number, age: number = 35, otherDeductions: number = 0) =>
    api.get('/api/v1/payroll-deductions/net-pay', { params: { gross_monthly: grossMonthly, age, other_deductions: otherDeductions } }),
  calculateCostToCompany: (grossMonthly: number, totalMonthlyPayroll: number = 0) =>
    api.get('/api/v1/payroll-deductions/cost-to-company', { params: { gross_monthly: grossMonthly, total_monthly_payroll: totalMonthlyPayroll } }),
  getTaxTables: () => api.get('/api/v1/payroll-deductions/tax-tables'),
}

export default api
