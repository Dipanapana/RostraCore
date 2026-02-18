// ---------------------------------------------------------------------------
// User & Auth
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  org_id: number;
  organization_name?: string;
  is_superadmin?: boolean;
  employee_id?: number;
}

export type UserRole =
  | 'admin'
  | 'company_admin'
  | 'scheduler'
  | 'finance'
  | 'guard'
  | 'superadmin';

// ---------------------------------------------------------------------------
// Shifts & Schedule
// ---------------------------------------------------------------------------

export interface Shift {
  shift_id: number;
  site_id: number;
  site_name: string;
  client_name?: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: ShiftStatus;
  assignment_id?: number;
  assignment_status?: AssignmentStatus;
  site_address?: string;
  site_latitude?: number;
  site_longitude?: number;
  notes?: string;
}

export type ShiftStatus = 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type AssignmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled';

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface CheckInData {
  shift_assignment_id: number;
  latitude: number;
  longitude: number;
  photo_url?: string;
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export interface Incident {
  id: number;
  site_id: number;
  site_name?: string;
  incident_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  reported_at: string;
  latitude?: number;
  longitude?: number;
  photo_urls?: string[];
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
}
