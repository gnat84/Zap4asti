import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- URL resolution helpers ---

interface UrlFields {
  photo_url?: string | null
  photo_urls?: string[] | null
  file_url?: string | null
  file_urls?: string[] | null
  panel_photo_url?: string | null
  panel_photo_urls?: string[] | null
}

export function resolvePhotoUrls(entity: UrlFields): string[] {
  if (entity.photo_urls && entity.photo_urls.length > 0) return entity.photo_urls
  if (entity.photo_url) return [entity.photo_url]
  return []
}

export function resolveFileUrls(entity: UrlFields): string[] {
  if (entity.file_urls && entity.file_urls.length > 0) return entity.file_urls
  if (entity.file_url) return [entity.file_url]
  return []
}

export function resolvePanelPhotoUrls(entity: UrlFields): string[] {
  if (entity.panel_photo_urls && entity.panel_photo_urls.length > 0) return entity.panel_photo_urls
  if (entity.panel_photo_url) return [entity.panel_photo_url]
  return []
}

export function firstUrl(urls: string[]): string | null {
  return urls.length > 0 ? urls[0] : null
}

// --- Version comparison ---

export const CURRENT_VERSION = '1.0.15'

export function isNewerVersion(remote: string, local: string = CURRENT_VERSION): boolean {
  const r = remote.split('.').map(Number)
  const l = local.split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] ?? 0
    const b = l[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}

// --- iOS Safari compatible Date Formatting ---

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('ru-RU')
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('ru-RU')
}
