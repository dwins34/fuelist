'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Check, Loader2, Trash2 } from 'lucide-react'
import LocationPicker from '@/components/ui/LocationPicker'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAddresses, CreateAddressInput, UserAddress } from '@/hooks/useAddresses'
import { PlaceDetails } from '@/hooks/usePlacesAutocomplete'

interface AddressManagerProps {
  onSelect?: (address: UserAddress) => void
  selectedId?: string
  hideHeader?: boolean
}

export default function AddressManager({ onSelect, selectedId, hideHeader }: AddressManagerProps = {}) {
  const { addresses, loading, fetchAddresses, addAddress, setDefaultAddress, deleteAddress } = useAddresses()
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Form State
  const [label, setLabel] = useState<'Home'|'Work'|'Other'>('Home')
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
      // Reset form & close
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
    <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Saved Addresses</h2>
            <p className="text-xs text-gray-500">Manage where you want your meals delivered.</p>
          </div>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)} 
              className="text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Plus size={14} /> Add new
            </button>
          )}
        </div>
      )}
      
      {hideHeader && !isAdding && (
         <div className="flex justify-end mb-2">
            <button 
              onClick={() => setIsAdding(true)} 
              className="text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Plus size={14} /> Add new address
            </button>
         </div>
      )}

      {loading && !isAdding && addresses.length === 0 ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : null}

      {!isAdding && addresses.length === 0 && !loading && (
        <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
          <MapPin className="mx-auto text-gray-300 mb-2" size={24} />
          <p className="text-sm font-medium text-gray-600">No addresses saved yet</p>
          <button onClick={() => setIsAdding(true)} className="mt-3 text-sm font-medium text-green-600">
            Add your first address
          </button>
        </div>
      )}

      {/* List Existing Addresses */}
      {!isAdding && addresses.length > 0 && (
        <div className="space-y-4">
          {addresses.map(addr => (
            <div 
              key={addr.id} 
              className={`p-4 rounded-xl border transition-all ${
                (onSelect ? selectedId === addr.id : addr.is_default) 
                  ? 'border-green-500 bg-green-50/50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    if (onSelect) onSelect(addr)
                    else if (!addr.is_default) setDefaultAddress(addr.id)
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                      {addr.label}
                    </span>
                    {((!onSelect && addr.is_default) || (onSelect && selectedId === addr.id)) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        <Check size={10} strokeWidth={3} /> {onSelect ? 'Selected' : 'Default'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-2">{addr.house_number}, {addr.street_address}</p>
                  <p className="text-xs text-gray-500 mt-1">{addr.city}, {addr.state} {addr.pincode}</p>
                  {addr.landmark && <p className="text-xs text-gray-400 mt-0.5">Landmark: {addr.landmark}</p>}
                </div>

                <button 
                  onClick={() => deleteAddress(addr.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Delete address"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Form */}
      {isAdding && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Add a new address</h3>
          
          <div className="mb-5">
            <LocationPicker onLocationSelect={handleLocationSelect} />
          </div>

          <div className="space-y-4">
            <Input
              label="House / Flat Number"
              id="house_number"
              type="text"
              value={houseNumber}
              onChange={(e) => { setHouseNumber(e.target.value); setFormError('') }}
              placeholder="e.g. Flat 402, Building A"
            />

            <Input
              label="Street / Area"
              id="street_address"
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="Auto-filled via location search"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Auto-filled"
              />
              <Input
                label="State"
                id="state"
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Auto-filled"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pincode"
                id="pincode"
                type="text"
                inputMode="numeric"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Auto-filled"
              />
              <Input
                label="Landmark (optional)"
                id="landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near metro station"
              />
            </div>
            
            {/* Label Chips */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Save as</p>
              <div className="flex gap-2">
                {(['Home', 'Work', 'Other'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLabel(l)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      label === l 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-xs font-medium text-red-500">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} loading={saving} className="flex-1">Save Address</Button>
              <Button onClick={() => setIsAdding(false)} variant="secondary" className="px-6">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
