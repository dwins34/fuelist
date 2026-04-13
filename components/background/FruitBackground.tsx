'use client'

/**
 * FruitBackground — smart wrapper.
 *
 * Responsibilities:
 *  1. Only mount when theme.enable3D === true
 *  2. Detect WebGL support before loading Three.js
 *  3. Dynamically import FruitScene (code-split, not in main bundle)
 *  4. Fall back to FruitFallback on WebGL failure
 *  5. Detect mobile to pass lighter rendering hint to scene
 */

import { useEffect, useState, lazy, Suspense } from 'react'
import { useTheme } from '@/context/ThemeContext'
import FruitFallback from './FruitFallback'

// Dynamic import — Three.js (~1 MB) is not loaded until needed
const FruitScene = lazy(() => import('./FruitScene'))

function detectWebGL(): boolean {
  try {
    const canvas  = document.createElement('canvas')
    const gl      = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export default function FruitBackground() {
  // Theme switching is disabled; the fruit-3d theme is never active.
  // To re-enable: remove this early return, re-enable the fruit-3d theme in
  // ThemeContext, and restore [data-theme="fruit-3d"] overrides in globals.css.
  return null

  // eslint-disable-next-line no-unreachable
  const { theme }  = useTheme()
  const isMobile   = useIsMobile()
  const [webgl, setWebgl] = useState<boolean | null>(null)   // null = not checked yet

  useEffect(() => {
    if (theme.enable3D) setWebgl(detectWebGL())
  }, [theme.enable3D])

  // Not a 3D theme → render nothing (let body bg from CSS vars handle it)
  if (!theme.enable3D) return null

  return (
    // Fixed fullscreen layer behind all content
    // pointer-events-none so nothing blocks clicks on actual content
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        pointerEvents: 'none',
      }}
    >
      {/* Always show fallback first / as a base layer.
          The 3D canvas sits on top if WebGL is available. */}
      <FruitFallback />

      {/* WebGL canvas — loaded lazily, suspended until ready */}
      {webgl && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Suspense fallback={null}>
            <FruitScene isMobile={isMobile} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
