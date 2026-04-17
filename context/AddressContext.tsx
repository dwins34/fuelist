'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useAuthContext } from './AuthContext'

export interface UserAddress {
  id: string
  user_id: string
  label: 'Home' | 'Work' | 'Other'
  house_number: string
  street_address: string
  city: string
  state: string
  pincode: string
  landmark?: string
  lat?: number
  lng?: number
  is_default: boolean
  created_at: string
}

export type CreateAddressInput = Omit<UserAddress, 'id' | 'user_id' | 'is_default' | 'created_at'>

interface AddressContextValue {
  addresses: UserAddress[]
  loading: boolean
  error: string | null
  fetchAddresses: (force?: boolean) => Promise<void>
  addAddress: (input: CreateAddressInput) => Promise<{ data: UserAddress | null; error: string | null }>
  setDefaultAddress: (addressId: string) => Promise<{ error: string | null }>
  deleteAddress: (addressId: string) => Promise<{ error: string | null }>
}

const AddressContext = createContext<AddressContextValue | null>(null)

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = useAuthContext()
  
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const hasInitialFetched = useRef(false)

  const fetchAddresses = useCallback(async (force = false) => {
    if (!profile?.id) {
      setLoading(false)
      loadingRef.current = false
      return
    }
    
    if (loadingRef.current) return
    if (hasInitialFetched.current && !force) return

    setLoading(true)
    loadingRef.current = true
    setError(null)
    
    const timer = setTimeout(() => {
      setLoading(false)
      loadingRef.current = false
    }, 8000)

    try {
      console.log('AddressContext: fetching addresses for', profile.id)
      const { data, error: sbError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (sbError) throw sbError
      setAddresses(data || [])
      hasInitialFetched.current = true
    } catch (err: any) {
      console.error('AddressContext: Error fetching addresses:', err)
      setError(err.message || 'Error fetching addresses')
    } finally {
      clearTimeout(timer)
      setLoading(false)
      loadingRef.current = false
    }
  }, [profile?.id, supabase])

  const addAddress = async (input: CreateAddressInput) => {
    if (!profile?.id) return { data: null, error: 'Authentication required. Please sign in again.' }

    console.log('AddressContext: addAddress starting...', { profileId: profile.id, input })

    try {
      const isFirst = addresses.length === 0
      const payload = {
        user_id: profile.id,
        ...input,
        is_default: isFirst
      }

      console.log('AddressContext: calling insert...', payload)

      const { data, error: sbError } = await supabase
        .from('user_addresses')
        .insert([payload])
        .select()

      console.log('AddressContext: insert returned', { data, sbError })

      if (sbError) {
        if (sbError.code === '23503') { 
          return { data: null, error: 'Your profile is being initialized. Please wait a moment and try again.' }
        }
        throw sbError
      }
      
      const newAddress = data?.[0]
      if (!newAddress) throw new Error('Address saved but not returned.')

      setAddresses(prev => {
        const next = [newAddress, ...prev]
        return next.sort((a, b) => Number(b.is_default) - Number(a.is_default))
      })
      
      return { data: newAddress, error: null }
    } catch (err: any) {
      console.error('AddressContext: caught error in addAddress:', err)
      return { data: null, error: err.message || 'Failed to add address' }
    }
  }

  const setDefaultAddress = async (addressId: string) => {
    try {
      const { error: sbError } = await supabase.rpc('set_default_address', {
        target_address_id: addressId
      })

      if (sbError) throw sbError
      
      setAddresses(prev => 
        prev
          .map(addr => ({ ...addr, is_default: addr.id === addressId }))
          .sort((a, b) => Number(b.is_default) - Number(a.is_default))
      )
      return { error: null }
    } catch (err: any) {
      console.error('AddressContext: Error setting default address:', err)
      return { error: err.message || 'Failed to set default address' }
    }
  }

  const deleteAddress = async (addressId: string) => {
    try {
      const { error: sbError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)

      if (sbError) throw sbError
      
      setAddresses(prev => {
        const next = prev.filter(a => a.id !== addressId)
        const oldDeleted = prev.find(a => a.id === addressId)
        if (oldDeleted?.is_default && next.length > 0) {
          setDefaultAddress(next[0].id)
          next[0].is_default = true
        }
        return next
      })
      return { error: null }
    } catch (err: any) {
      console.error('AddressContext: Error deleting address:', err)
      return { error: err.message || 'Failed to delete address' }
    }
  }

  // Automatically fetch when profile is loaded
  useEffect(() => {
    if (profile?.id) {
      fetchAddresses()
    } else {
      setAddresses([])
      hasInitialFetched.current = false
    }
  }, [profile?.id, fetchAddresses])

  return (
    <AddressContext.Provider value={{ 
      addresses, 
      loading, 
      error, 
      fetchAddresses, 
      addAddress, 
      setDefaultAddress, 
      deleteAddress 
    }}>
      {children}
    </AddressContext.Provider>
  )
}

export function useAddressContext() {
  const ctx = useContext(AddressContext)
  if (!ctx) throw new Error('useAddressContext must be used inside AddressProvider')
  return ctx
}
