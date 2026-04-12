'use client'

import { useAuthContext } from '@/context/AuthContext'

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
  const { profile, loading, error, reloadProfile, accessToken } = useAuthContext()

  async function saveProfile(fields: Omit<UserProfileData, 'id' | 'email' | 'role'>) {
    if (!profile)      return { error: 'No session.' }
    if (!accessToken)  return { error: 'Not authenticated.' }

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return { error: 'Supabase not configured.' }

    try {
      // Use direct REST fetch with explicit Authorization header.
      // The Supabase JS client hangs when its auth state hasn't settled yet
      // (timing issue documented at github.com/orgs/supabase/discussions/36044).
      const res = await fetch(`${sbUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey:         sbKey,
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer:         'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id:    profile.id,
          email: profile.email,
          role:  profile.role,
          ...fields,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('saveProfile error:', res.status, text)
        return { error: `Failed to save: ${res.status}` }
      }

      await reloadProfile()
      return { error: null }
    } catch (err) {
      console.error('saveProfile:', err)
      return { error: 'Network error. Please try again.' }
    }
  }

  return { profile, loading, error: error ?? null, saveProfile }
}
