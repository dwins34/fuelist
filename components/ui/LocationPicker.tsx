'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Navigation, Loader2, Search, X } from 'lucide-react'
import { usePlacesAutocomplete, PlacePrediction, PlaceDetails } from '@/hooks/usePlacesAutocomplete'
import { useLocation } from '@/hooks/useLocation'

interface LocationPickerProps {
  onLocationSelect: (data: PlaceDetails) => void
}

export default function LocationPicker({ onLocationSelect }: LocationPickerProps) {
  const { 
    query, 
    setQuery, 
    predictions, 
    loading: searchLoading, 
    clear, 
    getPlaceDetails, 
    detailsLoading 
  } = usePlacesAutocomplete()
  
  const { getCurrentLocation, loading: locationLoading, error: locationError } = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleGetCurrentLocation = async () => {
    try {
      const details = await getCurrentLocation()
      setQuery(details.address)
      setIsOpen(false)
      onLocationSelect(details)
    } catch (error) {
      // Error is handled by the hook and displayed below
      console.error(error)
    }
  }

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.description)
    setIsOpen(false)
    try {
      const details = await getPlaceDetails(prediction.place_id)
      onLocationSelect(details)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      
      {/* ── Search Input ── */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search your area or apartment..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm shadow-sm outline-none transition ring-green-500/20 focus:border-green-500 focus:ring-4"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Primary CTA: Use Current Location ── */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={locationLoading || detailsLoading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
      >
        {locationLoading || detailsLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Navigation size={18} />
        )}
        <span>{locationLoading ? 'Locating...' : 'Use My Current Location'}</span>
      </button>

      {locationError && (
        <p className="mt-2 text-xs font-medium text-red-500">{locationError}</p>
      )}

      {/* ── Dropdown Predictions ── */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-[3.25rem] z-50 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
          <ul className="max-h-60 overflow-y-auto py-1">
            {predictions.map((prediction) => (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
