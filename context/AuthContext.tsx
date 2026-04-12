'use client'

import {
  createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfileData } from '@/hooks/useUserProfile'

interface AuthContextValue {
  user:        ReturnType<typeof Object.create> | null   // raw Supabase user
  profile:     UserProfileData | null
  avatarUrl:   string | null
  loading:     boolean
  error:       string | null
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthContextValue['user']>(null)
  const [profile,   setProfile]   = useState<UserProfileData | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // One stable client for the entire app
  const supabase = useMemo(() => createClient(), [])

  const loadProfile = useCallback(async (uid: string, email: string, metadata: Record<string, string>) => {
    setAvatarUrl(metadata?.avatar_url ?? metadata?.picture ?? null)

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single()

      setProfile(data ?? {
        id:            uid,
        email,
        role:          'user',
        name:          metadata?.full_name ?? metadata?.name ?? email.split('@')[0] ?? 'User',
        phone:         '',
        address_line1: '',
        address_line2: '',
        city:          '',
        state:         '',
        pincode:       '',
        landmark:      '',
      })
    } catch (err) {
      console.error('AuthContext loadProfile:', err)
      setError('Failed to load profile.')
      // Fallback to auth metadata if DB fails
      setProfile({
        id:            uid,
        email,
        role:          'user',
        name:          metadata?.full_name ?? metadata?.name ?? email.split('@')[0] ?? 'User',
        phone:         '',
        address_line1: '',
        address_line2: '',
        city:          '',
        state:         '',
        pincode:       '',
        landmark:      '',
      })
    }
  }, [supabase])

  // Expose this so account page can force a fresh load after saving
  const reloadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const u = session.user
    await loadProfile(u.id, u.email ?? '', u.user_metadata ?? {})
  }, [supabase, loadProfile])

  useEffect(() => {
    // onAuthStateChange fires for INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setAvatarUrl(null)
          setLoading(false)
          return
        }

        const u = session.user
        setUser(u)

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await loadProfile(u.id, u.email ?? '', u.user_metadata ?? {})
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, avatarUrl, loading, error, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
