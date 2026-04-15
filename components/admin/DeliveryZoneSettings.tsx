'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { usePlacesAutocomplete, PlacePrediction } from '@/hooks/usePlacesAutocomplete'
import { haversineDistanceKm, isValidCoord, DeliveryZone } from '@/lib/geo'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

const RADIUS_PRESETS = [2, 3, 5, 7, 10, 15, 20]
const RADIUS_MIN = 1
const RADIUS_MAX = 50

export default function DeliveryZoneSettings() {
  const { deliveryZone, refreshStatus } = useServiceStatus()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [lat,       setLat]       = useState<number | null>(deliveryZone?.lat ?? null)
  const [lng,       setLng]       = useState<number | null>(deliveryZone?.lng ?? null)
  const [address,   setAddress]   = useState(deliveryZone?.address ?? '')
  const [radiusKm,  setRadiusKm]  = useState(deliveryZone?.radius_km ?? 5)
  const [radiusInput, setRadiusInput] = useState(String(deliveryZone?.radius_km ?? 5))

  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ── Places autocomplete ──────────────────────────────────────────────────────
  const {
    query, setQuery, predictions, loading: searchLoading,
    clear, getPlaceDetails, detailsLoading, isLoaded: mapsLoaded,
  } = usePlacesAutocomplete()

  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Sync when context refreshes
  useEffect(() => {
    if (deliveryZone) {
      setLat(deliveryZone.lat)
      setLng(deliveryZone.lng)
      setAddress(deliveryZone.address)
      setRadiusKm(deliveryZone.radius_km)
      setRadiusInput(String(deliveryZone.radius_km))
    }
  }, [deliveryZone])

  // ── Dirty check ─────────────────────────────────────────────────────────────
  const isDirty =
    lat !== (deliveryZone?.lat ?? null) ||
    lng !== (deliveryZone?.lng ?? null) ||
    radiusKm !== (deliveryZone?.radius_km ?? 5) ||
    address !== (deliveryZone?.address ?? '')

  const isConfigured = lat !== null && lng !== null

  // ── Select a place suggestion ────────────────────────────────────────────────
  async function handleSelectPrediction(p: PlacePrediction) {
    setDropdownOpen(false)
    setQuery(p.description)
    setError(null)
    try {
      const details = await getPlaceDetails(p.place_id)
      setLat(details.lat)
      setLng(details.lng)
      setAddress(details.address)
    } catch {
      setError('Failed to fetch location details. Try again.')
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!lat || !lng) {
      setError('Please search and select a hub location first.')
      return
    }
    if (!isValidCoord({ lat, lng })) {
      setError('Invalid coordinates. Please re-select the location.')
      return
    }

    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_zone: { lat, lng, radius_km: radiusKm, address },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }

      setSuccess(true)
      await refreshStatus()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Could not save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Radius input handler ─────────────────────────────────────────────────────
  function handleRadiusInput(raw: string) {
    setRadiusInput(raw)
    const parsed = parseFloat(raw)
    if (!isNaN(parsed) && parsed >= RADIUS_MIN && parsed <= RADIUS_MAX) {
      setRadiusKm(parsed)
    }
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm space-y-8">

      {/* ── Section header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tighter">Delivery Zone</h2>
          <p className="text-xs font-medium text-stone-400 mt-1">
            Set the hub location and delivery radius. Orders outside the radius are blocked at checkout.
          </p>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Zone Active
          </div>
        )}
      </div>

      {/* ── Hub location picker ── */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-stone-500 px-1">
          Hub / Restaurant Location
        </label>

        {/* Search input */}
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-4 text-stone-400">
              <Icon name="search" size={16} />
            </div>
            <input
              type="text"
              value={query || address}
              onChange={(e) => {
                setQuery(e.target.value)
                setDropdownOpen(true)
                if (!e.target.value) { setLat(null); setLng(null); setAddress('') }
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder={mapsLoaded ? 'Search restaurant address…' : 'Loading Maps…'}
              disabled={!mapsLoaded}
              className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-11 pr-10 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all placeholder:text-stone-300 disabled:bg-stone-50 disabled:text-stone-400"
            />
            {(query || address) && (
              <button
                type="button"
                onClick={() => { clear(); setLat(null); setLng(null); setAddress(''); setDropdownOpen(false) }}
                className="absolute right-3 p-1 text-stone-300 hover:text-stone-700 rounded-lg transition-colors"
              >
                <Icon name="close" size={14} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Predictions dropdown */}
          <AnimatePresence>
            {dropdownOpen && predictions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-xl"
              >
                {predictions.map((p) => (
                  <li key={p.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPrediction(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors group"
                    >
                      <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl bg-stone-50 text-stone-300 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                        <Icon name="location" size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-stone-900 truncate">{p.structured_formatting.main_text}</p>
                        <p className="text-[10px] font-medium text-stone-400 truncate">{p.structured_formatting.secondary_text}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Coordinate badge — shows after selection */}
        {isConfigured && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
            <Icon name="compass" size={13} strokeWidth={2.5} className="text-stone-400 shrink-0" />
            <span className="text-[10px] font-bold text-stone-500 font-mono">
              {lat!.toFixed(6)}, {lng!.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* ── Radius control ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            Delivery Radius
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={0.5}
              value={radiusInput}
              onChange={(e) => handleRadiusInput(e.target.value)}
              className="w-16 text-right text-sm font-black text-stone-900 bg-transparent border-b-2 border-stone-200 focus:border-amber-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs font-black text-stone-400">km</span>
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            step={0.5}
            value={radiusKm}
            onChange={(e) => { const v = parseFloat(e.target.value); setRadiusKm(v); setRadiusInput(String(v)) }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-stone-100 accent-amber-500"
          />
          <div className="flex justify-between text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1 px-0.5">
            <span>{RADIUS_MIN} km</span>
            <span>{RADIUS_MAX} km</span>
          </div>
        </div>

        {/* Quick preset pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => { setRadiusKm(r); setRadiusInput(String(r)) }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-black transition-all border',
                radiusKm === r
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-amber-300 hover:text-amber-600',
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* ── Coverage preview pill ── */}
      {isConfigured && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Coverage Preview</p>
            <p className="text-sm font-black text-stone-900 mt-0.5 truncate max-w-[220px]">{address}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-amber-600 leading-none">{radiusKm} km</p>
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">radius</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
          <Icon name="error" size={14} strokeWidth={3} />
          {error}
        </div>
      )}

      {/* ── Save row ── */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"
            >
              <Icon name="success" size={14} strokeWidth={4} />
              Zone Saved
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSave}
          disabled={loading || !isDirty || !isConfigured}
          className="ml-auto flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3 text-sm font-black text-white hover:bg-stone-800 disabled:opacity-30 disabled:grayscale transition-all shadow-md active:scale-95"
        >
          <Icon
            name={loading ? 'preparing' : detailsLoading ? 'spinner' : 'location'}
            size={16}
            strokeWidth={3}
            className={cn((loading || detailsLoading) && 'animate-spin')}
          />
          {loading ? 'Saving…' : 'Save Zone'}
        </button>
      </div>
    </div>
  )
}
