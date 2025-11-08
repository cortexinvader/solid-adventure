import axios from 'axios'
import type { User, Room, Message, Notification, Document, Department } from '@/types'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

let csrfToken: string | null = null

export const getCsrfToken = async () => {
  if (!csrfToken) {
    const response = await api.get('/csrf-token')
    csrfToken = response.data.csrf_token
  }
  return csrfToken
}

api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    const token = await getCsrfToken()
    config.headers['X-CSRF-Token'] = token
  }
  return config
})

export const auth = {
  signup: (data: {
    username: string
    password: string
    phone: string
    reg_number: string
    department_name: string
  }) => api.post<{ message: string; user: User }>('/auth/signup', data),

  login: (username: string, password: string) =>
    api.post<{ message: string; user: User }>('/auth/login', { username, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),

  markTutorialSeen: () => api.post('/auth/tutorial-seen')
}

export const departments = {
  getAll: () => api.get<{ departments: Department[] }>('/departments')
}

export const users = {
  getProfile: (username: string) => api.get<{ user: User }>(`/users/${username}`)
}

export const rooms = {
  getAll: () => api.get<{ rooms: Room[] }>('/rooms'),
  create: (data: { name: string; type: string; department_name?: string }) =>
    api.post<{ message: string; room: Room }>('/rooms', data),
  delete: (roomId: number) => api.delete(`/rooms/${roomId}`)
}

export const messages = {
  getByRoom: (roomId: number, limit = 100, offset = 0) =>
    api.get<{ messages: Message[] }>(`/messages/${roomId}`, {
      params: { limit, offset }
    }),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post<{ filename: string; expires_at: string }>(
      '/messages/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  }
}

export const notifications = {
  getAll: () => api.get<{ notifications: Notification[] }>('/notifications'),
  post: (data: { type: string; content: string; post_generally?: boolean }) =>
    api.post<{ message: string; notification: Notification }>('/notifications/post', data),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  react: (id: number, emoji: string) =>
    api.post(`/notifications/${id}/react`, { emoji }),
  delete: (id: number) => api.delete(`/notifications/${id}`)
}

export const documents = {
  getAll: () => api.get<{ documents: Document[] }>('/documents'),
  upload: (file: File, watermark: boolean) => {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('watermark', watermark.toString())
    return api.post<{ message: string; document: Document }>(
      '/documents/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  download: (id: number) => `/api/documents/download/${id}`
}

export const push = {
  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/push/subscribe', subscription),
  unsubscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/push/unsubscribe', subscription)
}

export const admin = {
  backup: (sendToTelegram: boolean) =>
    api.post('/admin/backup', { send_to_telegram: sendToTelegram })
}

export default api
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
})

export const auth = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  signup: (data: {
    username: string
    password: string
    phone: string
    reg_number: string
    department_name: string
  }) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

export const notifications = {
  getAll: () => api.get('/notifications'),
  post: (data: { type: string; content: string; post_generally: boolean }) =>
    api.post('/notifications', data),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  react: (id: number, emoji: string) =>
    api.post(`/notifications/${id}/react`, { emoji })
}

export const rooms = {
  getAll: () => api.get('/rooms')
}

export const messages = {
  getByRoom: (roomId: number) => api.get(`/messages/${roomId}`),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/messages/upload_image', formData)
  }
}

export const documents = {
  getAll: () => api.get('/documents'),
  upload: (file: File, watermark: boolean) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('watermark', String(watermark))
    return api.post('/documents/upload', formData)
  },
  download: (id: number) => `${API_URL}/api/documents/${id}/download`
}

export const users = {
  getProfile: (username: string) => api.get(`/users/${username}`)
}

export const departments = {
  getAll: () => api.get('/departments')
}

export const admin = {
  backup: (sendToTelegram: boolean) =>
    api.post('/admin/backup', { send_to_telegram: sendToTelegram })
}
import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
})

export const auth = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  signup: (data: {
    username: string
    password: string
    phone: string
    reg_number: string
    department_name: string
  }) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

export const departments = {
  getAll: () => api.get('/departments')
}

export const users = {
  getProfile: (username: string) => api.get(`/users/${username}`)
}

export const notifications = {
  getAll: () => api.get('/notifications'),
  post: (data: { type: string; content: string; post_generally: boolean }) =>
    api.post('/notifications', data),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  react: (id: number, emoji: string) =>
    api.post(`/notifications/${id}/react`, { emoji })
}

export const rooms = {
  getAll: () => api.get('/rooms')
}

export const messages = {
  getByRoom: (roomId: number) => api.get(`/rooms/${roomId}/messages`),
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/messages/upload-image', formData)
  }
}

export const documents = {
  getAll: () => api.get('/documents'),
  upload: (file: File, watermark: boolean) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('watermark', watermark.toString())
    return api.post('/documents/upload', formData)
  },
  download: (id: number) => `${API_BASE}/documents/${id}/download`
}

export const admin = {
  backup: (telegram: boolean) => api.post('/admin/backup', { telegram })
}
