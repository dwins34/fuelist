'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from './ui/Button'

export default function HeroCTA() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
    })
  }, [])

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button href="/menu" size="lg">Browse the Menu</Button>
      {!loggedIn && (
        <Button href="/signup" variant="secondary" size="lg">Get Started Free</Button>
      )}
    </div>
  )
}
