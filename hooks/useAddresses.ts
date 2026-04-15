'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'

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

export function useAddresses() {
  const { profile, accessToken } = useAuthContext()
  const supabase = useMemo(() => createClient(), [])
  
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddresses = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)
    try {
      const { data, error: sbError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (sbError) throw sbError
      setAddresses(data || [])
    } catch (err: any) {
      console.error('Error fetching addresses:', err)
      setError(err.message || 'Error fetching addresses')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, supabase])

  const addAddress = async (input: CreateAddressInput) => {
    if (!profile?.id) return { error: 'Authentication required. Please sign in again.' }

    try {
      // If no addresses exist, make this default
      const isFirst = addresses.length === 0
      
      const payload = {
        user_id: profile.id,
        ...input,
        is_default: isFirst
      }

      const { data, error: sbError } = await supabase
        .from('user_addresses')
        .insert([payload])
        .select()

      if (sbError) {
        // Handle race condition: check if user exists in public.users
        if (sbError.code === '23503') { // Foreign key violation
          return { data: null, error: 'Your profile is being initialized. Please wait a moment and try again.' }
        }
        throw sbError
      }
      
      const newAddress = data[0]
      setAddresses(prev => {
        const next = [newAddress, ...prev]
        return next.sort((a, b) => Number(b.is_default) - Number(a.is_default))
      })
      
      return { data: newAddress, error: null }
    } catch (err: any) {
      console.error('Error adding address:', err)
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
      console.error('Error setting default address:', err)
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
      console.error('Error deleting address:', err)
      return { error: err.message || 'Failed to delete address' }
    }
  }

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    addAddress,
    setDefaultAddress,
    deleteAddress
  }
}
