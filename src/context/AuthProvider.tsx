import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import { AuthContext } from './authContextDef'

// Синхронное извлечение пользователя и роли из localStorage
function getStoredUser(): User | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          const sessionUser = parsed?.user ?? parsed?.currentSession?.user
          if (sessionUser?.id) {
            const cachedRole = (localStorage.getItem(`profile_role_${sessionUser.id}`) as 'admin' | 'user') || 'user'
            return {
              id: sessionUser.id,
              email: sessionUser.email ?? '',
              role: cachedRole,
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored user from localStorage', e)
  }
  return null
}

// Запрос профиля пользователя с таймаутом и кэшированием — никогда не падает
interface CachedProfile {
  role: 'admin' | 'user'
  first_name?: string | null
  last_name?: string | null
}

async function fetchUserProfile(userId: string): Promise<CachedProfile> {
  const cachedRole = (localStorage.getItem(`profile_role_${userId}`) as 'admin' | 'user') || 'user'
  const defaultProfile: CachedProfile = { role: cachedRole }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    const { data, error } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single()

    clearTimeout(timer)

    if (error) {
      return defaultProfile
    }

    const role: 'admin' | 'user' = data?.role === 'admin' ? 'admin' : 'user'
    try {
      localStorage.setItem(`profile_role_${userId}`, role)
    } catch {
      // ignore storage errors
    }
    return {
      role,
      first_name: data?.first_name ?? null,
      last_name: data?.last_name ?? null,
    }
  } catch {
    return defaultProfile
  }
}

async function buildUser(sessionUser: { id: string; email?: string }): Promise<User> {
  const profile = await fetchUserProfile(sessionUser.id)
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    role: profile.role,
    first_name: profile.first_name,
    last_name: profile.last_name,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Мгновенная инициализация из localStorage — предотвращает белый экран и ложный редирект
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  // loading = false, если сессия уже найдена в localStorage
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      return true
    }
    return getStoredUser() === null
  })

  useEffect(() => {
    let mounted = true

    // Фоновая проверка и валидация сессии
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return

        if (error) {
          console.warn('getSession error:', error.message)
        }

        if (session?.user) {
          const freshUser = await buildUser(session.user)
          if (mounted) {
            setUser(freshUser)
          }
        } else {
          // Если сессия null, проверяем, нет ли сохранённого пользователя в localStorage.
          // При пробуждении устройства сеть может быть временно недоступна, но refresh_token сохранен.
          // В таком случае НЕ выкидываем пользователя на экран входа!
          const stored = getStoredUser()
          if (!stored && mounted) {
            setUser(null)
          }
        }
      } catch (err) {
        console.warn('Init auth error (graceful fallback):', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Подписка на события авторизации Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        // Сервер явно отклонил сессию или пользователь вышел
        if (user?.id) {
          try {
            localStorage.removeItem(`profile_role_${user.id}`)
          } catch {}
        }
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        // Токен успешно обновлен или пользователь авторизовался
        const freshUser = await buildUser(session.user)
        if (mounted) {
          setUser(freshUser)
          setLoading(false)
        }
      } else if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION с null сбрасывает user только если в localStorage действительно нет сессии
        const stored = getStoredUser()
        if (!stored && mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [user?.id])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error }
    }
    if (data?.user) {
      const freshUser = await buildUser(data.user)
      setUser(freshUser)
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('SignOut error:', e)
    }
    if (user?.id) {
      try {
        localStorage.removeItem(`profile_role_${user.id}`)
      } catch {}
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    } catch {}
    setUser(null)
  }, [user?.id])

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'admin',
    signIn,
    signOut,
  }), [user, loading, signIn, signOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
