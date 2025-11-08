
import { io, Socket } from 'socket.io-client'

interface MessageData {
  room_id: number
  text: string
  formatting?: Record<string, any>
  image_filename?: string
  image_expires_at?: string
  reply_to?: number
}

class SocketService {
  private socket: Socket | null = null
  private url: string
  private connecting: Promise<Socket> | null = null
  private joinedRooms = new Set<number>()

  constructor() {
    this.url = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}` // remove trailing slash
      : (window.location.origin) // fallback to same origin
  }

  /**
   * Connect and return promise that resolves when connected
   */
  connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket)
    }

    if (this.connecting) {
      return this.connecting
    }

    this.connecting = new Promise((resolve, reject) => {
      const socket = io(this.url, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        path: this.url.includes('localhost') ? undefined : '/socket.io', // optional: only if proxy
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id)
        this.socket = socket
        this.connecting = null

        // Rejoin all rooms on reconnect
        this.joinedRooms.forEach(roomId => {
          socket.emit('join_room', { room_id: roomId })
        })

        resolve(socket)
      })

      socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err)
        if (!socket.active) {
          this.connecting = null
          reject(err)
        }
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        if (reason === 'io server disconnect') {
          socket.connect() // auto-reconnect
        }
      })

      // Optional: global error event
      socket.on('error', (err) => {
        console.error('Socket error:', err)
      })
    })

    return this.connecting
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    this.connecting = null
    this.joinedRooms.clear()
  }

  /**
   * Get current socket (may be null or disconnected)
   */
  getSocket(): Socket | null {
    return this.socket
  }

  /**
   * Join a room (auto-rejoin on reconnect)
   */
  async joinRoom(roomId: number): Promise<void> {
    await this.connect()
    this.joinedRooms.add(roomId)
    this.socket?.emit('join_room', { room_id: roomId })
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: number): void {
    this.joinedRooms.delete(roomId)
    this.socket?.emit('leave_room', { room_id: roomId })
  }

  /**
   * Send message
   */
  async sendMessage(data: MessageData): Promise<void> {
    await this.connect()
    this.socket?.emit('send_message', data)
  }

  /**
   * Edit message
   */
  async editMessage(messageId: number, text: string): Promise<void> {
    await this.connect()
    this.socket?.emit('edit_message', { message_id: messageId, text })
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: number): Promise<void> {
    await this.connect()
    this.socket?.emit('delete_message', { message_id: messageId })
  }

  /**
   * React to message
   */
  async reactToMessage(messageId: number, emoji: string): Promise<void> {
    await this.connect()
    this.socket?.emit('react_to_message', { message_id: messageId, emoji })
  }

  /**
   * Typing indicator
   */
  async typing(roomId: number): Promise<void> {
    await this.connect()
    this.socket?.emit('typing', { room_id: roomId })
  }

  /**
   * Listen to event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback)
  }

  /**
   * Remove listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback)
  }

  /**
   * Remove all listeners for an event
   */
  offAll(event: string): void {
    this.socket?.off(event)
  }
}

// Singleton export
export const socketService = new SocketService()
