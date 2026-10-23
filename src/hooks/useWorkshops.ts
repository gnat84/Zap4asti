import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Workshop } from '@/types'

export const workshopKeys = {
  all: ['workshops'] as const,
}

export function useWorkshops() {
  return useQuery({
    queryKey: workshopKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('*, created_by_user, updated_by_user')
        .order('name')
      if (error) throw error
      return data as Workshop[]
    },
  })
}

export function useWorkshop(id: string | undefined) {
  return useQuery({
    queryKey: [...workshopKeys.all, id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('workshops')
        .select('*, created_by_user, updated_by_user')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Workshop
    },
    enabled: !!id,
  })
}

export function useCreateWorkshop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: string | { name: string; createdBy?: string | null }) => {
      const name = typeof payload === 'string' ? payload : payload.name
      const createdBy = typeof payload === 'string' ? undefined : payload.createdBy
      const { data: { user } } = await supabase.auth.getUser()
      const insertData: Record<string, unknown> = {
        name,
        created_by: createdBy || user?.id || null,
      }
      const { data, error } = await supabase
        .from('workshops')
        .insert(insertData)
        .select('*, created_by_user, updated_by_user')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.all })
    },
  })
}

export function useUpdateWorkshop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name, updatedBy }: { id: string; name: string; updatedBy?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('workshops')
        .update({
          name,
          updated_by: updatedBy || user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.all })
    },
  })
}

export function useDeleteWorkshop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workshopKeys.all })
    },
  })
}
