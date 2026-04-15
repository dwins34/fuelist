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
    setStreetAddress(details.streetAddress ? `${details.streetAddress}, ${details.address}` : details.address)
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
    if (!streetAddress.trim() || !city.trim() || !pincode.trim()) {
      setFormError('Please search for your location to auto-fill street details')
      return
    }

    setSaving(true)
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

    const res = await addAddress(payload)
    setSaving(false)

    if (res.error) {
      setFormError(res.error)
    } else {
      setIsAdding(false)
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
    <div className="space-y-6">
      {/* Header section */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight capitalize">Saved Deployments</h2>
            <p className="text-[11px] font-medium text-stone-400 mt-1 capitalize tracking-widest leading-none">Manage delivery logistics.</p>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="shadow-sm">
              <Icon name="plus" size={12} strokeWidth={3} className="mr-2" />
              Add New
            </Button>
          )}
        </div>
      )}

      {hideHeader && !isAdding && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="shadow-sm">
            <Icon name="plus" size={12} strokeWidth={3} className="mr-2" />
            Add New
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && !isAdding && addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
          <div className="h-8 w-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black capitalize tracking-widest text-stone-500">Hydrating logistics...</p>
        </div>
      )}

      {/* Empty State */}
      {!isAdding && addresses.length === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-10 border-2 border-dashed border-stone-100 rounded-[2rem] text-center bg-stone-50/20 group hover:border-amber-200 transition-colors"
        >
          <div className="mx-auto w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center text-stone-300 group-hover:bg-amber-50 group-hover:text-amber-400 transition-colors mb-4">
            <Icon name="location" size={28} />
          </div>
          <h3 className="text-sm font-black text-stone-900 capitalize">Empty Deployment Log</h3>
          <p className="text-[11px] text-stone-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Add a delivery location to begin your fuelist experience.</p>
          <Button onClick={() => setIsAdding(true)} variant="primary" size="md" className="mt-6">
            Log New Address
          </Button>
        </motion.div>
      )}

      {/* List Existing Addresses */}
      <AnimatePresence mode="popLayout">
        {!isAdding && addresses.length > 0 && (
          <motion.div 
            layout
            className="grid grid-cols-1 gap-4"
          >
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
                      "group relative !rounded-[2rem] border transition-all duration-300",
                      isSelected 
                        ? "border-amber-500 bg-amber-50/10 ring-1 ring-amber-500/20 shadow-premium" 
                        : "border-stone-100 bg-white hover:border-amber-200 shadow-sm"
                    )}
                  >
                    <CardContent className="flex flex-row items-center gap-6 p-6">
                      {/* Left: Dynamic Icon Container */}
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                        isSelected 
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-200/40" 
                          : "bg-stone-50 text-stone-400 group-hover:bg-amber-50 group-hover:text-amber-500"
                      )}>
                        <Icon 
                          name={(addr.label?.toLowerCase() || 'other') as any} 
                          size={22} 
                        />
                      </div>
                      
                      {/* Middle: Address Manifest (Truncation-Safe) */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 mb-2 font-black capitalize">
                          <Badge variant={isSelected ? "premium" : "secondary"} className="text-[9px] py-1 px-3 !rounded-full">
                            {addr.label}
                          </Badge>
                          {isSelected && (
                            <Badge variant="success" className="text-[9px] py-1 px-3 !rounded-full flex items-center gap-1.5">
                              <Icon name="success" size={10} strokeWidth={3} /> {onSelect ? 'Selected' : 'Default'}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-stone-900 truncate leading-tight tracking-tight capitalize">
                          {addr.house_number}, {addr.street_address}
                        </h4>
                        <p className="text-[11px] font-bold text-stone-400 truncate capitalize mt-1 tracking-wider">
                          {addr.city}, {addr.state} {addr.pincode}
                        </p>
                      </div>

                      {/* Right: Actions Container */}
                      <div className="shrink-0 pl-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAddress(addr.id)
                          }}
                          className="p-3 text-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all duration-300 active:scale-90"
                          title="Delete Protocol"
                        >
                          <Icon name="delete" size={18} strokeWidth={2.5} />
                        </button>
                      </div>
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
            className="rounded-[2.5rem] bg-white border border-stone-100 p-6 md:p-8 shadow-premium"
          >
            <div className="mb-8">
              <h3 className="text-xl font-black text-stone-900 tracking-tighter capitalize">New Deployment Zone</h3>
              <p className="text-[11px] font-bold text-stone-400 mt-1 capitalize tracking-widest">Specify logistics details below.</p>
            </div>
            
            <div className="mb-6">
              <div className="text-[9px] font-black capitalize tracking-widest text-stone-300 mb-2 ml-1">Search Terminal</div>
              <LocationPicker onLocationSelect={handleLocationSelect} />
            </div>

            <div className="space-y-5">
              <Input
                label="Premise Identifier"
                id="house_number"
                type="text"
                value={houseNumber}
                onChange={(e) => { setHouseNumber(e.target.value); setFormError('') }}
                placeholder="Flat / Floor / Suite"
                icon={<Icon name="home" size={16} />}
              />

              <Input
                label="Protocol Street"
                id="street_address"
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Auto-filled via terminal search"
                icon={<Icon name="compass" size={16} />}
              />

              <div className="grid grid-cols-2 gap-5">
                <Input 
                  label="Registry City" 
                  id="city"
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City" 
                  icon={<Icon name="location" size={16} />}
                />
                <Input 
                  label="Protocol Pincode" 
                  id="pincode"
                  value={pincode} 
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode" 
                  icon={<Icon name="package" size={16} />}
                />
              </div>

              <Input 
                label="Operational Landmark (optional)" 
                id="landmark"
                value={landmark} 
                onChange={(e) => setLandmark(e.target.value)} 
                placeholder="Near landmark" 
                icon={<Icon name="info" size={16} />}
              />
              
              <div>
                <p className="text-[9px] font-black capitalize tracking-widest text-stone-300 mb-3 ml-1">Zone Tag</p>
                <div className="flex flex-wrap gap-2">
                  {(['Home', 'Work', 'Other'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLabel(l)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black capitalize tracking-widest transition-all duration-200 border-2",
                        label === l 
                          ? "bg-stone-900 border-stone-900 text-amber-500 shadow-md" 
                          : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                      )}
                    >
                      <Icon name={l.toLowerCase() as any} size={14} strokeWidth={3} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <Badge variant="danger" className="w-full py-2.5 justify-center gap-2 shadow-none rounded-xl">
                  <Icon name="error" size={14} strokeWidth={3} />
                  {formError}
                </Badge>
              )}

              <div className="flex gap-3 pt-6">
                <Button onClick={handleSave} loading={saving} size="md" className="flex-1">Save Address</Button>
                <Button onClick={() => setIsAdding(false)} variant="ghost" size="md" className="shrink-0">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
