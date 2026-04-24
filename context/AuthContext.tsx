'use client'

import {
  createContext, useContext, useEffect, useRef, useMemo, useState, useCallback, ReactNode
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfileData } from '@/hooks/useUserProfile'

interface AuthContextValue {
  user:          ReturnType<typeof Object.create> | null  // raw Supabase user
  profile:       UserProfileData | null
  avatarUrl:     string | null
  loading:       boolean
  error:         string | null
  accessToken:   string | null
  supabase:      ReturnType<typeof createClient>
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

  // Keep a ref to the latest accessToken so reloadProfile doesn't need it as a dep
  const accessTokenRef = useRef<string | null>(null)
  // Track deferred setTimeout IDs so we can cancel them on unmount
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  // One stable client for the entire app
  const supabase = useMemo(() => createClient(), [])

  // Fetch profile via direct REST fetch with explicit Authorization header.
  // This avoids relying on cookie state and works reliably on localhost and prod.
  const loadProfile = useCallback(async (uid: string, token: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return

    try {
      const res = await fetch(`${url}/rest/v1/users?id=eq.${uid}&select=*&limit=1`, {
        headers: {
          apikey:         key,
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        console.error('AuthContext loadProfile error:', res.status, await res.text())
        return
      }

      const rows: UserProfileData[] = await res.json()
      if (rows[0]) setProfile(rows[0])
      // If no DB row yet, the metadata-derived profile stays in place
    } catch (err) {
      console.error('AuthContext loadProfile fetch error:', err)
      setError('Failed to load profile.')
    }
  }, [])

  // Exposed so other pages (account settings) can force a fresh profile load.
  // Uses the stored token ref — no getSession() call needed.
  const reloadProfile = useCallback(async () => {
    if (!user?.id || !accessTokenRef.current) return
    await loadProfile(user.id, accessTokenRef.current)
  }, [user, loadProfile])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ⚠️ Keep this callback synchronous.
        // Per Supabase docs: do NOT await other Supabase calls here — it causes deadlocks.
        // All async work is deferred via setTimeout so it runs after this callback returns.

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setAvatarUrl(null)
          setAccessToken(null)
          accessTokenRef.current = null
          try { localStorage.removeItem('fuelist_avatar') } catch {}
          setLoading(false)
          return
        }

        const u   = session.user
        const meta = u.user_metadata ?? {}
        const token = session.access_token

        // Always keep the stored token up to date (TOKEN_REFRESHED updates it too)
        setAccessToken(token)
        accessTokenRef.current = token

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setUser(u)
          // Persist avatar URL so it survives page refresh without flickering
          const freshAvatar = meta?.avatar_url ?? meta?.picture ?? null
          if (freshAvatar) {
            try { localStorage.setItem('fuelist_avatar', freshAvatar) } catch {}
          }
          const cachedAvatar = freshAvatar ?? (() => { try { return localStorage.getItem('fuelist_avatar') } catch { return null } })()
          setAvatarUrl(cachedAvatar)
          // Immediately render with metadata — DB enriches in background
          const displayName = meta?.full_name ?? meta?.name ?? u.email?.split('@')[0] ?? 'User'
          setProfile((prev) => prev ?? EMPTY_PROFILE(u.id, u.email ?? '', displayName))
          setLoading(false)
          // Defer DB fetch outside the callback (Supabase deadlock prevention)
          const t1 = setTimeout(() => { loadProfile(u.id, token) }, 0)
          pendingTimers.current.push(t1)

        } else if (event === 'TOKEN_REFRESHED') {
          const t2 = setTimeout(() => { loadProfile(u.id, token) }, 0)
          pendingTimers.current.push(t2)

        } else if (event === 'USER_UPDATED') {
          const t3 = setTimeout(() => { loadProfile(u.id, token) }, 0)
          pendingTimers.current.push(t3)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      pendingTimers.current.forEach(clearTimeout)
      pendingTimers.current = []
    }
  }, [supabase, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, avatarUrl, loading, error, accessToken, supabase, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
