'use client'

import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'

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
  const { profile, loading, error, reloadProfile } = useAuthContext()
  const supabase = useMemo(() => createClient(), [])

  async function saveProfile(fields: Omit<UserProfileData, 'id' | 'email' | 'role'>) {
    if (!profile) return { error: 'No session.' }

    try {
      const { error: dbErr } = await supabase.from('users').upsert(
        { id: profile.id, email: profile.email, role: profile.role, ...fields },
        { onConflict: 'id' }
      )
      if (dbErr) return { error: dbErr.message }

      await supabase.auth.updateUser({ data: { full_name: fields.name, name: fields.name } })
      await reloadProfile()
      return { error: null }
    } catch (err) {
      console.error('saveProfile:', err)
      return { error: 'Network error. Please try again.' }
    }
  }

  return { profile, loading, error: error ?? null, saveProfile }
}
