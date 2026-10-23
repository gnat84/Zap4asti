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
        .select('*')
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
        .select('*')
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
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('workshops')
        .insert({ name })
        .select()
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
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('workshops')
        .update({ name })
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
