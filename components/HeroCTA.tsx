'use client'

import { useAuthContext } from '@/context/AuthContext'
import Button from './ui/Button'

export default function HeroCTA() {
  const { profile, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="h-12 w-44 animate-pulse rounded-full bg-green-200" />
        <div className="h-12 w-36 animate-pulse rounded-full bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button href="/menu" size="lg">Browse the Menu</Button>
      {!profile && (
        <Button href="/signup" variant="secondary" size="lg">Get Started Free</Button>
      )}
    </div>
  )
}
