import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8001' // Local dev — change to your IP
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
  const token = await SecureStore.getItemAsync('access_token');
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
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
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
  }) => api.post('/api/v1/attendance/check-in', data),

  checkOut: (data: {
    shift_assignment_id: number;
    latitude: number;
    longitude: number;
    photo_url?: string;
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
};

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

export const notificationsApi = {
  getAll: () => api.get('/api/v1/notifications/'),
  markRead: (notificationId: number) =>
    api.patch(`/api/v1/notifications/${notificationId}/read`),
  registerPushToken: (token: string, platform: string) =>
    api.post('/api/v1/notifications/push-token', { token, platform }),
};
