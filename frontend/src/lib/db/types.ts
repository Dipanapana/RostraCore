// Type definitions for cached SQLite data

export interface CachedEmployee {
  id: number
  server_id: number
  full_name: string
  employment_type: string
  department?: string
  role?: string
  status: string
  data_json?: string
  synced_at: number
  modified_at: number
}

export interface CachedRoster {
  id: number
  server_id: number
  start_date: string
  end_date: string
  site_id?: number
  data_json?: string
  synced_at: number
}

export interface OfflineQueueItem {
  id: number
  action: string
  table_name: string
  record_id?: number
  payload: string
  created_at: number
  retry_count: number
}
