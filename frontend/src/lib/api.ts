
import axios from 'axios'
import type { User, Room, Message, Notification, Document, Department } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const BASE_URL = `${API_URL}/api`

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// CSRF Token Management
let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null

const fetchCsrfToken = async (): Promise<string> => {
  const response = await api.get<{ csrf_token: string }>('/csrf-token')
  csrfToken = response.data.csrf_token
  return csrfToken
}

export const getCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken
  if (csrfPromise) return csrfPromise
  csrfPromise = fetchCsrfToken()
  return csrfPromise.finally(() => {
    csrfPromise = null
  })
}

// Add CSRF token to all state-changing requests
api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method || '')) {
    try {
      const token = await getCsrfToken()
      config.headers['X-CSRF-Token'] = token
    } catch (error) {
      console.error('Failed to fetch CSRF token', error)
    }
  }

  // Let browser set Content-Type + boundary for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

// Optional: Reset CSRF on 403 or logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      csrfToken = null // Force refresh on next request
    }
    return Promise.reject(error)
  }
)

// === API ENDPOINTS ===
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

  logout: () => api.post('/auth/logout').finally(() => {
    csrfToken = null // Invalidate after logout
  }),

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
  // Choose ONE path — recommend: /messages/:roomId
  getByRoom: (roomId: number, limit = 100, offset = 0) =>
    api.get<{ messages: Message[] }>(`/messages/${roomId}`, {
      params: { limit, offset }
    }),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post<{ filename: string; expires_at: string }>(
      '/messages/upload-image',
      formData
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
    formData.append('document', file) // Match backend
    formData.append('watermark', watermark.toString())
    return api.post<{ message: string; document: Document }>(
      '/documents/upload',
      formData
    )
  },
  // Return URL for <a href> or fetch()
  downloadUrl: (id: number) => `${BASE_URL}/documents/download/${id}`
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
