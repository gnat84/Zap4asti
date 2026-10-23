import { supabase } from './supabase'

export async function uploadToStorage(
  file: File,
  folder: string,
  bucket = 'parts-files'
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFromStorage(url: string, bucket = 'parts-files'): Promise<void> {
  const path = url.split(`/${bucket}/`)[1]
  if (!path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(error.message)
}
