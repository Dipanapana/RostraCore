import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  generate: (data: any) => api.post('/api/v1/roster/generate', data),
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

export default api
