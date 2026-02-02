export type Gender = 'male' | 'female' | 'other'
export type AccountType = 'savings' | 'cheque' | 'current' | 'transmission'

// Phase 1: Multi-type HR platform types
export type EmploymentType = 'permanent' | 'contract' | 'consultant' | 'part_time' | 'temporary'
export type WorkPatternType = 'shift_based' | 'office_hours' | 'project_based' | 'flexible' | 'custom'
export type EmployeeRole = 'armed' | 'unarmed' | 'supervisor' | 'office_staff' | 'contractor' | 'consultant'

export interface Employee {
  employee_id: number
  first_name: string
  last_name: string
  id_number: string
  role: EmployeeRole  // Extended to include office staff, contractors
  hourly_rate: number
  max_hours_week: number
  cert_level?: string
  home_location?: string
  status: 'active' | 'inactive'
  email?: string
  phone?: string
  assigned_client_id?: number  // Legacy single client
  assigned_client_ids?: number[]  // Multiple client assignment

  // Personal details
  gender?: Gender
  address?: string
  province?: string
  employee_number?: string  // Internal employee number for payroll

  // Banking details for payroll
  bank_name?: string
  account_number?: string
  branch_code?: string
  account_type?: AccountType

  // Tax details
  tax_number?: string

  // PSIRA details (for security guards)
  psira_number?: string
  psira_grade?: string
  psira_expiry_date?: string

  // Emergency contact
  emergency_contact_name?: string
  emergency_contact_phone?: string

  // Flags
  is_supervisor?: boolean

  // Phase 1: Multi-type HR platform fields
  employment_type?: EmploymentType
  work_pattern_type?: WorkPatternType

  // Contractor/Consultant specific
  contract_start_date?: string
  contract_end_date?: string
  daily_rate?: number  // Alternative to hourly_rate for consultants
  project_name?: string
  invoicing_frequency?: string  // weekly, monthly, milestone

  // Skills & organization
  skills?: string[]  // ["Excel", "Python", "Project Management"]
  department?: string  // HR, Finance, IT, Operations
  job_title?: string  // "Office Manager", "IT Consultant"

  // Part-time specific
  max_hours_month?: number  // Monthly hour limit for part-time workers
  preferred_days?: string[]  // ["Monday", "Wednesday", "Friday"]

  // Office hours specific
  standard_work_hours_start?: string  // "09:00"
  standard_work_hours_end?: string  // "17:00"
  core_hours_start?: string  // For flexible schedules
  core_hours_end?: string

  // Tax classification (SARS compliance)
  is_independent_contractor?: boolean  // True for consultants (no PAYE withholding)
}

// Phase 1: Employee type summary for dashboard
export interface EmployeeTypesSummary {
  total_employees: number
  by_employment_type: Record<EmploymentType, number>
  by_work_pattern: Record<WorkPatternType, number>
  by_role: Record<EmployeeRole, number>
  by_department: Record<string, number>
  contractors_vs_employees: {
    independent_contractors: number
    employees: number
  }
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

// Roster Generation Types
export type ConstraintLevel = 'HARD' | 'SOFT' | 'WARNING' | 'DISABLED'
export type RosterAlgorithm = 'auto' | 'production' | 'milp'
export type RosterStatus = 'optimal' | 'feasible' | 'infeasible' | 'error'
export type WarningType = 'psira_compliance' | 'firearm_competency' | 'skill_mismatch' | 'availability_conflict' | 'client_assignment' | 'bcea_violation' | 'other'
export type WarningSeverity = 'warning' | 'error'

export interface RosterConstraints {
  psira_compliance?: ConstraintLevel
  firearm_competency?: ConstraintLevel
  skill_matching?: ConstraintLevel
  availability?: ConstraintLevel
  client_assignment?: ConstraintLevel
  max_hours_per_week?: number
  min_rest_hours?: number
  max_consecutive_days?: number
  max_consecutive_nights?: number
}

export interface RosterPreferences {
  fairness_weight?: number  // 0-1, higher = more fair distribution
  prefer_client_experience?: boolean
  prefer_site_experience?: boolean
  minimize_travel?: boolean
}

export interface RosterGenerateRequest {
  start_date: string
  end_date: string
  site_ids?: number[]
  client_ids?: number[]
  budget_limit?: number
  budget_per_client?: Record<number, number>
  budget_per_site?: Record<number, number>
  constraints?: RosterConstraints
  preferences?: RosterPreferences
}

export interface RosterAssignment {
  employee_id: number
  employee_name?: string
  shift_id: number
  cost: number
  start_time: string
  end_time: string
  site_id: number
  site_name?: string
  client_id?: number
  client_name?: string
}

export interface RosterGenerateSummary {
  total_cost: number
  total_shifts: number
  total_shifts_filled: number
  fill_rate: number
  employees_utilized: number
  total_warnings: number
  average_cost_per_shift?: number
}

export interface RosterWarning {
  employee_id?: number
  employee_name?: string
  shift_id?: number
  site_id?: number
  site_name?: string
  warning_type: WarningType
  message: string
  severity: WarningSeverity
}

export interface UnfilledShift {
  shift_id: number
  site_id: number
  site_name?: string
  client_id?: number
  client_name?: string
  start_time: string
  end_time: string
  required_skill?: string
  reason?: string
}

export interface RosterGenerateResponse {
  assignments: RosterAssignment[]
  summary: RosterGenerateSummary
  unfilled_shifts: UnfilledShift[]
  warnings: RosterWarning[]
  status: RosterStatus
  algorithm_used: string
  generation_time_ms?: number
}
