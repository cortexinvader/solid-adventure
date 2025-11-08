import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rooms as roomsApi, messages as messagesApi } from '@/lib/api'
import { socketService } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { Send, Image as ImageIcon, Smile } from 'lucide-react'
import { format } from 'date-fns'
import type { Message, Room } from '@/types'

export default function Chat() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [messageText, setMessageText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: roomsList } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await roomsApi.getAll()
      return response.data.rooms
    }
  })

  const { data: messagesList } = useQuery({
    queryKey: ['messages', selectedRoom?.id],
    queryFn: async () => {
      if (!selectedRoom) return []
      const response = await messagesApi.getByRoom(selectedRoom.id)
      return response.data.messages
    },
    enabled: !!selectedRoom
  })

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => messagesApi.uploadImage(file)
  })

  useEffect(() => {
    if (selectedRoom) {
      socketService.joinRoom(selectedRoom.id)
    }

    const socket = socketService.getSocket()
    if (!socket) return

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['messages', selectedRoom?.id], (old: Message[] = []) => [
        ...old,
        message
      ])
    }

    const handleMessageEdited = (message: Message) => {
      queryClient.setQueryData(['messages', selectedRoom?.id], (old: Message[] = []) =>
        old.map((m) => (m.id === message.id ? message : m))
      )
    }

    const handleMessageDeleted = (data: { message_id: number }) => {
      queryClient.setQueryData(['messages', selectedRoom?.id], (old: Message[] = []) =>
        old.filter((m) => m.id !== data.message_id)
      )
    }

    socket.on('new_message', handleNewMessage)
    socket.on('message_edited', handleMessageEdited)
    socket.on('message_deleted', handleMessageDeleted)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('message_edited', handleMessageEdited)
      socket.off('message_deleted', handleMessageDeleted)
    }
  }, [selectedRoom, queryClient])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesList])

  const handleSendMessage = async () => {
    if (!messageText.trim() && !imageFile) return
    if (!selectedRoom) return

    let imageData: { filename: string; expires_at: string } | null = null

    if (imageFile) {
      try {
        const response = await uploadImageMutation.mutateAsync(imageFile)
        imageData = response.data
      } catch (error) {
        console.error('Image upload failed:', error)
        return
      }
    }

    socketService.sendMessage({
      room_id: selectedRoom.id,
      text: messageText,
      image_filename: imageData?.filename,
      image_expires_at: imageData?.expires_at
    })

    setMessageText('')
    setImageFile(null)
  }

  const handleReact = (messageId: number, emoji: string) => {
    socketService.reactToMessage(messageId, emoji)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <aside className="w-64 bg-surface border-r border-border p-4">
          <h2 className="text-lg font-semibold text-text mb-4">Rooms</h2>
          <div className="space-y-2">
            {roomsList?.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  selectedRoom?.id === room.id
                    ? 'bg-accent text-bg'
                    : 'hover:bg-muted text-text'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              <div className="bg-surface border-b border-border px-6 py-4">
                <h2 className="text-xl font-semibold text-text">{selectedRoom.name}</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {messagesList?.map((message) => {
                  const isOwn = message.sender_id === user?.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-accent text-bg rounded-br-none'
                            : 'bg-surface text-text rounded-bl-none border border-border'
                        }`}
                      >
                        {!isOwn && (
                          <div className="text-sm font-semibold mb-1">
                            {message.sender_username}
                          </div>
                        )}
                        <div className="break-words">{message.text}</div>
                        {message.image_filename && (
                          <img
                            src={`/api/images/${message.image_filename}`}
                            alt="Uploaded"
                            className="mt-2 rounded-lg max-w-full"
                          />
                        )}
                        <div
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-bg opacity-70' : 'text-text-muted'
                          }`}
                        >
                          {format(new Date(message.timestamp), 'HH:mm')}
                        </div>
                        {Object.keys(message.reactions).length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {Object.entries(message.reactions).map(([emoji, users]) => (
                              <span
                                key={emoji}
                                className="text-xs bg-muted px-2 py-1 rounded-full"
                              >
                                {emoji} {users.length}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-surface border-t border-border px-6 py-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="image-upload"
                    className="p-2 hover:bg-muted rounded-lg cursor-pointer transition"
                  >
                    <ImageIcon size={20} />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message... (use @ai to ask AI)"
                    className="flex-1 px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() && !imageFile}
                    className="p-2 bg-accent text-bg rounded-full hover:opacity-90 disabled:opacity-50 transition"
                  >
                    <Send size={20} />
                  </button>
                </div>
                {imageFile && (
                  <div className="mt-2 text-sm text-text-muted">
                    Image selected: {imageFile.name}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              Select a room to start chatting
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
