import { Link } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { toggleTheme } from '@/lib/theme'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { user, logout } = useAuth()
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  const handleThemeToggle = () => {
    toggleTheme()
    setIsDark(!isDark)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-surface border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <a className="text-xl font-bold text-text hover:text-accent transition">
              CIESA Portal
            </a>
          </Link>
          <nav className="flex gap-4">
            <Link href="/">
              <a className="text-text hover:text-accent transition">Dashboard</a>
            </Link>
            <Link href="/chat">
              <a className="text-text hover:text-accent transition">Chat</a>
            </Link>
            <Link href="/documents">
              <a className="text-text hover:text-accent transition">Documents</a>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <a className="text-text hover:text-accent transition">Admin</a>
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">
            {user?.username} ({user?.role})
          </span>
          <button
            onClick={handleThemeToggle}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
