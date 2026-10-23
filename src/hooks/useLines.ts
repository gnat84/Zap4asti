import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Line } from '@/types'

export const lineKeys = {
  all: ['lines'] as const,
  lists: () => [...lineKeys.all, 'list'] as const,
  list: (workshopId: string) => [...lineKeys.lists(), workshopId] as const,
  details: () => [...lineKeys.all, 'detail'] as const,
  detail: (id: string) => [...lineKeys.details(), id] as const,
}

export function useLines(workshopId: string | undefined) {
  return useQuery({
    queryKey: lineKeys.list(workshopId ?? ''),
    queryFn: async () => {
      if (!workshopId) return []
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('workshop_id', workshopId)
        .order('name')
      if (error) throw error
      return data as Line[]
    },
    enabled: !!workshopId,
  })
}

export function useLine(id: string | undefined) {
  return useQuery({
    queryKey: lineKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Line
    },
    enabled: !!id,
  })
}

export function useCreateLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (line: Omit<Line, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lines')
        .insert(line)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: lineKeys.list(variables.workshop_id) })
    },
  })
}

export function useUpdateLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Line> & { id: string }) => {
      const { error } = await supabase
        .from('lines')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lineKeys.all })
    },
  })
}

export function useDeleteLine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; workshopId: string }) => {
      const { error } = await supabase
        .from('lines')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: lineKeys.list(variables.workshopId) })
    },
  })
}
