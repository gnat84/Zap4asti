import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createUser, updateUser, deleteUser, resetPassword } from '@/lib/adminApi'

export interface ProfileUser {
  id: string
  email: string
  role: string
  first_name?: string | null
  last_name?: string | null
  created_at: string
}

export const userKeys = {
  all: ['users'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ProfileUser[]
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
      role,
    }: {
      email: string
      password: string
      firstName?: string | null
      lastName?: string | null
      role?: string
    }) => {
      return createUser(email, password, { firstName, lastName, role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      ...data
    }: {
      userId: string
      firstName?: string | null
      lastName?: string | null
      email?: string | null
      role?: string | null
    }) => {
      return updateUser(userId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      return deleteUser(userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return resetPassword(userId, newPassword)
    },
  })
}

export function useToggleRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
