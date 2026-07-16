/**
 * useAuth.ts
 *
 * ÚNICO CAMBIO sobre tu archivo original: se agrega getAccessToken(),
 * para que AdminLogsPage (y cualquier otra página) obtenga el JWT actual
 * sin repetir supabase.auth.getSession() en cada componente.
 * (El panel original intentaba usar `user.getSession()`, que no existe —
 * ver observación 11.1. `supabase` ya se exponía desde este hook.)
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export interface User {
  id: string
  email: string
  full_name: string
  role_id: number
  role_name: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  })

  useEffect(() => {
    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        })
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No hay sesión activa')
      }

      const response = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Falló obtener perfil')
      }

      const { data: profile } = await response.json()

      setState({
        user: {
          id: userId,
          email: profile.email,
          full_name: profile.full_name,
          role_id: profile.role_id,
          role_name: profile.roles?.name || 'unknown',
        },
        loading: false,
        error: null,
        isAuthenticated: true,
      })
    } catch (err) {
      setState({
        user: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
        isAuthenticated: false,
      })
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
      return false
    }

    return true
  }, [])

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error al cerrar sesión:', error.message)
    }

    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    })
  }, [])

  /**
   * NUEVO: obtiene el access_token actual, o null si no hay sesión.
   * Úsalo en cualquier página que necesite llamar al backend directamente
   * (ej. AdminLogsPage) en vez de reimplementar supabase.auth.getSession().
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.access_token ?? null
  }, [])

  return {
    ...state,
    supabase,
    login,
    logout,
    getAccessToken,
  }
}
