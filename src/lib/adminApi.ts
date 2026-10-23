import { supabase } from './supabase'

const baseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function createUser(email: string, password: string) {
  const res = await fetch(`${baseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || `HTTP ${res.status}`)
  }
  const { error } = await supabase.rpc('confirm_user_email', { user_email: email })
  if (error) throw new Error(error.message)
  return data
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
