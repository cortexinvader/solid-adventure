import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return this.socket

    this.socket = io('http://localhost:8000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  joinRoom(roomId: number) {
    this.socket?.emit('join_room', { room_id: roomId })
  }

  leaveRoom(roomId: number) {
    this.socket?.emit('leave_room', { room_id: roomId })
  }

  sendMessage(data: {
    room_id: number
    text: string
    formatting?: Record<string, any>
    image_filename?: string
    image_expires_at?: string
    reply_to?: number
  }) {
    this.socket?.emit('send_message', data)
  }

  editMessage(messageId: number, text: string) {
    this.socket?.emit('edit_message', { message_id: messageId, text })
  }

  deleteMessage(messageId: number) {
    this.socket?.emit('delete_message', { message_id: messageId })
  }

  reactToMessage(messageId: number, emoji: string) {
    this.socket?.emit('react_to_message', { message_id: messageId, emoji })
  }

  typing(roomId: number) {
    this.socket?.emit('typing', { room_id: roomId })
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback)
  }
}

export const socketService = new SocketService()
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        console.log('Socket connected')
      })

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  joinRoom(roomId: number) {
    if (this.socket) {
      this.socket.emit('join_room', { room_id: roomId })
    }
  }

  sendMessage(data: {
    room_id: number
    text: string
    image_filename?: string
    image_expires_at?: string
  }) {
    if (this.socket) {
      this.socket.emit('send_message', data)
    }
  }

  reactToMessage(messageId: number, emoji: string) {
    if (this.socket) {
      this.socket.emit('react_to_message', { message_id: messageId, emoji })
    }
  }
}

export const socketService = new SocketService()
import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return

    this.socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  joinRoom(roomId: number) {
    if (this.socket) {
      this.socket.emit('join_room', { room_id: roomId })
    }
  }

  sendMessage(data: {
    room_id: number
    text: string
    image_filename?: string
    image_expires_at?: string
  }) {
    if (this.socket) {
      this.socket.emit('send_message', data)
    }
  }
}

export const socketService = new SocketService()
