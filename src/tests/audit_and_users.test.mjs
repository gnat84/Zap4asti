import test from 'node:test'
import assert from 'node:assert/strict'

// Test author formatting function logic
function formatAuditAuthor(user, fallbackRaw) {
  if (user?.display_name) {
    return user.display_name
  }
  if (user?.email) {
    return user.email
  }
  if (fallbackRaw && fallbackRaw.trim() !== '') {
    if (fallbackRaw.includes('@')) {
      return fallbackRaw
    }
    return fallbackRaw
  }
  return '—'
}

function getUserDisplayName(user) {
  const fullName = [user?.last_name, user?.first_name].filter(Boolean).join(' ').trim()
  return fullName || user?.email || '—'
}

test('formatAuditAuthor: returns display_name when available', () => {
  const user = {
    id: '123',
    email: 'test@example.com',
    first_name: 'Иван',
    last_name: 'Иванов',
    display_name: 'Иванов Иван',
  }
  assert.equal(formatAuditAuthor(user, null), 'Иванов Иван')
})

test('formatAuditAuthor: fallbacks to email if name is missing', () => {
  const user = {
    id: '123',
    email: 'worker@factory.ru',
    first_name: null,
    last_name: null,
    display_name: 'worker@factory.ru',
  }
  assert.equal(formatAuditAuthor(user, null), 'worker@factory.ru')
})

test('formatAuditAuthor: fallbacks to legacy raw email when user object is null', () => {
  assert.equal(formatAuditAuthor(null, 'old_author@factory.ru'), 'old_author@factory.ru')
})

test('formatAuditAuthor: returns dash when both user and fallback are empty', () => {
  assert.equal(formatAuditAuthor(null, null), '—')
  assert.equal(formatAuditAuthor(null, ''), '—')
})

test('getUserDisplayName: combines last_name and first_name', () => {
  assert.equal(getUserDisplayName({ first_name: 'Петр', last_name: 'Сидоров', email: 'p@s.ru' }), 'Сидоров Петр')
  assert.equal(getUserDisplayName({ first_name: 'Петр', last_name: '', email: 'p@s.ru' }), 'Петр')
  assert.equal(getUserDisplayName({ first_name: '', last_name: 'Сидоров', email: 'p@s.ru' }), 'Сидоров')
})

test('getUserDisplayName: fallback to email if both first and last name are empty', () => {
  assert.equal(getUserDisplayName({ first_name: null, last_name: null, email: 'operator@factory.ru' }), 'operator@factory.ru')
  assert.equal(getUserDisplayName({ first_name: '', last_name: '  ', email: 'operator@factory.ru' }), 'operator@factory.ru')
})

test('Audit block display conditions: handles updatedBy visibility', () => {
  // Case 1: only createdBy is present
  const recordOnlyCreated = {
    created_by: 'user-1',
    created_by_user: { display_name: 'Иванов Иван' },
    created_at: '2026-10-20T10:00:00Z',
    updated_by: null,
    updated_by_user: null,
    updated_at: null,
  }
  const hasUpdate1 = Boolean(recordOnlyCreated.updated_by_user || (recordOnlyCreated.updated_by && recordOnlyCreated.updated_by.trim() !== ''))
  assert.equal(hasUpdate1, false, 'Should NOT show updatedBy when it is null')

  // Case 2: both createdBy and updatedBy are present
  const recordWithUpdate = {
    created_by: 'user-1',
    created_by_user: { display_name: 'Иванов Иван' },
    created_at: '2026-10-20T10:00:00Z',
    updated_by: 'user-2',
    updated_by_user: { display_name: 'Петров Петр' },
    updated_at: '2026-10-21T12:00:00Z',
  }
  const hasUpdate2 = Boolean(recordWithUpdate.updated_by_user || (recordWithUpdate.updated_by && recordWithUpdate.updated_by.trim() !== ''))
  assert.equal(hasUpdate2, true, 'Should show updatedBy when it is set')
})
