import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Part } from '@/types'

export const partKeys = {
  all: ['parts'] as const,
  lists: () => [...partKeys.all, 'list'] as const,
  list: (lineId: string) => [...partKeys.lists(), lineId] as const,
  details: () => [...partKeys.all, 'detail'] as const,
  detail: (id: string) => [...partKeys.details(), id] as const,
}

export function useParts(lineId: string | undefined) {
  return useQuery({
    queryKey: partKeys.list(lineId ?? ''),
    queryFn: async () => {
      if (!lineId) return []
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('line_id', lineId)
        .order('name')
      if (error) throw error
      return data as Part[]
    },
    enabled: !!lineId,
  })
}

export function usePart(id: string | undefined) {
  return useQuery({
    queryKey: partKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Part
    },
    enabled: !!id,
  })
}

export function useCreatePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('parts')
        .insert(part)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: partKeys.list(variables.line_id) })
    },
  })
}

export function useUpdatePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Part> & { id: string }) => {
      const { error } = await supabase
        .from('parts')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partKeys.all })
    },
  })
}

export function useDeletePart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; lineId: string }) => {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: partKeys.list(variables.lineId) })
    },
  })
}
