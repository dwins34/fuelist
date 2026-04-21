'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/lib/icons'
import LocationPicker from '@/components/ui/LocationPicker'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAddresses, CreateAddressInput, UserAddress } from '@/hooks/useAddresses'
import { PlaceDetails } from '@/hooks/usePlacesAutocomplete'
import { cn } from '@/lib/utils'

interface AddressManagerProps {
  onSelect?: (address: UserAddress) => void
  selectedId?: string
  hideHeader?: boolean
}

export default function AddressManager({ onSelect, selectedId, hideHeader }: AddressManagerProps) {
  const { addresses, loading, fetchAddresses, addAddress, setDefaultAddress, deleteAddress } = useAddresses()
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Form State
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home')
  const [houseNumber, setHouseNumber] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [landmark, setLandmark] = useState('')
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleLocationSelect = (details: PlaceDetails) => {
    // If we have a structured street address from our robust extraction, use it.
    // Otherwise fallback to the formatted address.
    setStreetAddress(details.streetAddress || details.address)
    setCity(details.city)
    setStateName(details.state)
    setPincode(details.pincode)
    setLat(details.lat)
    setLng(details.lng)
    setFormError('')
  }

  const handleSave = async () => {
    if (!houseNumber.trim()) {
      setFormError('House / Flat number is required')
      return
    }
    if (!streetAddress.trim()) {
      setFormError('Street address is required')
      return
    }
    if (!city.trim()) {
      setFormError('City is required')
      return
    }
    if (!pincode.trim()) {
      setFormError('Pincode is required')
      return
    }

    setSaving(true)
    setFormError('')
    const payload: CreateAddressInput = {
      label,
      house_number: houseNumber,
      street_address: streetAddress,
      city,
      state: stateName,
      pincode,
      landmark,
      lat,
      lng
    }

    // Safety net: 30s — gives Supabase time on slow connections
    const saveTimeout = setTimeout(() => {
      setSaving(false)
      setFormError('Saving is taking longer than usual. Please check your internet connection and try again.')
    }, 30000)

    const res = await addAddress(payload)
    clearTimeout(saveTimeout)
    setSaving(false)

    if (res.error) {
      setFormError(res.error)
    } else {
      setIsAdding(false)
      // Automatically select the new address if onSelect is provided (e.g. in Cart/Subscription)
      if (onSelect && res.data) {
        onSelect(res.data)
      }
      setHouseNumber('')
      setStreetAddress('')
      setCity('')
      setStateName('')
      setPincode('')
      setLandmark('')
      setLat(undefined)
      setLng(undefined)
      setLabel('Home')
      setFormError('')
    }
  }

  return (
    <div className="space-y-3">
      {/* Header section */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-stone-900 tracking-tight capitalize">Saved Addresses</h2>
            <p className="text-[10px] font-medium text-stone-400 mt-0.5 tracking-wider">Manage your delivery addresses.</p>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="shadow-sm">
              <Icon name="plus" size={12} strokeWidth={3} className="mr-1.5" />
              Add New
            </Button>
          )}
        </div>
      )}

      {hideHeader && !isAdding && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="shadow-sm">
            <Icon name="plus" size={12} strokeWidth={3} className="mr-1.5" />
            Add New
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && !isAdding && addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-30">
          <div className="h-7 w-7 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black capitalize tracking-widest text-stone-500">Loading addresses...</p>
        </div>
      )}

      {/* Empty State */}
      {!isAdding && addresses.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-8 px-6 border-2 border-dashed border-stone-100 rounded-2xl text-center bg-stone-50/20 group hover:border-amber-200 transition-colors"
        >
          <div className="mx-auto w-11 h-11 bg-stone-100 rounded-xl flex items-center justify-center text-stone-300 group-hover:bg-amber-50 group-hover:text-amber-400 transition-colors mb-3">
            <Icon name="location" size={22} />
          </div>
          <h3 className="text-sm font-black text-stone-900 capitalize">No Saved Addresses</h3>
          <p className="text-[11px] text-stone-400 mt-1 max-w-[180px] mx-auto leading-relaxed">Add a delivery address to get started.</p>
          <Button onClick={() => setIsAdding(true)} variant="primary" size="sm" className="mt-4">
            Add New Address
          </Button>
        </motion.div>
      )}

      {/* List Existing Addresses */}
      <AnimatePresence mode="popLayout">
        {!isAdding && addresses.length > 0 && (
          <motion.div layout className="flex flex-col gap-2.5">
            {addresses.map((addr, idx) => {
              const isSelected = onSelect ? selectedId === addr.id : addr.is_default
              return (
                <motion.div
                  layout
                  key={addr.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    interactive
                    onClick={() => {
                      if (onSelect) onSelect(addr)
                      else if (!addr.is_default) setDefaultAddress(addr.id)
                    }}
                    className={cn(
                      "group relative !rounded-2xl border transition-all duration-300",
                      isSelected
                        ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/20 shadow-md"
                        : "border-stone-100 bg-white hover:border-amber-200 shadow-sm"
                    )}
                  >
                    <CardContent className="flex flex-row items-center gap-3 p-3">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                        isSelected
                          ? "bg-amber-500 text-white shadow-md shadow-amber-200/50"
                          : "bg-stone-50 text-stone-400 group-hover:bg-amber-50 group-hover:text-amber-500"
                      )}>
                        <Icon name={(addr.label?.toLowerCase() || 'other') as any} size={18} />
                      </div>

                      {/* Address text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                            isSelected ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-500"
                          )}>
                            {addr.label}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                              <Icon name="success" size={8} strokeWidth={3} />
                              {onSelect ? 'Selected' : 'Default'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-black text-stone-900 truncate leading-snug">
                          {addr.house_number}, {addr.street_address}
                        </p>
                        <p className="text-[10px] font-medium text-stone-400 truncate">
                          {addr.city}, {addr.pincode}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAddress(addr.id)
                        }}
                        className="p-2 text-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200 active:scale-90 shrink-0"
                        title="Delete Address"
                      >
                        <Icon name="delete" size={15} strokeWidth={2.5} />
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Add New Form */}
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-6 shadow-premium"
          >
            <div className="mb-4">
              <h3 className="text-base font-black text-stone-900 tracking-tighter capitalize">Add New Address</h3>
              <p className="text-[10px] font-medium text-stone-400 mt-0.5 tracking-wider">Enter your delivery details below.</p>
            </div>

            <div className="mb-4">
              <div className="text-[9px] font-black capitalize tracking-widest text-stone-300 mb-1.5 ml-1">Search Address</div>
              <LocationPicker onLocationSelect={handleLocationSelect} />
            </div>

            <div className="space-y-3">
              <Input
                label="Flat / House No."
                id="house_number"
                type="text"
                value={houseNumber}
                onChange={(e) => { setHouseNumber(e.target.value); setFormError('') }}
                placeholder="Flat / Floor / Suite"
                icon={<Icon name="home" size={15} />}
              />

              <Input
                label="Street Address"
                id="street_address"
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Auto-filled or type manually"
                icon={<Icon name="compass" size={15} />}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  icon={<Icon name="location" size={15} />}
                />
                <Input
                  label="Pincode"
                  id="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  icon={<Icon name="package" size={15} />}
                />
              </div>

              <Input
                label="Landmark (optional)"
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near landmark"
                icon={<Icon name="info" size={15} />}
              />

              <div>
                <p className="text-[9px] font-black capitalize tracking-widest text-stone-300 mb-2 ml-1">Label</p>
                <div className="flex gap-2">
                  {(['Home', 'Work', 'Other'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLabel(l)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black capitalize tracking-wider transition-all duration-200 border-2",
                        label === l
                          ? "bg-stone-900 border-stone-900 text-amber-500 shadow-md"
                          : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                      )}
                    >
                      <Icon name={l.toLowerCase() as any} size={12} strokeWidth={3} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <Badge variant="danger" className="w-full py-2 justify-center gap-2 shadow-none rounded-xl">
                  <Icon name="error" size={13} strokeWidth={3} />
                  {formError}
                </Badge>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} loading={saving} size="sm" className="flex-1">Save Address</Button>
                <Button onClick={() => setIsAdding(false)} variant="ghost" size="sm" className="shrink-0">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
