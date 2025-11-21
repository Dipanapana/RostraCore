import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add interceptor to attach token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    console.log('[API INTERCEPTOR] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'No token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[API INTERCEPTOR] Added Authorization header')
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
