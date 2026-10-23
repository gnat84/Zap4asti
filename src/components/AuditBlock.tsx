import { formatDateTime } from '@/lib/utils'
import type { UserAuditInfo } from '@/types'
import { useAuth } from '@/hooks/useAuth'

interface AuditBlockProps {
  createdBy?: string | null
  createdAt?: string | null
  createdByUser?: UserAuditInfo | null
  updatedBy?: string | null
  updatedAt?: string | null
  updatedByUser?: UserAuditInfo | null
  className?: string
}

export function formatAuditAuthor(
  user?: UserAuditInfo | null,
  fallbackRaw?: string | null
): string {
  if (user?.display_name) {
    return user.display_name
  }
  if (user?.email) {
    return user.email
  }
  if (fallbackRaw && fallbackRaw.trim() !== '') {
    // If it's an email string from legacy record
    if (fallbackRaw.includes('@')) {
      return fallbackRaw
    }
    // If it's an opaque UUID and user isn't found
    return fallbackRaw
  }
  return '—'
}

export function AuditBlock({
  createdBy,
  createdAt,
  createdByUser,
  updatedBy,
  updatedAt,
  updatedByUser,
  className = '',
}: AuditBlockProps) {
  const { isAdmin } = useAuth()

  // Requirement: block is visible only to administrator
  if (!isAdmin) {
    return null
  }

  // If there is no audit info at all, don't show empty block
  if (!createdAt && !createdBy && !createdByUser) {
    return null
  }

  const creatorText = formatAuditAuthor(createdByUser, createdBy)
  const editorText = formatAuditAuthor(updatedByUser, updatedBy)
  const hasUpdate = Boolean(updatedByUser || (updatedBy && updatedBy.trim() !== ''))

  return (
    <div
      className={`border-t border-gray-100 pt-3 mt-4 text-xs text-gray-400 space-y-1 ${className}`}
      data-testid="audit-block"
    >
      <div>
        <span className="text-gray-500 font-medium">Создал:</span>{' '}
        <span>{creatorText}</span>
        {createdAt && <span>, {formatDateTime(createdAt)}</span>}
      </div>
      {hasUpdate && (
        <div>
          <span className="text-gray-500 font-medium">Последнее редактирование:</span>{' '}
          <span>{editorText}</span>
          {updatedAt && <span>, {formatDateTime(updatedAt)}</span>}
        </div>
      )}
    </div>
  )
}
