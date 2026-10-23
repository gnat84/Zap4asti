import { supabase } from './supabase'

const baseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function createUser(
  email: string,
  password: string,
  extra?: { firstName?: string | null; lastName?: string | null; role?: string }
) {
  const res = await fetch(`${baseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        first_name: extra?.firstName?.trim() || null,
        last_name: extra?.lastName?.trim() || null,
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || `HTTP ${res.status}`)
  }
  const { error } = await supabase.rpc('confirm_user_email', { user_email: email })
  if (error) throw new Error(error.message)

  // Ensure first_name, last_name, role are persisted if user was created
  const userId = data?.user?.id || data?.id
  if (userId) {
    const updates: Record<string, string | null> = {}
    if (extra?.firstName !== undefined) updates.first_name = extra.firstName?.trim() || null
    if (extra?.lastName !== undefined) updates.last_name = extra.lastName?.trim() || null
    if (extra?.role) updates.role = extra.role

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', userId)
    }
  }

  return data
}

export async function updateUser(
  userId: string,
  data: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string | null
  }
) {
  const { error } = await supabase.rpc('admin_update_user', {
    target_user_id: userId,
    new_first_name: data.firstName !== undefined ? (data.firstName?.trim() || null) : null,
    new_last_name: data.lastName !== undefined ? (data.lastName?.trim() || null) : null,
    new_email: data.email?.trim() || null,
    new_role: data.role || null,
  })
  if (error) throw new Error(error.message)
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.rpc('delete_user_by_admin', {
    target_user_id: userId,
  })
  if (error) throw new Error(error.message)
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error } = await supabase.rpc('reset_user_password', {
    target_user_id: userId,
    new_password: newPassword,
  })
  if (error) throw new Error(error.message)
}
