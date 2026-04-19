'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6 bg-white">
      <p className="text-5xl mb-4">😕</p>
      <h2 className="text-xl font-black text-stone-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-stone-400 mb-8 max-w-xs">An unexpected error occurred. It's been noted and we're on it.</p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-2xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
      >
        Try again
      </button>
    </div>
  )
}
