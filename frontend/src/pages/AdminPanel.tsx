import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { admin } from '@/lib/api'
import Header from '@/components/Header'
import { Database, Send } from 'lucide-react'

export default function AdminPanel() {
  const [sendToTelegram, setSendToTelegram] = useState(false)
  const [message, setMessage] = useState('')

  const backupMutation = useMutation({
    mutationFn: (telegram: boolean) => admin.backup(telegram),
    onSuccess: () => {
      setMessage('Backup completed successfully!')
      setTimeout(() => setMessage(''), 3000)
    },
    onError: () => {
      setMessage('Backup failed!')
      setTimeout(() => setMessage(''), 3000)
    }
  })

  const handleBackup = () => {
    backupMutation.mutate(sendToTelegram)
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text mb-6">Admin Panel</h1>

        <div className="bg-surface rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
            <Database size={24} />
            Backup Management
          </h2>

          <p className="text-text-muted mb-4">
            Create a backup of all user credentials and notifications. The backup will be
            saved to data/admin_backup.json and optionally sent to Telegram.
          </p>

          <label className="flex items-center gap-2 text-text mb-4">
            <input
              type="checkbox"
              checked={sendToTelegram}
              onChange={(e) => setSendToTelegram(e.target.checked)}
              className="w-4 h-4"
            />
            Send to Telegram
          </label>

          <button
            onClick={handleBackup}
            disabled={backupMutation.isPending}
            className="px-6 py-2 bg-accent text-bg rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={20} />
            {backupMutation.isPending ? 'Creating Backup...' : 'Create Backup'}
          </button>

          {message && (
            <div className="mt-4 px-4 py-3 rounded bg-muted text-text">{message}</div>
          )}
        </div>
      </main>
    </div>
  )
}
