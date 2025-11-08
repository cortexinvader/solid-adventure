export interface User {
  id: number
  username: string
  phone: string
  reg_number?: string
  role: 'student' | 'department-governor' | 'faculty-governor' | 'admin'
  department_name?: string
  created_at: string
  tutorial_seen: boolean
}

export interface Room {
  id: number
  name: string
  type: 'General' | 'Department' | 'Custom'
  department_name?: string
  created_by_id?: number
  created_at: string
}

export interface Message {
  id: number
  sender_id?: number
  sender_username: string
  room_id: number
  text: string
  formatting: Record<string, any>
  image_filename?: string
  image_expires_at?: string
  reply_to?: number
  edited_at?: string
  deleted_at?: string
  reactions: Record<string, number[]>
  timestamp: string
}

export interface Notification {
  id: number
  type: 'urgent' | 'regular' | 'cruise'
  content: string
  timestamp: string
  posted_by_id: number
  posted_by_username: string
  target_department_name?: string
  reactions: Record<string, number[]>
  read_by: number[]
}

export interface Document {
  id: number
  owner_id: number
  owner_username: string
  filename: string
  mime: string
  uploaded_at: string
  expires_at?: string
  watermark: boolean
}

export interface Department {
  id: number
  name: string
}
