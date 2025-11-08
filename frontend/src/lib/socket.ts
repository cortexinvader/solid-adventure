// src/api/socket.ts
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class SocketService {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return

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

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
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
    formatting?: any
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

  on(event: string, cb: (...args: any[]) => void) {
    this.socket?.on(event, cb)
  }

  off(event: string, cb?: (...args: any[]) => void) {
    this.socket?.off(event, cb)
  }
}

export const socketService = new SocketService()
