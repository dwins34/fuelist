'use client'

import { useEffect } from 'react'

export default function KitchenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Kitchen] Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-stone-50">
      <p className="text-4xl mb-4">🍳</p>
      <h2 className="text-lg font-black text-stone-900 mb-1">Kitchen display error</h2>
      <p className="text-xs text-stone-400 mb-6">Reload to reconnect to live orders.</p>
      <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 transition-colors">
        Reload
      </button>
    </div>
  )
}
