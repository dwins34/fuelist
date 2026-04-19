'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useGoogleMapsScript } from './useGoogleMapsScript'
import type { PlaceDetails } from './usePlacesAutocomplete'

export function useLocation() {
  const { isLoaded, loadError } = useGoogleMapsScript()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocoder = useRef<any>(null)

  useEffect(() => {
    if (isLoaded && !loadError && window.google?.maps?.Geocoder) {
      geocoder.current = new window.google.maps.Geocoder()
    }
  }, [isLoaded, loadError])

  const getCurrentLocation = useCallback((): Promise<PlaceDetails> => {
    return new Promise((resolve, reject) => {
      setError(null)
      setLoading(true)

      let safetyTimeout: NodeJS.Timeout

      const cleanup = () => {
        if (safetyTimeout) clearTimeout(safetyTimeout)
        setLoading(false)
      }

      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser.'
        setError(errorMsg)
        setLoading(false)
        reject(new Error(errorMsg))
        return
      }

      // Safety timeout in case the browser geolocation API hangs
      safetyTimeout = setTimeout(() => {
        const errorMsg = 'Location request timed out. Please try again or search manually.'
        setError(errorMsg)
        cleanup()
        reject(new Error(errorMsg))
      }, 12000)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          const doGeocode = () => {
            geocoder.current!.geocode({ location: { lat, lng } }, (results: any[], status: any) => {
              cleanup()
              if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
                const place = results[0]
                const address = place.formatted_address || ''

                let city = ''
                let state = ''
                let pincode = ''
                const streetParts: string[] = []

                place.address_components?.forEach((component: any) => {
                  const types = component.types

                  if (types.includes('locality')) {
                    city = component.long_name
                  } else if (!city && (
                    types.includes('administrative_area_level_2') ||
                    types.includes('sublocality_level_1') ||
                    types.includes('sublocality')
                  )) {
                    city = component.long_name
                  }

                  if (types.includes('administrative_area_level_1')) {
                    state = component.long_name
                  }

                  if (types.includes('postal_code')) {
                    pincode = component.long_name
                  }

                  if (
                    types.includes('premise') ||
                    types.includes('subpremise') ||
                    types.includes('street_number') ||
                    types.includes('route') ||
                    types.includes('neighborhood') ||
                    types.includes('sublocality') ||
                    types.includes('sublocality_level_1') ||
                    types.includes('sublocality_level_2') ||
                    types.includes('sublocality_level_3')
                  ) {
                    if (component.long_name !== city) {
                      streetParts.push(component.long_name)
                    }
                  }
                })

                if (!city && state) city = state

                const uniqueStreetParts = Array.from(new Set(streetParts))
                const streetAddress = uniqueStreetParts.join(', ')

                resolve({ lat, lng, address, streetAddress, city, state, pincode })
              } else {
                let errorMsg = ''
                if (status === 'ZERO_RESULTS') {
                  errorMsg = 'No address found for this location.'
                } else if (status === 'REQUEST_DENIED') {
                  errorMsg = 'Google Geocoding API is not enabled. Please enable it in the Google Cloud Console.'
                } else {
                  errorMsg = 'Failed to reverse geocode location. Status: ' + status
                }
                setError(errorMsg)
                reject(new Error(errorMsg))
              }
            })
          }

          // Wait up to 10 s for the Maps SDK to finish loading before geocoding
          const waitForGeocoder = (attempts = 0): void => {
            if (window.google?.maps?.Geocoder && !geocoder.current) {
              geocoder.current = new window.google.maps.Geocoder()
            }
            if (geocoder.current) {
              doGeocode()
              return
            }
            if (attempts >= 100) {
              const errorMsg = 'Google Maps service not ready. Please refresh and try again.'
              setError(errorMsg)
              cleanup()
              reject(new Error(errorMsg))
              return
            }
            setTimeout(() => waitForGeocoder(attempts + 1), 100)
          }

          waitForGeocoder()
        },
        (err) => {
          cleanup()
          let errorMsg = 'Failed to get current location.'

          const isSecureOrigin =
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = isSecureOrigin
                ? 'Location permission denied. Please enable location access in your browser settings (tap the lock icon in the address bar) or search manually.'
                : 'Location access is restricted to secure (HTTPS) connections. Please use a secure link or search manually.'
              break
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable. This can happen in private browsing or poor signal areas.'
              break
            case err.TIMEOUT:
              errorMsg = 'The request to get user location timed out. Please try again or search manually.'
              break
          }
          setError(errorMsg)
          reject(new Error(errorMsg))
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      )
    })
  }, [])

  return { getCurrentLocation, loading, error }
}
