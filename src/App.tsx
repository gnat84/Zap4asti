import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WorkshopPage } from '@/pages/WorkshopPage'
import { LinePage } from '@/pages/LinePage'
import { PartDetailPage } from '@/pages/PartDetailPage'
import { AdminPage } from '@/pages/AdminPage'
import { Package } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { handleBack } from '@/lib/backButton'

function GlobalBackHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) {
      return
    }

    const listenerPromise = CapApp.addListener('backButton', () => {
      // 1. Сначала проверяем открытые модалки/панели
      if (handleBack()) {
        return
      }

      // 2. Если модалок нет, проверяем текущий маршрут
      const pathname = location.pathname
      const isRoot = pathname === '/' || pathname === '/login' || pathname === ''

      if (!isRoot) {
        navigate(-1)
      } else {
        // На главной странице жест «назад» сворачивает приложение
        CapApp.minimizeApp().catch(() => {
          CapApp.exitApp()
        })
      }
    })

    return () => {
      listenerPromise.then(l => l.remove()).catch(() => {})
    }
  }, [navigate, location.pathname])

  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <Package className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Учёт запчастей</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Загрузка...</span>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <GlobalBackHandler />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="workshop/:id" element={<WorkshopPage />} />
              <Route path="line/:id" element={<LinePage />} />
              <Route path="part/:id" element={<PartDetailPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
