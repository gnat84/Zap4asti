import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { useWorkshops } from '@/hooks/useWorkshops'
import { isNewerVersion, CURRENT_VERSION } from '@/lib/utils'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { Plus, Factory, X, Shield, Search, Key, Upload, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { VersionUploadModal } from './VersionUploadModal'
import { VersionUpdateBanner } from './VersionUpdateBanner'
import type { AppVersion } from '@/types'

interface SidebarProps {
  onAddWorkshop: () => void
  onSearch: () => void
  onClose?: () => void
}

export function Sidebar({ onAddWorkshop, onSearch, onClose }: SidebarProps) {
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const location = useLocation()
  const { isAdmin } = useAuth()

  useBackButtonHandler(showPasswordConfirm, () => setShowPasswordConfirm(false))
  useBackButtonHandler(showPasswordForm, () => setShowPasswordForm(false))
  useBackButtonHandler(showUploadModal, () => setShowUploadModal(false))

  const { data: workshops = [] } = useWorkshops()

  const { data: latestVersion } = useQuery({
    queryKey: ['appVersion'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return data as AppVersion | null
    },
  })

  const isNewVersionAvailable = latestVersion && isNewerVersion(latestVersion.version, CURRENT_VERSION)

  const handleNavClick = () => {
    onClose?.()
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordSuccess(false)
      }, 1500)
    }
    setPasswordLoading(false)
  }

  return (
    <aside
      className="w-72 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Цеха</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSearch}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md"
            title="Поиск запчастей"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onAddWorkshop}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md"
          >
            <Plus className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 pb-4">
        {workshops.map((workshop) => {
          const isActive = location.pathname.includes(workshop.id)
          return (
            <Link
              key={workshop.id}
              to={`/workshop/${workshop.id}`}
              onClick={handleNavClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Factory className="w-4 h-4 shrink-0" />
              <span className="truncate">{workshop.name}</span>
            </Link>
          )
        })}
        {workshops.length === 0 && (
          <p className="text-sm text-gray-400 px-3 py-2">Нет цехов</p>
        )}
      </nav>

      {isNewVersionAvailable && (
        <VersionUpdateBanner
          version={latestVersion!.version}
          fileUrl={latestVersion!.file_url}
        />
      )}

      <div className="px-2 pb-4">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={handleNavClick}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 ${
              location.pathname === '/admin'
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="truncate">Пользователи</span>
          </Link>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-orange-600 hover:bg-orange-50 w-full mb-0.5"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Обновление приложения</span>
          </button>
        )}
        <button
          onClick={() => setShowPasswordConfirm(true)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full"
        >
          <Key className="w-4 h-4 shrink-0" />
          <span className="truncate">Сменить пароль</span>
        </button>
        <p className="text-xs text-gray-400 px-3 pt-2">v{CURRENT_VERSION}</p>
      </div>

      {showPasswordConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowPasswordConfirm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-sm sm:m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Смена пароля</h2>
            <p className="text-gray-600 text-sm mb-4">Хотите изменить пароль?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordConfirm(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => { setShowPasswordConfirm(false); setShowPasswordForm(true) }}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowPasswordForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-sm sm:m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Новый пароль</h2>
            {passwordSuccess ? (
              <p className="text-green-600 text-sm text-center py-4">Пароль изменён!</p>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{passwordError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      required
                      minLength={6}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {passwordLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <VersionUploadModal
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </aside>
  )
}
