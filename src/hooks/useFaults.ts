import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Fault } from '@/types'

export const faultKeys = {
  all: ['faults'] as const,
  lists: () => [...faultKeys.all, 'list'] as const,
  list: (lineId: string) => [...faultKeys.lists(), lineId] as const,
  details: () => [...faultKeys.all, 'detail'] as const,
  detail: (id: string) => [...faultKeys.details(), id] as const,
}

export function useFaults(lineId: string | undefined) {
  return useQuery({
    queryKey: faultKeys.list(lineId ?? ''),
    queryFn: async () => {
      if (!lineId) return []
      const { data, error } = await supabase
        .from('faults')
        .select('*')
        .eq('line_id', lineId)
        .order('fault_date', { ascending: false })
      if (error) throw error
      return data as Fault[]
    },
    enabled: !!lineId,
  })
}

export function useCreateFault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fault: Omit<Fault, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('faults')
        .insert(fault)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: faultKeys.list(variables.line_id) })
    },
  })
}

export function useUpdateFault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Fault> & { id: string }) => {
      const { error } = await supabase
        .from('faults')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faultKeys.all })
    },
  })
}

export function useDeleteFault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; lineId: string }) => {
      const { error } = await supabase
        .from('faults')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: faultKeys.list(variables.lineId) })
    },
  })
}
