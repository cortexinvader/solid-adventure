import { useParams } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { users } from '@/lib/api'
import Header from '@/components/Header'
import { User } from 'lucide-react'

export default function Profile() {
  const { username } = useParams<{ username: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: async () => {
      const response = await users.getProfile(username!)
      return response.data.user
    },
    enabled: !!username
  })

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center text-text">Loading...</div>
        ) : data ? (
          <div className="bg-surface rounded-lg p-8 border border-border">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <User size={48} className="text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text">{data.username}</h1>
                <p className="text-text-muted capitalize">{data.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Phone
                </label>
                <p className="text-text">{data.phone}</p>
              </div>

              {data.reg_number && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Registration Number
                  </label>
                  <p className="text-text">{data.reg_number}</p>
                </div>
              )}

              {data.department_name && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Department
                  </label>
                  <p className="text-text">{data.department_name}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Member Since
                </label>
                <p className="text-text">
                  {new Date(data.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-text">User not found</div>
        )}
      </main>
    </div>
  )
}
