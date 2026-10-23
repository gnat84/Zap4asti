import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetPassword,
  useToggleRole,
  type ProfileUser,
} from '@/hooks/useUsers'
import { Users, Shield, ShieldOff, Plus, Key, Trash2, Pencil, X } from 'lucide-react'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { formatDate } from '@/lib/utils'

export function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileUser | null>(null)

  useBackButtonHandler(showCreate || Boolean(editingUser), () => {
    setShowCreate(false)
    setEditingUser(null)
  })

  const { data: users = [], isLoading, error } = useUsers()
  const deleteUserMutation = useDeleteUser()
  const resetPasswordMutation = useResetPassword()
  const toggleRoleMutation = useToggleRole()

  const handleToggleRole = (user: ProfileUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    toggleRoleMutation.mutate({ userId: user.id, newRole })
  }

  const handleResetPassword = (user: ProfileUser) => {
    const newPass = prompt(`Новый пароль для ${user.email}:`)
    if (!newPass || newPass.length < 6) return
    resetPasswordMutation.mutate(
      { userId: user.id, newPassword: newPass },
      { onSuccess: () => alert('Пароль обновлён') }
    )
  }

  const handleDelete = (user: ProfileUser) => {
    if (!confirm(`Удалить пользователя ${user.email}?`)) return
    deleteUserMutation.mutate(user.id)
  }

  if (authLoading) return <p className="text-gray-500 py-8 text-center">Загрузка...</p>
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <Breadcrumb items={[{ label: 'Пользователи', path: '/admin' }]} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold">Пользователи</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500 py-8 text-center">Загрузка...</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const fullName = [u.last_name, u.first_name].filter(Boolean).join(' ').trim()
            return (
              <div
                key={u.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    u.role === 'admin' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}
                >
                  {u.role === 'admin' ? (
                    <Shield className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Users className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {fullName ? (
                    <>
                      <p className="font-semibold text-gray-900 truncate">{fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </>
                  ) : (
                    <p className="font-semibold text-gray-900 truncate">{u.email}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role}
                    </span>
                    <span>Создан: {formatDate(u.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Редактировать"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleRole(u)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={u.role === 'admin' ? 'Снять admin' : 'Сделать admin'}
                  >
                    {u.role === 'admin' ? (
                      <ShieldOff className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Shield className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleResetPassword(u)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Сменить пароль"
                  >
                    <Key className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
          {users.length === 0 && (
            <p className="text-center text-gray-500 py-8">Нет пользователей</p>
          )}
        </div>
      )}

      {showCreate && (
        <UserModal onClose={() => setShowCreate(false)} />
      )}

      {editingUser && (
        <UserModal initialData={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  )
}

interface UserModalProps {
  initialData?: ProfileUser | null
  onClose: () => void
}

function UserModal({ initialData, onClose }: UserModalProps) {
  const isEditing = Boolean(initialData)
  const [firstName, setFirstName] = useState(initialData?.first_name ?? '')
  const [lastName, setLastName] = useState(initialData?.last_name ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(initialData?.role ?? 'user')
  const [error, setError] = useState('')

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isEditing && initialData) {
      updateUserMutation.mutate(
        {
          userId: initialData.id,
          firstName: firstName || null,
          lastName: lastName || null,
          email: email || null,
          role,
        },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    } else {
      createUserMutation.mutate(
        {
          email,
          password,
          firstName: firstName || null,
          lastName: lastName || null,
          role,
        },
        {
          onSuccess: () => onClose(),
          onError: (e) => setError(e.message),
        }
      )
    }
  }

  const isPending = createUserMutation.isPending || updateUserMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-md sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Редактировать пользователя' : 'Новый пользователь'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Иванов"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                required
                minLength={6}
                placeholder="Минимум 6 символов"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white"
            >
              <option value="user">Пользователь (user)</option>
              <option value="admin">Администратор (admin)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isPending ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
