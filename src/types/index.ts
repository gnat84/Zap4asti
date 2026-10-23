export interface Workshop {
  id: string
  name: string
  created_at: string
}

export interface Line {
  id: string
  name: string
  description: string | null
  workshop_id: string
  inventory_number: string | null
  photo_url: string | null
  photo_urls: string[] | null
  file_url: string | null
  file_urls: string[] | null
  manufacturer_label: string | null
  manufacturer_photo_url: string | null
  panel_photo_url: string | null
  panel_photo_urls: string[] | null
  credentials_enabled: boolean
  credentials: Array<{ name: string; login: string; password: string }> | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Part {
  id: string
  name: string
  description: string | null
  photo_url: string | null
  photo_urls: string[] | null
  file_url: string | null
  file_urls: string[] | null
  link: string | null
  in_stock: boolean
  inventory_number: string | null
  storage_location: string | null
  scheme_name: string | null
  workshop_id: string
  line_id: string
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Fault {
  id: string
  line_id: string
  workshop_id: string
  photo_url: string | null
  photo_urls: string[] | null
  symptoms: string
  resolution: string | null
  fault_date: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  role: UserRole
}

export interface AppVersion {
  id: string
  version: string
  file_url: string
  created_by: string | null
  created_at: string
}
