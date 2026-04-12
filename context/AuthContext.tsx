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
  accessToken: string | null
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const EMPTY_PROFILE = (uid: string, email: string, name: string): UserProfileData => ({
  id:            uid,
  email,
  role:          'user',
  name,
  phone:         '',
  address_line1: '',
  address_line2: '',
  city:          '',
  state:         '',
  pincode:       '',
  landmark:      '',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<AuthContextValue['user']>(null)
  const [profile,     setProfile]     = useState<UserProfileData | null>(null)
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // One stable client for the entire app
  const supabase = useMemo(() => createClient(), [])

  // Fetch profile using the session's access_token directly so RLS auth header
  // is always correct regardless of cookie state on localhost / SSR.
  const loadProfile = useCallback(async (
    uid: string,
    _email: string,
    _metadata: Record<string, string>,
    accessToken: string,
  ) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    try {
      const res = await fetch(
        `${url}/rest/v1/users?id=eq.${uid}&select=*&limit=1`,
        {
          headers: {
            apikey:          key,
            Authorization:   `Bearer ${accessToken}`,
            'Content-Type':  'application/json',
          },
        }
      )

      if (!res.ok) {
        console.error('AuthContext loadProfile HTTP error:', res.status, await res.text())
        return
      }

      const rows: UserProfileData[] = await res.json()
      const data = rows[0] ?? null

      if (data) {
        setProfile(data)
      }
      // If no row yet, leave the metadata-derived profile in place
    } catch (err) {
      console.error('AuthContext loadProfile fetch error:', err)
      setError('Failed to load profile.')
    }
  }, [])

  // Expose this so account page can force a fresh load after saving
  const reloadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user || !session.access_token) return
    const u = session.user
    await loadProfile(u.id, u.email ?? '', u.user_metadata ?? {}, session.access_token)
  }, [supabase, loadProfile])

  useEffect(() => {
    // onAuthStateChange fires for INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setAvatarUrl(null)
          setAccessToken(null)
          setLoading(false)
          return
        }

        const u = session.user
        setUser(u)
        setAccessToken(session.access_token)

        // Set a fast initial profile from auth metadata so UI renders immediately
        const meta = u.user_metadata ?? {}
        const displayName = meta?.full_name ?? meta?.name ?? u.email?.split('@')[0] ?? 'User'
        setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null)
        setProfile((prev) => prev ?? EMPTY_PROFILE(u.id, u.email ?? '', displayName))
        setLoading(false) // stop skeleton immediately — DB enriches in background

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Pass access_token so the fetch is always authenticated
          loadProfile(u.id, u.email ?? '', meta, session.access_token)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, avatarUrl, loading, error, accessToken, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
