'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types'

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data ?? null)
      setLoading(false)
    }

    loadProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { profile, loading, isAdmin: profile?.role === 'admin' }
}
