import axios from 'axios'
import { getApiUrl } from '@/lib/config'
import { toast } from '@/context/ToastContext'

// Create axios instance - always same-origin via rewrites (Next.js dev / Vercel prod)
export const api = axios.create({
  baseURL: '', // Empty = same-origin requests, rewrites proxy to backend
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to:
// 1. Set baseURL at RUNTIME (empty for production, localhost for dev)
// 2. Attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    // Set baseURL based on environment
    config.baseURL = getApiUrl()

    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 (session expired) and redirect to login
//
// Guards against the "login-logout loop":
//   • Skip auth endpoints (login/register/me) — let callers handle errors
//   • Only redirect if a token was present (user was actually logged in)
//   • Debounce: ignore duplicate 401s once a redirect is already queued
// ---------------------------------------------------------------------------
let _redirectPending = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || ''

    // 1. Never intercept auth endpoints — let AuthContext handle its own errors
    if (url.includes('/auth/')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !_redirectPending) {
      // 2. Only act if we had a token (i.e. the user was logged in)
      const hadToken = localStorage.getItem('access_token')
      if (hadToken && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        _redirectPending = true

        // Clear auth state
        localStorage.removeItem('access_token')
        document.cookie = 'access_token=; path=/; max-age=0'

        toast.warning('Session Expired', 'Your session has expired. Redirecting to login...')
        setTimeout(() => {
          window.location.href = '/login'
          // Reset flag after navigation (in case SPA doesn't fully reload)
          _redirectPending = false
        }, 1500)
      }
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const employeesApi = {
  getAll: (params?: { status?: string; skip?: number; limit?: number }) => api.get('/api/v1/employees/', { params }),
  getById: (id: number) => api.get(`/api/v1/employees/${id}`),
  create: (data: any) => api.post('/api/v1/employees/', data),
  update: (id: number, data: any) => api.put(`/api/v1/employees/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/employees/${id}`),
  importFromExcel: (formData: FormData) => api.post('/api/v1/employees/import-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getDataQualityDashboard: () => api.get('/api/v1/employees/dashboard/data-quality'),
  getGradeStats: () => api.get('/api/v1/employees/grade-stats'),
  getHrAnalytics: () => api.get('/api/v1/employees/hr-analytics'),
  getTurnoverAnalytics: (params?: { months?: number }) =>
    api.get('/api/v1/employees/turnover-analytics', { params }),
}

export const clientsApi = {
  getAll: () => api.get('/api/v1/clients/'),
  getById: (id: number) => api.get(`/api/v1/clients/${id}`),
  create: (data: any) => api.post('/api/v1/clients/', data),
  update: (id: number, data: any) => api.put(`/api/v1/clients/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/clients/${id}`),
  getContractAlerts: () => api.get('/api/v1/clients/contract-alerts'),
}

export const sitesApi = {
  getAll: () => api.get('/api/v1/sites/'),
  getById: (id: number) => api.get(`/api/v1/sites/${id}`),
  create: (data: any) => api.post('/api/v1/sites/', data),
  update: (id: number, data: any) => api.put(`/api/v1/sites/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/sites/${id}`),
}

export const shiftsApi = {
  getAll: (params?: any) => api.get('/api/v1/shifts/', { params }),
  getById: (id: number) => api.get(`/api/v1/shifts/${id}`),
  create: (data: any) => api.post('/api/v1/shifts/', data),
  update: (id: number, data: any) => api.put(`/api/v1/shifts/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/shifts/${id}`),
  getAssignments: (shiftId: number) => api.get(`/api/v1/shifts/${shiftId}/assignments`),
  assignEmployee: (shiftId: number, employeeId: number) => api.post(`/api/v1/shifts/${shiftId}/assign/${employeeId}`),
  unassignEmployee: (shiftId: number, employeeId: number) => api.delete(`/api/v1/shifts/${shiftId}/assignments/${employeeId}`),
  getCoverageGaps: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/v1/shifts/coverage-gaps', { params }),
}

export const rosterApi = {
  generate: (data: any) => api.post('/api/v1/roster/generate', data, { timeout: 180000 }), // 180 second timeout for optimization
  preview: (params?: any) => api.get('/api/v1/roster/preview', { params }),
  confirm: (data: any) => api.post('/api/v1/roster/confirm', data),
  getBudgetSummary: (params?: any) => api.get('/api/v1/roster/budget-summary', { params }),
  getUnfilledShifts: (params?: { start_date?: string; end_date?: string; site_id?: number }) =>
    api.get('/api/v1/roster/unfilled-shifts', { params }),
  getEmployeeHours: (params?: any) => api.get('/api/v1/roster/employee-hours', { params }),
  getAssignmentDashboard: (params?: { start_date?: string; end_date?: string; client_id?: number }) =>
    api.get('/api/v1/roster/assignment-dashboard', { params }),
  getSparePool: (params?: { lookback_days?: number; buffer_pct?: number }) =>
    api.get('/api/v1/roster/spare-pool', { params }),
  getCostForecast: (params: {
    start_date: string;
    end_date: string;
    site_id?: number;
    client_id?: number;
    budget_limit?: number;
  }) => api.get('/api/v1/roster/cost-forecast', { params }),
  getPostingAlerts: (params: {
    start_date: string;
    end_date: string;
    site_id?: number;
    client_id?: number;
  }) => api.get('/api/v1/roster/posting-alerts', { params }),
  getOvertimeCompliance: (params?: { week_start?: string }) =>
    api.get('/api/v1/roster/overtime-compliance', { params }),
  getSiteCoverageCalendar: (params: {
    start_date: string;
    end_date: string;
    site_id?: number;
    client_id?: number;
  }) => api.get('/api/v1/roster/site-coverage-calendar', { params }),
}

export const availabilityApi = {
  getAll: (params?: any) => api.get('/api/v1/availability/', { params }),
  getById: (id: number) => api.get(`/api/v1/availability/${id}`),
  create: (data: any) => api.post('/api/v1/availability/', data),
  update: (id: number, data: any) => api.put(`/api/v1/availability/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/availability/${id}`),
}

export const certificationsApi = {
  getAll: (params?: any) => api.get('/api/v1/certifications/', { params }),
  getExpiring: (days?: number) => api.get('/api/v1/certifications/expiring', { params: { days } }),
  getById: (id: number) => api.get(`/api/v1/certifications/${id}`),
  create: (data: any) => api.post('/api/v1/certifications/', data),
  update: (id: number, data: any) => api.put(`/api/v1/certifications/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/certifications/${id}`),
  getComplianceDashboard: () => api.get('/api/v1/certifications/compliance-dashboard'),
}

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

export const invoiceApi = {
  list: (params?: { client_id?: number; status?: string; skip?: number; limit?: number }) =>
    api.get('/api/v1/invoices/', { params }),
  get: (invoiceId: number) => api.get(`/api/v1/invoices/${invoiceId}`),
  generate: (data: { client_id: number; period_start: string; period_end: string; due_date?: string; notes?: string; payment_terms?: string; purchase_order_number?: string }) =>
    api.post('/api/v1/invoices/generate', data),
  updateStatus: (invoiceId: number, status: string, paymentReference?: string) =>
    api.patch(`/api/v1/invoices/${invoiceId}/status`, null, { params: { new_status: status, payment_reference: paymentReference } }),
  delete: (invoiceId: number) => api.delete(`/api/v1/invoices/${invoiceId}`),
  getSummary: (params?: { period_start?: string; period_end?: string }) =>
    api.get('/api/v1/invoices/stats/summary', { params }),
  downloadPdf: (invoiceId: number) =>
    api.get(`/api/v1/invoices/${invoiceId}/pdf`, { responseType: 'blob' }),
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
    return `${getApiUrl()}/api/v1/exports/roster/pdf${queryString ? '?' + queryString : ''}`
  },

  // Excel Reports
  rosterExcel: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${getApiUrl()}/api/v1/exports/roster/excel${queryString ? '?' + queryString : ''}`
  },

  // Payroll System CSV (Sage 300 / Pastel Evolution / VIP Payroll)
  payrollCsv: (periodStart: string, periodEnd: string, format: 'sage300' | 'pastel' | 'vip') =>
    `${getApiUrl()}/api/v1/exports/payroll/csv?period_start=${periodStart}&period_end=${periodEnd}&format=${format}`,

  // CSV Exports
  employeesCsv: () => `${getApiUrl()}/api/v1/exports/employees/csv`,
  sitesCsv: () => `${getApiUrl()}/api/v1/exports/sites/csv`,
  shiftsCsv: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${getApiUrl()}/api/v1/exports/shifts/csv${queryString ? '?' + queryString : ''}`
  },
  certificationsCsv: () => `${getApiUrl()}/api/v1/exports/certifications/csv`,

  // Excel Exports
  employeesExcel: () => `${getApiUrl()}/api/v1/exports/employees/excel`,
  sitesExcel: () => `${getApiUrl()}/api/v1/exports/sites/excel`,
  shiftsExcel: (params?: any) => {
    const queryString = new URLSearchParams(params).toString()
    return `${getApiUrl()}/api/v1/exports/shifts/excel${queryString ? '?' + queryString : ''}`
  },
  certificationsExcel: () => `${getApiUrl()}/api/v1/exports/certifications/excel`,
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

// Reports API (Financial & Operational Reports)
export const reportsApi = {
  // JSON data endpoints
  profitability: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/profitability', { params }),
  sitePerformance: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/site-performance', { params }),
  employeePayroll: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/employee-payroll', { params }),
  revenueVsCost: (params: { period_start: string; period_end: string; group_by?: string }) =>
    api.get('/api/v1/reports/revenue-vs-cost', { params }),
  outstandingInvoices: () =>
    api.get('/api/v1/reports/outstanding-invoices'),
  clientProfitability: (params?: { period_start?: string; period_end?: string }) =>
    api.get('/api/v1/reports/client-profitability', { params }),

  // PDF download URLs (open in new tab or download)
  profitabilityPdf: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/profitability/pdf', { params, responseType: 'blob' }),
  revenuePdf: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/revenue-by-client/pdf', { params, responseType: 'blob' }),
  coveragePdf: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/coverage/pdf', { params, responseType: 'blob' }),
  outstandingInvoicesPdf: () =>
    api.get('/api/v1/reports/outstanding-invoices/pdf', { responseType: 'blob' }),
  employeePayrollPdf: (params: { period_start: string; period_end: string }) =>
    api.get('/api/v1/reports/employee-payroll/pdf', { params, responseType: 'blob' }),
  psiraCompliancePdf: () =>
    api.get('/api/v1/reports/psira-compliance/pdf', { responseType: 'blob' }),
}

export const patrolsApi = {
  listTours: (params?: { site_id?: number }) =>
    api.get('/api/v1/patrols/tours', { params }),
  getTour: (tourId: number) =>
    api.get(`/api/v1/patrols/tours/${tourId}`),
  listRuns: (params?: { tour_id?: number; run_status?: string; limit?: number }) =>
    api.get('/api/v1/patrols/runs', { params }),
}

export const incidentsApi = {
  list: (params?: { site_id?: number; severity?: string; status_filter?: string; skip?: number; limit?: number }) =>
    api.get('/api/v1/incidents/', { params }),
  get: (id: number) => api.get(`/api/v1/incidents/${id}`),
  updateStatus: (id: number, newStatus: string, resolutionNotes?: string) =>
    api.patch(`/api/v1/incidents/${id}/status`, null, {
      params: { new_status: newStatus, resolution_notes: resolutionNotes },
    }),
}

export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}

export const attendanceApi = {
  getRecords: (params?: {
    start_date?: string
    end_date?: string
    employee_id?: number
    site_id?: number
    attendance_status?: string
    skip?: number
    limit?: number
  }) => api.get('/api/v1/attendance/', { params }),
  getAnalytics: (params?: { period_days?: number }) =>
    api.get('/api/v1/attendance/analytics', { params }),
}

export const notificationsApi = {
  getAll: (params?: { unread_only?: boolean; skip?: number; limit?: number }) =>
    api.get('/api/v1/notifications/', { params }),
  markRead: (id: number) => api.patch(`/api/v1/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/v1/notifications/read-all'),
}

// Guard Restrictions API (Personnel Blacklisting)
export const guardRestrictionsApi = {
  list: (params?: { employee_id?: number; client_id?: number; site_id?: number }) =>
    api.get('/api/v1/guard-restrictions/', { params }),
  create: (data: { employee_id: number; client_id?: number; site_id?: number; reason?: string }) =>
    api.post('/api/v1/guard-restrictions/', data),
  remove: (restrictionId: number) =>
    api.delete(`/api/v1/guard-restrictions/${restrictionId}`),
}

export const employeeEvaluationsApi = {
  list: (employeeId: number) =>
    api.get(`/api/v1/employees/${employeeId}/evaluations`),
  create: (employeeId: number, data: {
    evaluation_date: string;
    overall_score: number;
    punctuality_score?: number | null;
    conduct_score?: number | null;
    performance_score?: number | null;
    appearance_score?: number | null;
    communication_score?: number | null;
    notes?: string;
  }) => api.post(`/api/v1/employees/${employeeId}/evaluations`, data),
  remove: (employeeId: number, evaluationId: number) =>
    api.delete(`/api/v1/employees/${employeeId}/evaluations/${evaluationId}`),
}

export const employeeDisciplinaryApi = {
  list: (employeeId: number) =>
    api.get(`/api/v1/employees/${employeeId}/disciplinary`),
  create: (employeeId: number, data: {
    incident_date: string;
    case_type: string;
    reason: string;
    outcome?: string;
  }) => api.post(`/api/v1/employees/${employeeId}/disciplinary`, data),
  remove: (employeeId: number, caseId: number) =>
    api.delete(`/api/v1/employees/${employeeId}/disciplinary/${caseId}`),
}

// Exception Workflow API
export const exceptionsApi = {
  getSummary: () => api.get('/api/v1/exceptions/summary'),
  list: (params?: {
    start_date?: string;
    end_date?: string;
    exception_type?: string;
    status_filter?: string;
    site_id?: number;
    employee_id?: number;
    skip?: number;
    limit?: number;
  }) => api.get('/api/v1/exceptions/', { params }),
  create: (data: {
    exception_type: string;
    exception_date: string;
    employee_id?: number;
    shift_id?: number;
    site_id?: number;
    description?: string;
  }) => api.post('/api/v1/exceptions/', data),
  updateStatus: (id: number, data: { status: string; resolution_notes?: string }) =>
    api.put(`/api/v1/exceptions/${id}/status`, data),
  remove: (id: number) => api.delete(`/api/v1/exceptions/${id}`),
}

export const shiftSwapsApi = {
  list: (params?: { status?: string; employee_id?: number; limit?: number; offset?: number }) =>
    api.get('/api/v1/shift-swaps/', { params }),
  upcomingAssignments: (limit?: number) =>
    api.get('/api/v1/shift-swaps/upcoming-assignments', { params: { limit: limit || 200 } }),
  create: (data: {
    requester_assignment_id: number;
    target_employee_id: number;
    target_assignment_id?: number;
    reason?: string;
  }) => api.post('/api/v1/shift-swaps/', data),
  peerRespond: (id: number, accept: boolean, decline_reason?: string) =>
    api.post(`/api/v1/shift-swaps/${id}/respond`, null, { params: { accept, decline_reason } }),
  review: (id: number, approve: boolean, rejection_reason?: string) =>
    api.post(`/api/v1/shift-swaps/${id}/review`, null, { params: { approve, rejection_reason } }),
  cancel: (id: number) => api.post(`/api/v1/shift-swaps/${id}/cancel`),
}

export const inspectionsApi = {
  // Templates
  listTemplates: (params?: { site_id?: number; active_only?: boolean }) =>
    api.get('/api/v1/inspections/templates/', { params }),
  createTemplate: (data: { name: string; description?: string; site_id?: number; items: { key: string; label: string; required?: boolean }[] }) =>
    api.post('/api/v1/inspections/templates/', data),
  updateTemplate: (id: number, data: any) =>
    api.put(`/api/v1/inspections/templates/${id}`, data),
  deleteTemplate: (id: number) =>
    api.delete(`/api/v1/inspections/templates/${id}`),
  // Inspections
  list: (params?: { site_id?: number; employee_id?: number; status?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/inspections/', { params }),
  start: (data: { template_id: number; site_id: number }) =>
    api.post('/api/v1/inspections/', data),
  submit: (id: number, data: { responses: Record<string, { checked: boolean; note?: string }>; overall_notes?: string }) =>
    api.post(`/api/v1/inspections/${id}/submit`, data),
  dashboard: (days?: number) =>
    api.get('/api/v1/inspections/dashboard/', { params: { days: days || 30 } }),
}

export const assetsApi = {
  list: (params?: { category?: string; status?: string; employee_id?: number; site_id?: number; search?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/assets/', { params }),
  create: (data: any) => api.post('/api/v1/assets/', data),
  update: (id: number, data: any) => api.put(`/api/v1/assets/${id}`, data),
  issue: (id: number, data: { employee_id: number; site_id?: number; notes?: string }) =>
    api.post(`/api/v1/assets/${id}/issue`, data),
  returnAsset: (id: number, notes?: string) =>
    api.post(`/api/v1/assets/${id}/return`, null, { params: { notes } }),
  history: (id: number) => api.get(`/api/v1/assets/${id}/history`),
  summary: () => api.get('/api/v1/assets/summary/'),
}

// ── Geofencing ──────────────────────────────────────────────────────────────
export const geofenceApi = {
  // Site geofence config
  listSites: () => api.get('/api/v1/geofence/sites/'),
  updateSite: (siteId: number, data: { geofence_enabled?: boolean; geofence_radius?: number }) =>
    api.put(`/api/v1/geofence/sites/${siteId}/`, data),

  // Geofence check (mobile)
  check: (data: { site_id: number; employee_id: number; lat: number; lng: number; shift_id?: number }) =>
    api.post('/api/v1/geofence/check/', data),

  // Violations
  listViolations: (params?: { site_id?: number; employee_id?: number; resolved?: string; days?: number; limit?: number; offset?: number }) =>
    api.get('/api/v1/geofence/violations/', { params }),
  resolveViolation: (id: number, data: { resolution: string; notes?: string }) =>
    api.post(`/api/v1/geofence/violations/${id}/resolve/`, data),

  // Dashboard
  dashboard: (days?: number) => api.get('/api/v1/geofence/dashboard/', { params: { days } }),
}

// ── Visitor Management ──────────────────────────────────────────────────────
export const visitorsApi = {
  list: (params?: { site_id?: number; status?: string; search?: string; days?: number; limit?: number; offset?: number }) =>
    api.get('/api/v1/visitors/', { params }),
  signIn: (data: any) => api.post('/api/v1/visitors/', data),
  signOut: (id: number, data?: { notes?: string }) =>
    api.post(`/api/v1/visitors/${id}/sign-out/`, data || {}),
  onSite: (siteId?: number) =>
    api.get('/api/v1/visitors/on-site/', { params: siteId ? { site_id: siteId } : {} }),
  dashboard: (days?: number) => api.get('/api/v1/visitors/dashboard/', { params: { days } }),
}

// ── Key Holding / Access Management ─────────────────────────────────────────
export const keysApi = {
  list: (params?: { site_id?: number; status?: string; key_type?: string; search?: string }) =>
    api.get('/api/v1/keys/', { params }),
  create: (data: any) => api.post('/api/v1/keys/', data),
  update: (id: number, data: any) => api.put(`/api/v1/keys/${id}/`, data),
  issue: (id: number, data: { employee_id: number; notes?: string }) =>
    api.post(`/api/v1/keys/${id}/issue/`, data),
  returnKey: (id: number, data?: { notes?: string }) =>
    api.post(`/api/v1/keys/${id}/return/`, data || {}),
  reportLost: (id: number) => api.post(`/api/v1/keys/${id}/report-lost/`),
  history: (id: number) => api.get(`/api/v1/keys/${id}/history/`),
  summary: () => api.get('/api/v1/keys/summary/'),
}

// ── Control Room / Communication Log ────────────────────────────────────────
export const commLogApi = {
  list: (params?: { site_id?: number; comm_type?: string; priority?: string; resolved?: string; search?: string; days?: number; limit?: number }) =>
    api.get('/api/v1/comm-log/', { params }),
  create: (data: any) => api.post('/api/v1/comm-log/', data),
  resolve: (id: number, data: { resolved: string; resolution_notes?: string }) =>
    api.post(`/api/v1/comm-log/${id}/resolve/`, data),
  dashboard: (days?: number) => api.get('/api/v1/comm-log/dashboard/', { params: { days } }),
}

// ── Certification Expiry Alerts ─────────────────────────────────────────────
export const certAlertsApi = {
  expiring: (params?: { days?: number; cert_type?: string }) =>
    api.get('/api/v1/cert-alerts/expiring/', { params }),
  dashboard: () => api.get('/api/v1/cert-alerts/dashboard/'),
}

// ── Daily Occurrence Book ───────────────────────────────────────────────────
export const dobApi = {
  list: (params?: { site_id?: number; category?: string; search?: string; date_from?: string; date_to?: string; days?: number; limit?: number }) =>
    api.get('/api/v1/occurrence-book/', { params }),
  create: (data: any) => api.post('/api/v1/occurrence-book/', data),
  dashboard: (days?: number) => api.get('/api/v1/occurrence-book/dashboard/', { params: { days } }),
}

// ── Document Management ─────────────────────────────────────────────────────
export const documentsApi = {
  list: (params?: { employee_id?: number; document_type?: string; search?: string; include_deleted?: boolean; limit?: number; offset?: number }) =>
    api.get('/api/v1/documents/', { params }),
  create: (data: any) => api.post('/api/v1/documents/', data),
  update: (id: number, data: any) => api.put(`/api/v1/documents/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/documents/${id}/`),
  summary: () => api.get('/api/v1/documents/summary/'),
}

// ── Training Management ─────────────────────────────────────────────────────
export const trainingApi = {
  // Courses
  listCourses: (params?: { category?: string; active_only?: boolean; search?: string }) =>
    api.get('/api/v1/training/courses/', { params }),
  createCourse: (data: any) => api.post('/api/v1/training/courses/', data),
  updateCourse: (id: number, data: any) => api.put(`/api/v1/training/courses/${id}/`, data),
  deleteCourse: (id: number) => api.delete(`/api/v1/training/courses/${id}/`),
  // Records
  listRecords: (params?: { employee_id?: number; course_id?: number; status?: string; search?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/training/records/', { params }),
  createRecord: (data: any) => api.post('/api/v1/training/records/', data),
  updateRecord: (id: number, data: any) => api.put(`/api/v1/training/records/${id}/`, data),
  deleteRecord: (id: number) => api.delete(`/api/v1/training/records/${id}/`),
  // Dashboard
  dashboard: () => api.get('/api/v1/training/dashboard/'),
}

// ── Contract Values ─────────────────────────────────────────────────────────
export const contractValuesApi = {
  list: (params?: { client_id?: number; site_id?: number; active_only?: boolean }) =>
    api.get('/api/v1/contract-values/', { params }),
  create: (data: any) => api.post('/api/v1/contract-values/', data),
  update: (id: number, data: any) => api.put(`/api/v1/contract-values/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/contract-values/${id}/`),
  dashboard: () => api.get('/api/v1/contract-values/dashboard/'),
}

// ── Fleet / Vehicle Management ──────────────────────────────────────────────
export const fleetApi = {
  list: (params?: { status?: string; assigned_site_id?: number; search?: string }) =>
    api.get('/api/v1/fleet/', { params }),
  create: (data: any) => api.post('/api/v1/fleet/', data),
  update: (id: number, data: any) => api.put(`/api/v1/fleet/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/fleet/${id}/`),
  dashboard: () => api.get('/api/v1/fleet/dashboard/'),
}

// ── Daily Activity Reports (DAR) ────────────────────────────────────────────
export const darApi = {
  list: (params?: { site_id?: number; employee_id?: number; status?: string; search?: string; days?: number; limit?: number; offset?: number }) =>
    api.get('/api/v1/daily-activity/', { params }),
  create: (data: any) => api.post('/api/v1/daily-activity/', data),
  review: (id: number, data: { reviewer_notes?: string }) =>
    api.post(`/api/v1/daily-activity/${id}/review/`, data),
  remove: (id: number) => api.delete(`/api/v1/daily-activity/${id}/`),
  dashboard: (days?: number) => api.get('/api/v1/daily-activity/dashboard/', { params: { days } }),
}

// ── Disciplinary Records ────────────────────────────────────────────────────
export const disciplinaryApi = {
  list: (params?: { employee_id?: number; type?: string; search?: string; days?: number; limit?: number; offset?: number }) =>
    api.get('/api/v1/disciplinary/', { params }),
  create: (data: any) => api.post('/api/v1/disciplinary/', data),
  update: (id: number, data: any) => api.put(`/api/v1/disciplinary/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/disciplinary/${id}/`),
  dashboard: (days?: number) => api.get('/api/v1/disciplinary/dashboard/', { params: { days } }),
}

// ── Company Announcements ───────────────────────────────────────────────────
export const announcementsApi = {
  list: (params?: { site_id?: number; priority?: string; category?: string; active_only?: boolean; search?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/announcements/', { params }),
  create: (data: any) => api.post('/api/v1/announcements/', data),
  update: (id: number, data: any) => api.put(`/api/v1/announcements/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/announcements/${id}/`),
  dashboard: () => api.get('/api/v1/announcements/dashboard/'),
}

// ── Maintenance Requests ────────────────────────────────────────────────────
export const maintenanceApi = {
  list: (params?: { site_id?: number; status?: string; priority?: string; category?: string; search?: string; days?: number; limit?: number }) =>
    api.get('/api/v1/maintenance/', { params }),
  create: (data: any) => api.post('/api/v1/maintenance/', data),
  update: (id: number, data: any) => api.put(`/api/v1/maintenance/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/maintenance/${id}/`),
  dashboard: (days?: number) => api.get('/api/v1/maintenance/dashboard/', { params: { days } }),
}

export const slaApi = {
  list: (params?: { site_id?: number; status?: string; year?: number; month?: number }) =>
    api.get('/api/v1/sla/', { params }),
  create: (data: any) => api.post('/api/v1/sla/', data),
  update: (id: number, data: any) => api.put(`/api/v1/sla/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/sla/${id}/`),
  dashboard: (year?: number) => api.get('/api/v1/sla/dashboard', { params: { year } }),
}

export const deploymentsApi = {
  list: (params?: { employee_id?: number; site_id?: number; reason?: string; active_only?: boolean; limit?: number }) =>
    api.get('/api/v1/deployments/', { params }),
  create: (data: any) => api.post('/api/v1/deployments/', data),
  update: (id: number, data: any) => api.put(`/api/v1/deployments/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/deployments/${id}/`),
  dashboard: () => api.get('/api/v1/deployments/dashboard'),
}

export const overtimeApi = {
  list: (params?: { employee_id?: number; site_id?: number; status?: string; days?: number }) =>
    api.get('/api/v1/overtime/', { params }),
  create: (data: any) => api.post('/api/v1/overtime/', data),
  update: (id: number, data: any) => api.put(`/api/v1/overtime/${id}/`, data),
  approve: (id: number, data: { status: string; rejection_reason?: string }) =>
    api.post(`/api/v1/overtime/${id}/approve/`, data),
  remove: (id: number) => api.delete(`/api/v1/overtime/${id}/`),
  dashboard: (days?: number) => api.get('/api/v1/overtime/dashboard', { params: { days } }),
}

export const clientReportsApi = {
  list: (params?: { client_id?: number; report_type?: string; status?: string }) =>
    api.get('/api/v1/client-reports/', { params }),
  create: (data: any) => api.post('/api/v1/client-reports/', data),
  update: (id: number, data: any) => api.put(`/api/v1/client-reports/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/client-reports/${id}/`),
  dashboard: () => api.get('/api/v1/client-reports/dashboard'),
}

export const workforceApi = {
  summary: () => api.get('/api/v1/workforce-forecast/summary'),
  staffingGaps: (days?: number) => api.get('/api/v1/workforce-forecast/staffing-gaps', { params: { days_ahead: days } }),
  siteNeeds: () => api.get('/api/v1/workforce-forecast/site-needs'),
  monthlyProjection: (months?: number) => api.get('/api/v1/workforce-forecast/monthly-projection', { params: { months_ahead: months } }),
}

export const complianceCalendarApi = {
  events: (days?: number) => api.get('/api/v1/compliance-calendar/events', { params: { days_ahead: days } }),
  summary: () => api.get('/api/v1/compliance-calendar/summary'),
}

export const budgetsApi = {
  list: (params?: { year?: number; category?: string; site_id?: number }) =>
    api.get('/api/v1/budgets/', { params }),
  create: (data: any) => api.post('/api/v1/budgets/', data),
  update: (id: number, data: any) => api.put(`/api/v1/budgets/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/budgets/${id}/`),
  dashboard: (year?: number) => api.get('/api/v1/budgets/dashboard', { params: { year } }),
}

export const emergencyContactsApi = {
  list: (params?: { employee_id?: number }) =>
    api.get('/api/v1/emergency-contacts/', { params }),
  create: (data: any) => api.post('/api/v1/emergency-contacts/', data),
  update: (id: number, data: any) => api.put(`/api/v1/emergency-contacts/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/emergency-contacts/${id}/`),
  dashboard: () => api.get('/api/v1/emergency-contacts/dashboard'),
}

export const performanceDashboardApi = {
  dashboard: () => api.get('/api/v1/performance-dashboard'),
}

export const payrollExportApi = {
  downloadCsv: (periodStart: string, periodEnd: string, format: string) =>
    api.get('/api/v1/exports/payroll/csv', {
      params: { period_start: periodStart, period_end: periodEnd, format },
      responseType: 'blob',
    }),
}

export const siteProfitabilityApi = {
  bySite: (year?: number, month?: number) =>
    api.get('/api/v1/site-profitability/by-site', { params: { year, month } }),
  summary: () => api.get('/api/v1/site-profitability/summary'),
}

export const payrollReportsApi = {
  summary: (year?: number, month?: number) =>
    api.get('/api/v1/payroll-reports/summary', { params: { year, month } }),
  trend: (months?: number) =>
    api.get('/api/v1/payroll-reports/trend', { params: { months } }),
  byEmployee: (year?: number, month?: number) =>
    api.get('/api/v1/payroll-reports/by-employee', { params: { year, month } }),
}

export const contractComplianceApi = {
  overview: () => api.get('/api/v1/contract-compliance/overview'),
  dashboard: () => api.get('/api/v1/contract-compliance/dashboard'),
}

export const iodApi = {
  list: (params?: { status?: string; employee_id?: number }) =>
    api.get('/api/v1/iod/', { params }),
  create: (data: any) => api.post('/api/v1/iod/', data),
  update: (id: number, data: any) => api.put(`/api/v1/iod/${id}/`, data),
  remove: (id: number) => api.delete(`/api/v1/iod/${id}/`),
  dashboard: () => api.get('/api/v1/iod/dashboard'),
}

export const shiftHandoversApi = {
  list: (params?: { site_id?: number; acknowledged?: boolean; priority?: string; limit?: number }) =>
    api.get('/api/v1/shift-handovers/', { params }),
  create: (data: any) => api.post('/api/v1/shift-handovers/', data),
  acknowledge: (id: number) => api.put(`/api/v1/shift-handovers/${id}/acknowledge`),
  remove: (id: number) => api.delete(`/api/v1/shift-handovers/${id}/`),
  dashboard: () => api.get('/api/v1/shift-handovers/dashboard'),
}

export const incidentAnalyticsApi = {
  dashboard: (days?: number) => api.get('/api/v1/incident-analytics/dashboard', { params: { days } }),
}

export const siteRiskApi = {
  scores: (days?: number) => api.get('/api/v1/site-risk/scores', { params: { days } }),
}

export const patrolAnalyticsApi = {
  dashboard: (days?: number, siteId?: number) =>
    api.get('/api/v1/patrol-analytics/dashboard', { params: { days, site_id: siteId } }),
}

export const skillsMatrixApi = {
  overview: () => api.get('/api/v1/skills-matrix/overview'),
  dashboard: () => api.get('/api/v1/skills-matrix/dashboard'),
}

export const availabilityHeatmapApi = {
  heatmap: (siteId?: number) =>
    api.get('/api/v1/availability-heatmap/heatmap', { params: { site_id: siteId } }),
}

export const clientSatisfactionApi = {
  list: (clientId?: number, siteId?: number) =>
    api.get('/api/v1/client-satisfaction/', { params: { client_id: clientId, site_id: siteId } }),
  create: (data: any) => api.post('/api/v1/client-satisfaction/', data),
  update: (id: number, data: any) => api.put(`/api/v1/client-satisfaction/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/client-satisfaction/${id}`),
  dashboard: () => api.get('/api/v1/client-satisfaction/dashboard'),
}

export const shiftCostsApi = {
  breakdown: (days?: number, siteId?: number) =>
    api.get('/api/v1/shift-costs/breakdown', { params: { days, site_id: siteId } }),
}

export default api
