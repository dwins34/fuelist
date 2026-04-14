'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlacesAutocomplete, PlacePrediction, PlaceDetails } from '@/hooks/usePlacesAutocomplete'
import { useLocation } from '@/hooks/useLocation'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

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

  const isLocating = locationLoading || detailsLoading

  return (
    <div className="relative w-full" ref={wrapperRef}>
      
      {/* ── Search Input ── */}
      <div className="group relative flex items-center">
        <div className={cn(
          "absolute left-4 transition-colors duration-200",
          isOpen ? "text-amber-500" : "text-stone-400"
        )}>
          <Icon name="search" size={18} />
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
          className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 py-3.5 pl-12 pr-12 text-sm font-medium shadow-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/5 placeholder:text-stone-300"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-4 text-stone-300 hover:text-stone-900 transition-colors bg-stone-100/50 p-1 rounded-lg"
          >
            <Icon name="close" size={14} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* ── Primary CTA: Use Current Location ── */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isLocating}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-4 text-[11px] font-black capitalize tracking-widest transition-all shadow-sm active:scale-[0.98]",
          isLocating 
            ? "bg-stone-100 text-stone-400 cursor-not-allowed opacity-70"
            : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100/50"
        )}
      >
        {isLocating ? (
          <Icon name="spinner" size={16} className="animate-spin" />
        ) : (
          <Icon name="compass" size={16} strokeWidth={2.5} />
        )}
        <span>{locationLoading ? 'Locating Protocol...' : 'Identify Current Position'}</span>
      </button>

      {locationError && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-500 capitalize tracking-tight">
          <Icon name="error" size={12} strokeWidth={3} />
          {locationError}
        </div>
      )}

      {/* ── Dropdown Predictions (Premium Glass Style) ── */}
      {isOpen && predictions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-stone-100 bg-white/95 backdrop-blur-xl shadow-premium animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <ul className="max-h-64 overflow-y-auto py-2 no-scrollbar">
            {predictions.map((prediction, idx) => (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-amber-50/50 focus:bg-amber-50 outline-none transition-all group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-300 group-hover:bg-amber-100 group-hover:text-amber-500 transition-colors duration-300">
                    <Icon name="location" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-stone-900 leading-tight tracking-tight capitalize">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="truncate text-[10px] font-bold text-stone-400 mt-1 capitalize tracking-tight">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 duration-300 text-amber-500">
                    <Icon name="arrowRight" size={16} strokeWidth={2.5} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
