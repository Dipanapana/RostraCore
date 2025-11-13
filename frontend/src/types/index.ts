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
