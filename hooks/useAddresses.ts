'use client'

import { useState, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'

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
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddresses = useCallback(async () => {
    if (!profile?.id || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${sbUrl}/rest/v1/user_addresses?user_id=eq.${profile.id}&order=is_default.desc,created_at.desc`, {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch addresses.')
      const data = await res.json()
      setAddresses(data)
    } catch (err: any) {
      setError(err.message || 'Error fetching addresses')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, accessToken])

  const addAddress = async (input: CreateAddressInput) => {
    if (!profile?.id || !accessToken) return { error: 'Not authenticated' }
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return { error: 'Supabase not configured' }

    try {
      // If no addresses exist, make this default
      const isFirst = addresses.length === 0
      
      const payload = {
        user_id: profile.id,
        ...input,
        is_default: isFirst
      }

      const res = await fetch(`${sbUrl}/rest/v1/user_addresses`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to add address')
      const newAddress = await res.json()
      
      setAddresses(prev => {
        const next = [newAddress[0], ...prev]
        return next.sort((a, b) => Number(b.is_default) - Number(a.is_default))
      })
      
      return { data: newAddress[0], error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const setDefaultAddress = async (addressId: string) => {
    if (!accessToken) return { error: 'Not authenticated' }
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return { error: 'Supabase not configured' }

    try {
      // Use our custom RPC function securely
      const res = await fetch(`${sbUrl}/rest/v1/rpc/set_default_address`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_address_id: addressId })
      })

      if (!res.ok) throw new Error('Failed to set default address')
      
      // Update local state optimizingly instead of full refetch
      setAddresses(prev => 
        prev
          .map(addr => ({ ...addr, is_default: addr.id === addressId }))
          .sort((a, b) => Number(b.is_default) - Number(a.is_default))
      )
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const deleteAddress = async (addressId: string) => {
    if (!accessToken) return { error: 'Not authenticated' }
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return { error: 'Supabase not configured' }

    try {
      const res = await fetch(`${sbUrl}/rest/v1/user_addresses?id=eq.${addressId}`, {
        method: 'DELETE',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${accessToken}`,
        }
      })

      if (!res.ok) throw new Error('Failed to delete address')
      
      setAddresses(prev => {
        const next = prev.filter(a => a.id !== addressId)
        // Auto default if we deleted the default one
        const oldDeleted = prev.find(a => a.id === addressId)
        if (oldDeleted?.is_default && next.length > 0) {
          setDefaultAddress(next[0].id)
          next[0].is_default = true
        }
        return next
      })
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
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
