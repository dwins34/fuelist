'use client'

import { useState, useEffect } from 'react'

// Module-level singleton — shared across all hook instances
let scriptPromise: Promise<void> | null = null
let scriptReady = false   // true once fully initialised (places lib ready)

function waitForPlaces(): Promise<void> {
  return new Promise((resolve, reject) => {
    const MAX_WAIT = 8000   // 8 s hard cap
    const INTERVAL = 100
    let elapsed = 0

    const poll = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(poll)
        scriptReady = true
        resolve()
        return
      }
      elapsed += INTERVAL
      if (elapsed >= MAX_WAIT) {
        clearInterval(poll)
        reject(new Error('Google Maps Places library did not initialise in time.'))
      }
    }, INTERVAL)
  })
}

export function useGoogleMapsScript() {
  // Initialise synchronously if the lib is already ready (e.g. hot reload / sibling mount)
  const [isLoaded, setIsLoaded] = useState(() => scriptReady)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    if (scriptReady) { setIsLoaded(true); return }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      setLoadError(new Error('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not defined'))
      return
    }

    // Inject the script tag only once
    if (!scriptPromise) {
      scriptPromise = new Promise<void>((resolve, reject) => {
        // Script may already be injected (e.g. Next.js fast-refresh)
        if (window.google?.maps?.places) { resolve(); return }

        const existing = document.querySelector('script[data-gmaps]')
        if (existing) {
          // Script tag exists but hasn't fired onload yet — just wait for Places
          waitForPlaces().then(resolve).catch(reject)
          return
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`
        script.async = true
        script.defer = true
        script.dataset.gmaps = '1'

        script.onload = () => {
          // Script loaded but Places library may still be async-initialising
          waitForPlaces().then(resolve).catch(reject)
        }

        script.onerror = () => {
          scriptPromise = null   // allow retry on next mount
          reject(new Error('Failed to load Google Maps script. Check your API key and billing.'))
        }

        document.head.appendChild(script)
      })
    }

    scriptPromise
      .then(() => setIsLoaded(true))
      .catch((err) => { setLoadError(err instanceof Error ? err : new Error(String(err))) })

  }, [])

  return { isLoaded, loadError }
}
