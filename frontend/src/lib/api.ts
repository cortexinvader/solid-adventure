// src/api/index.ts
import axios from 'axios'
import type { User, Room, Message, Notification, Document, Department } from '@/types'

  const API_URL = process.env.VITE_API_URL || 'http://localhost:8000'const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
})

let csrfToken: string | null = null
const getCsrfToken = async () => {
  if (!csrfToken) {
    const res = await api.get('/csrf-token')
    csrfToken = res.data.csrf_token
  }
  return csrfToken
}

api.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method || '')) {
    const token = await getCsrfToken()
    config.headers['X-CSRF-Token'] = token
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

export const auth = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  markTutorialSeen: () => api.post('/auth/tutorial-seen')
}

export const departments = {
  getAll: () => api.get('/departments')
}

export const users = {
  getProfile: (username: string) => api.get(`/users/${username}`)
}

export const rooms = {
  getAll: () => api.get('/rooms'),
  create: (data: any) => api.post('/rooms', data),
  delete: (roomId: number) => api.delete(`/rooms/${roomId}`)
}

export const messages = {
  getByRoom: (roomId: number, limit = 100, offset = 0) =>
    api.get(`/messages/${roomId}`, { params: { limit, offset } }),
  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return api.post('/messages/upload-image', fd)
  }
}

export const notifications = {
  getAll: () => api.get('/notifications'),
  post: (data: any) => api.post('/notifications/post', data),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  react: (id: number, emoji: string) => api.post(`/notifications/${id}/react`, { emoji }),
  delete: (id: number) => api.delete(`/notifications/${id}`)
}

export const documents = {
  getAll: () => api.get('/documents'),
  upload: (file: File, watermark: boolean) => {
    const fd = new FormData()
    fd.append('document', file)
    fd.append('watermark', watermark.toString())
    return api.post('/documents/upload', fd)
  },
  download: (id: number) => `${API_URL}/api/documents/download/${id}`
}

export const push = {
  subscribe: (sub: any) => api.post('/push/subscribe', sub),
  unsubscribe: (sub: any) => api.post('/push/unsubscribe', sub)
}

export const admin = {
  backup: (sendToTelegram: boolean) =>
    api.post('/admin/backup', { send_to_telegram: sendToTelegram })
}

export default api
