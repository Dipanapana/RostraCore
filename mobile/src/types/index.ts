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

// ---------------------------------------------------------------------------
// Patrol Tours
// ---------------------------------------------------------------------------

export interface PatrolCheckpoint {
  checkpoint_id: number;
  name: string;
  description?: string;
  order_num: number;
  photo_required: boolean;
  qr_code?: string;
  nfc_tag?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface PatrolTour {
  tour_id: number;
  org_id: number;
  site_id?: number;
  name: string;
  description?: string;
  is_active: boolean;
  checkpoints: PatrolCheckpoint[];
}

export interface PatrolScan {
  scan_id: number;
  run_id: number;
  checkpoint_id: number;
  checkpoint_name: string;
  scanned_at: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
}

export interface PatrolRun {
  run_id: number;
  tour_id: number;
  tour_name: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  total_checkpoints: number;
  scans_completed: number;
  scans: PatrolScan[];
}

// ---------------------------------------------------------------------------
// Emergency Alerts
// ---------------------------------------------------------------------------

export type AlertType = 'panic' | 'duress' | 'medical' | 'fire';
export type AlertStatus = 'active' | 'acknowledged' | 'dispatched' | 'resolved' | 'false_alarm';

export interface EmergencyAlert {
  alert_id: number;
  org_id: number;
  employee_id?: number;
  triggered_by_user_id: number;
  alert_type: AlertType;
  status: AlertStatus;
  latitude?: number;
  longitude?: number;
  site_id?: number;
  site_name?: string;
  notes?: string;
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

// ---------------------------------------------------------------------------
// Lone Worker
// ---------------------------------------------------------------------------

export type LoneWorkerStatus = 'active' | 'overdue' | 'escalated' | 'ended';

export interface LoneWorkerSession {
  session_id: number;
  org_id: number;
  employee_id: number;
  employee_name?: string;
  status: LoneWorkerStatus;
  check_in_interval_minutes: number;
  last_check_in: string;
  next_check_in_due: string;
  missed_check_ins: number;
  escalation_level: number;
  site_name?: string;
  started_at: string;
  ended_at?: string;
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export interface ChatChannel {
  channel_id: number;
  org_id: number;
  channel_type: 'direct' | 'group' | 'site' | 'broadcast';
  name?: string;
  site_id?: number;
  is_active: boolean;
  created_at: string;
  unread_count?: number;
  last_message?: string;
}

export interface ChatMessage {
  message_id: number;
  channel_id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  message_type: string;
  sent_at: string;
}

// ---------------------------------------------------------------------------
// Post Orders
// ---------------------------------------------------------------------------

export interface PostOrder {
  post_order_id: number;
  org_id: number;
  site_id: number;
  site_name?: string;
  title: string;
  content: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  requires_acknowledgment: boolean;
  created_at: string;
  acknowledged?: boolean;
}

// ---------------------------------------------------------------------------
// Custom Forms
// ---------------------------------------------------------------------------

export interface FormTemplate {
  template_id: number;
  org_id: number;
  name: string;
  description?: string;
  form_type: string;
  fields: any[];
  status: 'draft' | 'active' | 'archived';
  requires_signature: boolean;
}

export interface FormSubmission {
  submission_id: number;
  template_id: number;
  template_name?: string;
  data: Record<string, any>;
  site_id?: number;
  submitted_at: string;
}
