import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { departments } from '@/lib/api'

export default function Signup() {
  const [, setLocation] = useLocation()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departments.getAll()
      return response.data.departments
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signup({
        username,
        password,
        phone,
        reg_number: regNumber,
        department_name: departmentName
      })
      setLocation('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-lg shadow-lg p-8 border border-border">
          <h1 className="text-3xl font-bold text-text mb-6 text-center">
            Create Account
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

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Registration Number
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Department
              </label>
              <select
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text"
                required
              >
                <option value="">Select Department</option>
                {depts?.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-bg py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <a className="text-accent hover:underline">
                Already have an account? Login
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
