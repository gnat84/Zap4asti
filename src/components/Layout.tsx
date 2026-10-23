import { useState, useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { WorkshopForm } from './WorkshopForm'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isNewerVersion, CURRENT_VERSION } from '@/lib/utils'
import { useBackButtonHandler } from '@/hooks/useBackButton'
import { LogOut, Menu, Shield, Search, X, Download } from 'lucide-react'
import type { Part, AppVersion } from '@/types'

export function Layout() {
  const [showWorkshopForm, setShowWorkshopForm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarKey, setSidebarKey] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<(Part & { workshop_name?: string; line_name?: string })[]>([])
  const [searching, setSearching] = useState(false)
  const { user, isAdmin, signOut } = useAuth()

  useBackButtonHandler(sidebarOpen, () => setSidebarOpen(false))
  useBackButtonHandler(showSearch, () => setShowSearch(false))
  useBackButtonHandler(showWorkshopForm, () => setShowWorkshopForm(false))

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

  useEffect(() => {
    const onWorkshopChange = () => setSidebarKey(k => k + 1)
    window.addEventListener('workshop-created', onWorkshopChange)
    return () => window.removeEventListener('workshop-created', onWorkshopChange)
  }, [])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const { data: parts } = await supabase
      .from('parts')
      .select('*, workshops(name), lines(name)')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name')
      .limit(20)
    const results = (parts ?? []).map(p => ({
      ...p,
      workshop_name: p.workshops?.name,
      line_name: p.lines?.name,
    }))
    setSearchResults(results)
    setSearching(false)
  }

  useEffect(() => {
    if (!showSearch) return
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, showSearch])

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed z-30 p-2 bg-white border border-gray-200 rounded-lg shadow-sm md:hidden"
        style={{
          top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          left: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
        }}
        aria-label="Меню"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          key={sidebarKey}
          onAddWorkshop={() => {
            setSidebarOpen(false)
            setShowWorkshopForm(true)
          }}
          onSearch={() => {
            setSidebarOpen(false)
            setShowSearch(true)
          }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-gray-200 px-4 py-3 md:px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-xl pl-10 md:pl-0">Учёт запчастей</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
            {isNewVersionAvailable && (
              <a
                href={latestVersion!.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-orange-500 animate-pulse hover:text-orange-600 rounded-lg"
                title={`Обновление v${latestVersion!.version}`}
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg"
                title="Управление пользователями"
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      {showWorkshopForm && (
        <WorkshopForm onClose={() => setShowWorkshopForm(false)} />
      )}

      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-6 w-full sm:max-w-2xl sm:m-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Поиск запчастей</h2>
              <button onClick={() => setShowSearch(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Название или описание..."
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                autoFocus
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={searching}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {searching && <p className="text-gray-500 text-center py-4">Поиск...</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-gray-500 text-center py-4">Ничего не найдено</p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(part => (
                  <Link
                    key={part.id}
                    to={`/part/${part.id}`}
                    onClick={() => setShowSearch(false)}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <p className="font-medium text-sm truncate">{part.name}</p>
                    {part.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{part.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {part.workshop_name} → {part.line_name}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
