'use client'

import { useState, useEffect } from 'react'

let injectScriptPromise: Promise<void> | null = null

export function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    // If it's already there on window, we're good
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      setLoadError(new Error('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not defined'))
      return
    }

    if (!injectScriptPromise) {
      injectScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async`
        script.async = true
        script.defer = true
        script.setAttribute('loading', 'async')
        
        script.onload = () => {
          resolve()
        }
        
        script.onerror = (error) => {
          injectScriptPromise = null // Allow retrying
          reject(error instanceof Error ? error : new Error('Failed to load Google Maps script'))
        }
        
        document.head.appendChild(script)
      })
    }

    injectScriptPromise
      .then(() => setIsLoaded(true))
      .catch((error) => setLoadError(error))
      
  }, [])

  return { isLoaded, loadError }
}
