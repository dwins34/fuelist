'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfileData {
  id: string
  name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  landmark: string
  role: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Stable client — must not be recreated on every render
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // getSession reads from local cookie — no network call, never hangs
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (!user) {
          if (!cancelled) setLoading(false)
          return
        }

        const { data, error: dbErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (dbErr && dbErr.code !== 'PGRST116') {
          console.error('DB load error:', dbErr.message)
          setError('Failed to load profile.')
        }

        setProfile({
          id:            user.id,
          email:         user.email ?? '',
          role:          data?.role ?? 'user',
          name:          data?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
          phone:         data?.phone ?? '',
          address_line1: data?.address_line1 ?? '',
          address_line2: data?.address_line2 ?? '',
          city:          data?.city ?? '',
          state:         data?.state ?? '',
          pincode:       data?.pincode ?? '',
          landmark:      data?.landmark ?? '',
        })
      } catch (err) {
        console.error('useUserProfile load threw:', err)
        if (!cancelled) setError('Something went wrong. Please refresh.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [supabase])

  async function saveProfile(fields: Omit<UserProfileData, 'id' | 'email' | 'role'>) {
    if (!profile) return { error: 'No session.' }

    try {
      const { error: dbErr } = await supabase.from('users').upsert(
        { id: profile.id, email: profile.email, role: profile.role, ...fields },
        { onConflict: 'id' }
      )
      if (dbErr) return { error: dbErr.message }

      await supabase.auth.updateUser({ data: { full_name: fields.name, name: fields.name } })

      setProfile((p) => p ? { ...p, ...fields } : p)
      return { error: null }
    } catch (err) {
      console.error('saveProfile threw:', err)
      return { error: 'Network error. Please try again.' }
    }
  }

  return { profile, loading, error, saveProfile }
}
