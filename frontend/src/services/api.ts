import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Important: Send cookies with requests
})

// No need for request interceptor - cookies are sent automatically
// The httpOnly cookie is managed by the browser and cannot be accessed by JavaScript

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

export default api
