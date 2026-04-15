'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useGoogleMapsScript } from './useGoogleMapsScript'
import type { PlaceDetails } from './usePlacesAutocomplete'

export function useLocation() {
  const { isLoaded, loadError } = useGoogleMapsScript()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const geocoder = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
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

      // Safety timeout in case the browser geolocation API hangs (common on some mobile browsers)
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

          // Lazy initialization of geocoder if not already ready
          if (!geocoder.current && window.google?.maps?.Geocoder) {
            geocoder.current = new window.google.maps.Geocoder()
          }

          if (!geocoder.current) {
            const errorMsg = 'Google Maps service not ready. Please refresh.'
            setError(errorMsg)
            cleanup()
            reject(new Error(errorMsg))
            return
          }

          geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
            cleanup()
            if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
              const place = results[0]
              const address = place.formatted_address || ''
              
              let city = ''
              let state = ''
              let pincode = ''
              const streetParts: string[] = []

              place.address_components?.forEach(component => {
                const types = component.types
                
                if (types.includes('locality')) {
                  city = component.long_name
                } else if (!city && (types.includes('administrative_area_level_2') || types.includes('sublocality_level_1') || types.includes('sublocality'))) {
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

              const details: PlaceDetails = { lat, lng, address, streetAddress, city, state, pincode }
              resolve(details)
            } else {
              const errorMsg = status === 'ZERO_RESULTS' 
                ? 'No address found for this location.' 
                : 'Failed to reverse geocode location. Status: ' + status
              setError(errorMsg)
              reject(new Error(errorMsg))
            }
          })
        },
        (error) => {
          cleanup()
          let errorMsg = 'Failed to get current location.'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please allow access or search manually.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable.'
              break
            case error.TIMEOUT:
              errorMsg = 'The request to get user location timed out.'
              break
          }
          setError(errorMsg)
          reject(new Error(errorMsg))
        },
        // enableHighAccuracy: false is more reliable on mobile/indoors
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      )
    })
  }, [])

  return { getCurrentLocation, loading, error }
}
