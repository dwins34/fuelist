'use client'

import { useEffect } from 'react'

// Reference-count approach: scroll lock stays active as long as any
// consumer is mounted with `active = true`. Prevents race conditions
// when multiple overlays (cart + modal) open/close in sequence.
let lockCount = 0
let savedScrollY = 0

function applyLock() {
  lockCount++
  if (lockCount !== 1) return

  // Measure scrollbar width before locking (desktop only; 0 on mobile)
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

  savedScrollY = window.scrollY

  // Compensate for scrollbar disappearing (prevents layout shift on desktop)
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  // iOS Safari: overflow:hidden alone doesn't prevent scroll on <body>.
  // position:fixed + top keeps the visual scroll position in place.
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.width = '100%'
}

function releaseLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount !== 0) return

  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
  document.body.style.paddingRight = ''

  // Restore scroll position (iOS position:fixed resets it to 0)
  window.scrollTo(0, savedScrollY)
}

/**
 * Lock body scroll while `active` is true.
 *
 * Handles:
 *  - iOS Safari (position:fixed + top trick)
 *  - Desktop scrollbar compensation (no layout shift)
 *  - Nested overlays via reference counting
 *  - Automatic cleanup on unmount
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    applyLock()
    return () => releaseLock()
  }, [active])
}
