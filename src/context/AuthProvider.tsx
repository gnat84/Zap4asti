import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import { AuthContext } from './authContextDef'

// Максимальное время ожидания сессии при холодном старте.
// Если за это время supabase не ответил — показываем что есть из кэша.
const COLD_START_TIMEOUT_MS = 5000

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
            const cachedFirstName = localStorage.getItem(`profile_first_name_${sessionUser.id}`) || null
            const cachedLastName = localStorage.getItem(`profile_last_name_${sessionUser.id}`) || null
            return {
              id: sessionUser.id,
              email: sessionUser.email ?? '',
              role: cachedRole,
              first_name: cachedFirstName,
              last_name: cachedLastName,
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Auth] Failed to parse stored user from localStorage', e)
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
  const cachedFirstName = localStorage.getItem(`profile_first_name_${userId}`) || null
  const cachedLastName = localStorage.getItem(`profile_last_name_${userId}`) || null
  const defaultProfile: CachedProfile = {
    role: cachedRole,
    first_name: cachedFirstName,
    last_name: cachedLastName,
  }
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
      if (data?.first_name != null) localStorage.setItem(`profile_first_name_${userId}`, data.first_name)
      if (data?.last_name != null) localStorage.setItem(`profile_last_name_${userId}`, data.last_name)
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

// Получить сессию с жёстким таймаутом
// Нужен т.к. при холодном старте после 1+ суток рефреш-токен может долго
// обновляться (медленная сеть / captive portal / DNS) и без таймаута
// getSession() зависнет навсегда, оставив loading = true.
async function getSessionWithTimeout(timeoutMs: number) {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  )
  const sessionPromise = supabase.auth.getSession().then(r => r.data.session).catch(() => null)
  return Promise.race([sessionPromise, timeoutPromise])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Мгновенная инициализация из localStorage — предотвращает белый экран и ложный редирект
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  // loading = false если сессия уже найдена в localStorage (можно рендерить сразу)
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      return true
    }
    return getStoredUser() === null
  })

  // Флаг чтобы не запускать initAuth повторно пока он уже выполняется
  const initRunning = useRef(false)
  // Флаг чтобы избежать setState после размонтирования
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // Предотвращаем параллельный запуск двух initAuth
    if (initRunning.current) return
    initRunning.current = true

    const init = async () => {
      console.debug('[Auth] initAuth start, loading=', loading)
      try {
        // Шаг 1: пытаемся получить сессию с жёстким таймаутом
        // Если за COLD_START_TIMEOUT_MS не ответил — работаем с кэшированными данными
        const session = await getSessionWithTimeout(COLD_START_TIMEOUT_MS)
        console.debug('[Auth] getSession result:', session?.user?.id ?? 'null', 'expires_at:', session?.expires_at)

        if (!mounted.current) return

        if (session?.user) {
          // Сессия есть (токен свежий или успешно обновлён)
          const freshUser = await buildUser(session.user)
          if (mounted.current) {
            setUser(freshUser)
          }
        } else {
          // Сессии нет — оставляем что есть в localStorage (не выкидываем пользователя)
          // Пользователь будет выброшен на экран входа только если SIGNED_OUT произошло явно
          const stored = getStoredUser()
          if (!stored && mounted.current) {
            setUser(null)
          }
          // Если stored !== null — значит есть кэш, показываем кэш до установки соединения
        }
      } catch (err) {
        console.warn('[Auth] initAuth error:', err)
      } finally {
        if (mounted.current) {
          console.debug('[Auth] initAuth finally → setLoading(false)')
          setLoading(false)
        }
        initRunning.current = false
      }
    }

    init()

    // Подписка на события авторизации Supabase
    // ВАЖНО: не делаем await внутри callback — это anti-pattern, вызывает дедлок в SDK
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return
      console.debug('[Auth] onAuthStateChange event:', event, 'user:', session?.user?.id ?? 'null')

      if (event === 'SIGNED_OUT') {
        // Явный выход или сервер отозвал сессию
        setUser(prev => {
          if (prev?.id) {
            try {
              localStorage.removeItem(`profile_role_${prev.id}`)
              localStorage.removeItem(`profile_first_name_${prev.id}`)
              localStorage.removeItem(`profile_last_name_${prev.id}`)
            } catch {}
          }
          return null
        })
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        // SDK сообщает начальное состояние сессии
        if (!session) {
          // Нет сессии: снимаем лоадер, если есть кэш — оставляем пользователя
          const stored = getStoredUser()
          if (!stored && mounted.current) {
            setUser(null)
          }
          // В любом случае снимаем loading — пользователь не должен ждать вечно
          if (mounted.current) {
            setLoading(false)
          }
        }
        // Если сессия есть — initAuth() уже обрабатывает это
        return
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Токен обновлён — обновляем пользователя асинхронно без блокировки UI
        // Используем void чтобы не ждать результата в колбэке
        void buildUser(session.user).then(freshUser => {
          if (mounted.current) {
            setUser(freshUser)
            setLoading(false)
          }
        })
        return
      }

      if ((event === 'SIGNED_IN') && session?.user) {
        // Явный вход — fetchUserProfile не нужен если уже вызван через initAuth
        void buildUser(session.user).then(freshUser => {
          if (mounted.current) {
            setUser(freshUser)
            setLoading(false)
          }
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // ВАЖНО: пустой массив зависимостей — инициализация запускается ОДИН раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      console.warn('[Auth] SignOut error:', e)
    }
    setUser(prev => {
      if (prev?.id) {
        try {
          localStorage.removeItem(`profile_role_${prev.id}`)
          localStorage.removeItem(`profile_first_name_${prev.id}`)
          localStorage.removeItem(`profile_last_name_${prev.id}`)
        } catch {}
      }
      return null
    })
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    } catch {}
  }, [])

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
