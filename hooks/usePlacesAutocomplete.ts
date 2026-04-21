'use client'

import { useState, useCallback } from 'react'
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

  const [query,          setQueryState]   = useState('')
  const [predictions,    setPredictions]  = useState<PlacePrediction[]>([])
  const [loading,        setLoading]      = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // ── Fetch suggestions using the new AutocompleteSuggestion API ────────────
  const fetchPredictions = useCallback(async (input: string) => {
    setQueryState(input)

    if (!input || !isLoaded || !window.google?.maps?.places) {
      setPredictions([])
      return
    }

    setLoading(true)
    try {
      const { suggestions } = await (window.google.maps.places as any)
        .AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ['in'],
        })

      const mapped: PlacePrediction[] = (suggestions ?? []).map((s: any) => {
        const pp = s.placePrediction
        return {
          description:          pp.text?.toString()          ?? pp.toPlace?.()?.displayName ?? '',
          place_id:             pp.placeId                   ?? '',
          structured_formatting: {
            main_text:      pp.mainText?.toString()      ?? '',
            secondary_text: pp.secondaryText?.toString() ?? '',
          },
        }
      })

      setPredictions(mapped)
    } catch (err) {
      console.error('fetchPredictions error:', err)
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [isLoaded])

  // ── Fetch full place details using the new Place API ─────────────────────
  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails> => {
    if (!window.google?.maps?.places) {
      throw new Error('Google Maps Places library not loaded')
    }

    setDetailsLoading(true)
    try {
      const Place = (window.google.maps.places as any).Place
      const place = new Place({ id: placeId })
      await place.fetchFields({
        fields: ['addressComponents', 'location', 'formattedAddress', 'displayName'],
      })

      const lat     = place.location?.lat() ?? 0
      const lng     = place.location?.lng() ?? 0
      const address = place.formattedAddress ?? ''

      let city    = ''
      let state   = ''
      let pincode = ''
      const streetParts: string[] = []

      ;(place.addressComponents ?? []).forEach((c: any) => {
        const types = c.types as string[]
        if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          city = c.longText ?? c.long_name ?? ''
        } else if (types.includes('administrative_area_level_1')) {
          state = c.longText ?? c.long_name ?? ''
        } else if (types.includes('postal_code')) {
          pincode = c.longText ?? c.long_name ?? ''
        } else if (
          types.includes('premise')            ||
          types.includes('subpremise')         ||
          types.includes('street_number')      ||
          types.includes('route')              ||
          types.includes('neighborhood')       ||
          types.includes('sublocality')        ||
          types.includes('sublocality_level_1')||
          types.includes('sublocality_level_2')||
          types.includes('sublocality_level_3')
        ) {
          streetParts.push(c.longText ?? c.long_name ?? '')
        }
      })

      return { lat, lng, address, streetAddress: streetParts.join(', '), city, state, pincode }
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setQueryState('')
    setPredictions([])
  }, [])

  return {
    isLoaded,
    loadError,
    query,
    setQuery:      fetchPredictions,
    predictions,
    loading,
    clear,
    getPlaceDetails,
    detailsLoading,
  }
}
