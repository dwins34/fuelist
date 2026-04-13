'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGoogleMapsScript } from './useGoogleMapsScript'

export interface PlacePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface PlaceDetails {
  lat: number
  lng: number
  address: string
  streetAddress: string
  city: string
  state: string
  pincode: string
}

export function usePlacesAutocomplete() {
  const { isLoaded, loadError } = useGoogleMapsScript()
  
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)

  // Initialize services when script is loaded
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      // PlacesService requires a map or a div. We can pass a dummy div.
      const dummyDiv = document.createElement('div')
      placesService.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [isLoaded, loadError])

  const fetchPredictions = useCallback((input: string) => {
    setQuery(input)
    if (!input) {
      setPredictions([])
      return
    }

    if (!autocompleteService.current) return

    setLoading(true)
    autocompleteService.current.getPlacePredictions(
      { input, componentRestrictions: { country: 'in' } },
      (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results)
        } else {
          setPredictions([])
        }
      }
    )
  }, [])

  const getPlaceDetails = useCallback((placeId: string): Promise<PlaceDetails> => {
    return new Promise((resolve, reject) => {
      if (!placesService.current) {
        reject(new Error('Places service not initialized'))
        return
      }

      setDetailsLoading(true)
      placesService.current.getDetails(
        {
          placeId,
          fields: ['formatted_address', 'geometry', 'address_components'],
        },
        (place, status) => {
          setDetailsLoading(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            
            const lat = place.geometry?.location?.lat() || 0
            const lng = place.geometry?.location?.lng() || 0
            const address = place.formatted_address || ''
            
            let city = ''
            let state = ''
            let pincode = ''
            const streetParts: string[] = []

            place.address_components?.forEach(component => {
              const types = component.types
              if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                city = component.long_name
              } else if (types.includes('administrative_area_level_1')) {
                state = component.long_name
              } else if (types.includes('postal_code')) {
                pincode = component.long_name
              } else if (
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
                streetParts.push(component.long_name)
              }
            })

            const streetAddress = streetParts.join(', ')

            resolve({ lat, lng, address, streetAddress, city, state, pincode })
          } else {
            reject(new Error('Failed to fetch place details'))
          }
        }
      )
    })
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setPredictions([])
  }, [])

  return {
    isLoaded,
    loadError,
    query,
    setQuery: fetchPredictions,
    predictions,
    loading,
    clear,
    getPlaceDetails,
    detailsLoading
  }
}
