'use client'

import { useServiceStatus } from '@/context/ServiceStatusContext'

export default function ServiceBanner() {
  const { isEnabled, message, loading } = useServiceStatus()

  if (loading || isEnabled) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-bold shadow-md sticky top-0 z-[100] animate-in fade-in slide-in-from-top duration-500">
      <span className="mr-2">⚠️</span>
      {message}
    </div>
  )
}
