export interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  id_number: string
  role: 'armed' | 'unarmed' | 'supervisor'
  hourly_rate: number
  max_hours_week: number
  cert_level?: string
  home_location?: string
  status: 'active' | 'inactive'
  email?: string
  phone?: string
  assigned_client_id?: number  // Legacy single client
  assigned_client_ids?: number[]  // Multiple client assignment
}

export interface Site {
  site_id: number
  site_name: string
  client_name: string
  address: string
  gps_lat?: number
  gps_lng?: number
  shift_pattern?: string
  required_skill?: string
  billing_rate?: number
  min_staff: number
  notes?: string
}

export interface Shift {
  shift_id: number
  site_id: number
  start_time: string
  end_time: string
  required_skill?: string
  assigned_employee_id?: number
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled'
  created_by?: string
  is_overtime: boolean
  notes?: string
}

export interface RosterSummary {
  total_cost: number
  total_shifts_filled: number
  employee_hours: Record<number, number>
  average_cost_per_shift: number
}

export interface Availability {
  availability_id: number
  employee_id: number
  date: string
  start_time: string
  end_time: string
  available: boolean
}

export interface Certification {
  cert_id: number
  employee_id: number
  cert_type: string
  issue_date: string
  expiry_date: string
  verified: boolean
  cert_number?: string
  issuing_authority?: string
}

// Site Staffing Profiles
export type PeriodType = 'day' | 'night' | 'all_day' | 'custom'
export type DayType = 'weekday' | 'weekend' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'public_holiday' | 'all'

export interface StaffingProfile {
  profile_id: number
  site_id: number
  org_id: number
  profile_name: string
  period_type: PeriodType
  day_type: DayType
  required_staff: number
  required_skill?: string
  required_psira_grade?: string
  requires_firearm: boolean
  priority: number
  custom_start_time?: string
  custom_end_time?: string
  is_active: boolean
}

export interface StaffingProfileCreate {
  profile_name: string
  period_type: PeriodType
  day_type: DayType
  required_staff: number
  required_skill?: string
  required_psira_grade?: string
  requires_firearm?: boolean
  priority?: number
  custom_start_time?: string
  custom_end_time?: string
}

// Employee Availability Patterns
export type PatternType = 'recurring_weekly' | 'date_range' | 'exception'

export interface AvailabilityPattern {
  pattern_id: number
  employee_id: number
  org_id: number
  pattern_name: string
  pattern_type: PatternType
  effective_from: string
  effective_to?: string
  priority: number
  is_active: boolean
  // Weekly schedule
  monday_available: boolean
  monday_start?: string
  monday_end?: string
  tuesday_available: boolean
  tuesday_start?: string
  tuesday_end?: string
  wednesday_available: boolean
  wednesday_start?: string
  wednesday_end?: string
  thursday_available: boolean
  thursday_start?: string
  thursday_end?: string
  friday_available: boolean
  friday_start?: string
  friday_end?: string
  saturday_available: boolean
  saturday_start?: string
  saturday_end?: string
  sunday_available: boolean
  sunday_start?: string
  sunday_end?: string
  // Date range times
  range_start_time?: string
  range_end_time?: string
}

export interface AvailabilityPatternCreate {
  pattern_name: string
  pattern_type?: PatternType
  effective_from: string
  effective_to?: string
  priority?: number
  // Weekly schedule (for recurring_weekly)
  monday_available?: boolean
  monday_start?: string
  monday_end?: string
  tuesday_available?: boolean
  tuesday_start?: string
  tuesday_end?: string
  wednesday_available?: boolean
  wednesday_start?: string
  wednesday_end?: string
  thursday_available?: boolean
  thursday_start?: string
  thursday_end?: string
  friday_available?: boolean
  friday_start?: string
  friday_end?: string
  saturday_available?: boolean
  saturday_start?: string
  saturday_end?: string
  sunday_available?: boolean
  sunday_start?: string
  sunday_end?: string
  // Date range times
  range_start_time?: string
  range_end_time?: string
}

export interface AvailabilityCalendarDay {
  date: string
  day_name: string
  is_weekend: boolean
  is_available: boolean
  reason: string
  time_windows: Array<{ start: string; end: string }>
}

// Organization Users
export type UserRole = 'admin' | 'company_admin' | 'scheduler' | 'guard' | 'finance' | 'superadmin'

export interface OrganizationUser {
  user_id: number
  username: string
  email: string
  full_name?: string
  role: UserRole
  is_active: boolean
  is_email_verified: boolean
  is_owner: boolean
  managed_client_ids?: number[]
  created_at: string
}

export interface InviteUserRequest {
  email: string
  full_name: string
  role: UserRole
  managed_client_ids?: number[]
  send_email?: boolean
}

export interface Client {
  client_id: number
  client_name: string
  status: 'active' | 'inactive' | 'suspended'
  billing_rate?: number
}
