'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Admin] Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-4xl mb-4">⚠️</p>
      <h2 className="text-lg font-black text-stone-900 mb-1">Something went wrong</h2>
      <p className="text-xs text-stone-400 mb-6">An error occurred in the admin panel.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-black hover:bg-amber-600 transition-colors">
          Try again
        </button>
        <Link href="/admin" className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-black hover:bg-stone-200 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
