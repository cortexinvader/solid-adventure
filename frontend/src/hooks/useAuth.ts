import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/lib/api'
import type { User } from '@/types'

export const useAuth = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await auth.me()
        return response.data.user
      } catch {
        return null
      }
    },
    retry: false
  })

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      auth.login(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    }
  })

  const signupMutation = useMutation({
    mutationFn: (data: {
      username: string
      password: string
      phone: string
      reg_number: string
      department_name: string
    }) => auth.signup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    }
  })

  const logoutMutation = useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
    }
  })

  return {
    user: data as User | null,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isAuthenticated: !!data
  }
}
