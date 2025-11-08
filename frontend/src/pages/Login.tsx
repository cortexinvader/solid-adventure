import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [, setLocation] = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ username, password })
      setLocation('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-lg shadow-lg p-8 border border-border">
          <h1 className="text-3xl font-bold text-text mb-6 text-center">
            CIESA Portal Login
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-bg py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/signup">
              <a className="text-accent hover:underline">
                Don't have an account? Sign up
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
