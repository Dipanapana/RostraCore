import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import tokenStorage from '../utils/tokenStorage';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = __DEV__
  ? 'http://172.20.10.6:8000' // Local dev — change to your IP
  : 'https://api.rostracore.com'; // Production

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach bearer token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.deleteItem('access_token');
      await tokenStorage.deleteItem('refresh_token');
      // Auth store will detect missing token and redirect
    }
    return Promise.reject(error);
  },
);

export default api;

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/v1/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  me: () => api.get('/api/v1/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------

export const dashboardApi = {
  getStats: () => api.get('/api/v1/dashboards/stats'),
  getGuardDashboard: () => api.get('/api/v1/dashboards/guard'),
};

// ---------------------------------------------------------------------------
// Shifts / Schedule API
// ---------------------------------------------------------------------------

export const shiftsApi = {
  getMyShifts: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/api/v1/shifts/my-shifts', { params }),
  getShiftDetails: (shiftId: number) =>
    api.get(`/api/v1/shifts/${shiftId}`),
};

// ---------------------------------------------------------------------------
// Attendance API
// ---------------------------------------------------------------------------

export const attendanceApi = {
  checkIn: (data: {
    shift_assignment_id: number;
    latitude: number;
    longitude: number;
    photo_url?: string;
    photo_base64?: string;
  }) => api.post('/api/v1/attendance/check-in', data),

  checkOut: (data: {
    shift_assignment_id: number;
    latitude: number;
    longitude: number;
    photo_url?: string;
    photo_base64?: string;
  }) => api.post('/api/v1/attendance/check-out', data),
};

// ---------------------------------------------------------------------------
// Incidents API
// ---------------------------------------------------------------------------

export const incidentsApi = {
  report: (data: {
    site_id: number;
    shift_id?: number;
    incident_type: string;
    description: string;
    severity: string;
    latitude?: number;
    longitude?: number;
    photo_urls?: string[];
  }) => api.post('/api/v1/incidents', data),
  getMyIncidents: () => api.get('/api/v1/incidents/mine'),
};

// ---------------------------------------------------------------------------
// Leave API
// ---------------------------------------------------------------------------

export const leaveApi = {
  getMyLeave: () => api.get('/api/v1/leave/my-requests'),
  requestLeave: (data: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => api.post('/api/v1/leave/', data),

  // Balance for the logged-in guard
  getBalances: (employeeId: number) =>
    api.get(`/api/v1/leave/balances/${employeeId}`),

  // Admin-only
  getRequests: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get('/api/v1/leave/requests', { params }),
  approve: (leaveId: number) =>
    api.patch(`/api/v1/leave/requests/${leaveId}/approve`),
  reject: (leaveId: number, rejectionReason?: string) =>
    api.patch(`/api/v1/leave/requests/${leaveId}/reject`, {
      rejection_reason: rejectionReason,
    }),
};

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

export const notificationsApi = {
  getAll: (params?: { unread_only?: boolean; limit?: number }) =>
    api.get('/api/v1/notifications/', { params }),
  markRead: (notificationId: number) =>
    api.patch(`/api/v1/notifications/${notificationId}/read`),
  markAllRead: () => api.patch('/api/v1/notifications/read-all'),
  registerPushToken: (token: string, platform: string) =>
    api.post('/api/v1/notifications/push-token', { token, platform }),
};

// ---------------------------------------------------------------------------
// Patrol API
// ---------------------------------------------------------------------------

export const patrolApi = {
  getTours: (params?: { site_id?: number }) =>
    api.get('/api/v1/patrols/tours', { params }),

  getTour: (tourId: number) =>
    api.get(`/api/v1/patrols/tours/${tourId}`),

  startRun: (data: { tour_id: number; assignment_id?: number }) =>
    api.post('/api/v1/patrols/runs/start', data),

  scanCheckpoint: (
    runId: number,
    data: {
      checkpoint_id?: number;
      scanned_value?: string;
      latitude?: number;
      longitude?: number;
      photo_url?: string;
      notes?: string;
    },
  ) => api.post(`/api/v1/patrols/runs/${runId}/scan`, data),

  completeRun: (runId: number, notes?: string) =>
    api.post(`/api/v1/patrols/runs/${runId}/complete`, null, {
      params: notes ? { notes } : undefined,
    }),

  abandonRun: (runId: number, notes?: string) =>
    api.post(`/api/v1/patrols/runs/${runId}/abandon`, null, {
      params: notes ? { notes } : undefined,
    }),

  getMyRuns: () => api.get('/api/v1/patrols/runs/mine'),
};

// ---------------------------------------------------------------------------
// Payroll / Payslip API (guard-facing)
// ---------------------------------------------------------------------------

export const payrollApi = {
  getMyPayslip: (params?: { year?: number; month?: number }) =>
    api.get('/api/v1/payroll/my-payslip', { params }),
};

// ---------------------------------------------------------------------------
// Emergency / Panic API
// ---------------------------------------------------------------------------

export const emergencyApi = {
  triggerPanic: (data: {
    alert_type?: string;
    latitude?: number;
    longitude?: number;
    site_id?: number;
    shift_id?: number;
    notes?: string;
  }) => api.post('/api/v1/emergency/panic', data),
  getActive: () => api.get('/api/v1/emergency/active'),
  getHistory: (params?: { skip?: number; limit?: number }) =>
    api.get('/api/v1/emergency/', { params }),
};

// ---------------------------------------------------------------------------
// Lone Worker API
// ---------------------------------------------------------------------------

export const loneWorkerApi = {
  startSession: (data: {
    shift_id?: number;
    site_id?: number;
    check_in_interval_minutes?: number;
  }) => api.post('/api/v1/lone-worker/start', data),
  checkIn: () => api.post('/api/v1/lone-worker/check-in'),
  endSession: (sessionId: number) =>
    api.post(`/api/v1/lone-worker/${sessionId}/end`),
  getActive: () => api.get('/api/v1/lone-worker/active'),
  getHistory: (params?: { skip?: number; limit?: number }) =>
    api.get('/api/v1/lone-worker/', { params }),
};

// ---------------------------------------------------------------------------
// Messaging API
// ---------------------------------------------------------------------------

export const messagingApi = {
  getChannels: () => api.get('/api/v1/messages/channels'),
  getMessages: (channelId: number, params?: { limit?: number; before?: number }) =>
    api.get(`/api/v1/messages/channels/${channelId}/messages`, { params }),
  sendMessage: (channelId: number, content: string) =>
    api.post(`/api/v1/messages/channels/${channelId}/messages`, { content }),
  createChannel: (data: { name: string; channel_type?: string; user_ids?: number[] }) =>
    api.post('/api/v1/messages/channels', data),
  getMembers: (channelId: number) =>
    api.get(`/api/v1/messages/channels/${channelId}/members`),
};

// ---------------------------------------------------------------------------
// Post Orders API
// ---------------------------------------------------------------------------

export const postOrdersApi = {
  getActive: (siteId: number) =>
    api.get(`/api/v1/post-orders/site/${siteId}/active`),
  getAll: (params?: { site_id?: number; status?: string }) =>
    api.get('/api/v1/post-orders/', { params }),
  getOne: (id: number) => api.get(`/api/v1/post-orders/${id}`),
  acknowledge: (id: number) =>
    api.post(`/api/v1/post-orders/${id}/acknowledge`),
};

// ---------------------------------------------------------------------------
// Custom Forms API
// ---------------------------------------------------------------------------

export const formsApi = {
  getTemplates: (params?: { status?: string }) =>
    api.get('/api/v1/forms/templates', { params }),
  getTemplate: (id: number) => api.get(`/api/v1/forms/templates/${id}`),
  submitForm: (data: {
    template_id: number;
    data: Record<string, any>;
    site_id?: number;
    shift_id?: number;
    gps_latitude?: number;
    gps_longitude?: number;
  }) => api.post('/api/v1/forms/submit', data),
  getMySubmissions: (params?: { template_id?: number }) =>
    api.get('/api/v1/forms/submissions', { params }),
};

// ---------------------------------------------------------------------------
// Location Ping API
// ---------------------------------------------------------------------------

export const locationApi = {
  sendPing: (data: {
    shift_id?: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    battery_level?: number;
    is_moving?: boolean;
  }) => api.post('/api/v1/location/ping', data),
};
