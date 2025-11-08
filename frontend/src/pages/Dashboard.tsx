import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications as notificationsApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newNotif, setNewNotif] = useState({ type: 'regular', content: '', postGenerally: false })

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsApi.getAll()
      return response.data.notifications
    }
  })

  const postMutation = useMutation({
    mutationFn: (data: { type: string; content: string; post_generally: boolean }) =>
      notificationsApi.post(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setNewNotif({ type: 'regular', content: '', postGenerally: false })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: number; emoji: string }) =>
      notificationsApi.react(id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const canPost = user?.role !== 'student'

  const getTypeEmoji = (type: string) => {
    if (type === 'urgent') return '🚨'
    if (type === 'cruise') return '⛵'
    return '📢'
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text mb-6">Dashboard</h1>

        {canPost && (
          <div className="bg-surface rounded-lg p-6 mb-8 border border-border">
            <h2 className="text-xl font-semibold text-text mb-4">Post Notification</h2>
            <div className="space-y-4">
              <select
                value={newNotif.type}
                onChange={(e) => setNewNotif({ ...newNotif, type: e.target.value })}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text"
              >
                <option value="regular">Regular</option>
                <option value="urgent">Urgent</option>
                <option value="cruise">Cruise</option>
              </select>
              <textarea
                value={newNotif.content}
                onChange={(e) => setNewNotif({ ...newNotif, content: e.target.value })}
                placeholder="Notification content..."
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text min-h-24"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-text">
                  <input
                    type="checkbox"
                    checked={newNotif.postGenerally}
                    onChange={(e) => setNewNotif({ ...newNotif, postGenerally: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Post generally (visible to all)
                </label>
                <button
                  onClick={() => postMutation.mutate({
                    type: newNotif.type,
                    content: newNotif.content,
                    post_generally: newNotif.postGenerally
                  })}
                  disabled={!newNotif.content || postMutation.isPending}
                  className="ml-auto px-6 py-2 bg-accent text-bg rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text flex items-center gap-2">
            <Bell size={24} />
            Notifications
          </h2>

          {notifs?.map((notif: any) => (
            <div
              key={notif.id}
              className="bg-surface rounded-lg p-6 border border-border"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeEmoji(notif.type)}</span>
                  <div>
                    <span className="font-semibold text-text capitalize">{notif.type}</span>
                    {notif.target_department_name && (
                      <span className="ml-2 text-sm text-text-muted">
                        • {notif.target_department_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">
                    {format(new Date(notif.timestamp), 'MMM d, HH:mm')}
                  </span>
                  {canPost && (
                    <button
                      onClick={() => deleteMutation.mutate(notif.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-text mb-3">{notif.content}</p>

              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => markReadMutation.mutate(notif.id)}
                  className={`px-3 py-1 rounded ${
                    notif.read_by.includes(user?.id || 0)
                      ? 'bg-muted text-text-muted'
                      : 'bg-accent text-bg'
                  }`}
                >
                  {notif.read_by.includes(user?.id || 0) ? 'Read' : 'Mark as Read'}
                </button>

                <div className="flex items-center gap-2">
                  {['👍', '❤️', '😊'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => reactMutation.mutate({ id: notif.id, emoji })}
                      className="hover:scale-125 transition"
                    >
                      {emoji} {notif.reactions[emoji]?.length || 0}
                    </button>
                  ))}
                </div>

                <span className="text-text-muted ml-auto">
                  by {notif.posted_by_username}
                </span>
              </div>
            </div>
          ))}

          {notifs?.length === 0 && (
            <p className="text-center text-text-muted py-8">No notifications yet</p>
          )}
        </div>
      </main>
    </div>
  )
}
