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

  // Initialize services when script is loaded
  useEffect(() => {
    if (isLoaded && !loadError && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
    }
  }, [isLoaded, loadError])

  const fetchPredictions = useCallback(async (input: string) => {
    setQuery(input)
    if (!input || !window.google?.maps?.places?.AutocompleteSuggestion) {
      setPredictions([])
      return
    }

    setLoading(true)
    try {
      const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['in'],
      } as any)
      
      const mappedResults: PlacePrediction[] = suggestions
        .filter(s => !!s.placePrediction)
        .map(s => {
          const p = s.placePrediction! as any
          return {
            place_id: p.placeId || '',
            description: p.text?.text || '',
            structured_formatting: {
              main_text: p.structuredFormat?.mainText?.text || '',
              secondary_text: p.structuredFormat?.secondaryText?.text || ''
            }
          }
        })
      
      setPredictions(mappedResults)
    } catch (err) {
      console.error('fetchPredictions error:', err)
      setPredictions([])
    } finally {
      setLoading(true) // match original logic
      setLoading(false)
    }
  }, [])

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails> => {
    if (!window.google?.maps?.places?.Place) {
      throw new Error('Google Maps Place library not loaded')
    }

    setDetailsLoading(true)
    try {
      const place = new window.google.maps.places.Place({ id: placeId })
      
      // The fetchFields promise resolves to an object containing the updated 'place'
      const { place: p } = await (place as any).fetchFields({
        fields: ['addressComponents', 'location', 'formattedAddress']
      })

      const lat = p.location?.lat() || 0
      const lng = p.location?.lng() || 0
      const address = p.formattedAddress || ''
      
      let city = ''
      let state = ''
      let pincode = ''
      const streetParts: string[] = []

      p.addressComponents?.forEach((component: any) => {
        const types = component.types
        if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          city = component.longText
        } else if (types.includes('administrative_area_level_1')) {
          state = component.longText
        } else if (types.includes('postal_code')) {
          pincode = component.longText
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
          streetParts.push(component.longText)
        }
      })

      const streetAddress = streetParts.join(', ')

      return { lat, lng, address, streetAddress, city, state, pincode }
    } catch (err) {
      console.error('getPlaceDetails error:', err)
      throw new Error('Failed to fetch place details')
    } finally {
      setDetailsLoading(false)
    }
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
