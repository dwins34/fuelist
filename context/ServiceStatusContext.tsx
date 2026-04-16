'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { DeliveryZone } from '@/lib/geo'

interface ServiceConfig {
  enabled:      boolean
  message:      string
}

interface ServiceStatusContextType {
  isEnabled:          boolean
  message:            string
  loading:            boolean
  bannerHeight:       number
  deliveryFee:        number            // ₹ delivery fee — admin-controlled
  deliveryZone:       DeliveryZone | null   // hub location + radius, null = not configured
  serviceAreaLabel:   string            // human-readable area name derived from zone address
  setBannerHeight:    (height: number) => void
  refreshStatus:      () => Promise<void>
}

const ServiceStatusContext = createContext<ServiceStatusContextType | undefined>(undefined)

const DEFAULT_DELIVERY_FEE = 25   // fallback while loading

export function ServiceStatusProvider({ children }: { children: React.ReactNode }) {
  const [config,        setConfig]        = useState<ServiceConfig>({ enabled: true, message: '' })
  const [deliveryFee,   setDeliveryFee]   = useState<number>(DEFAULT_DELIVERY_FEE)
  const [deliveryZone,  setDeliveryZone]  = useState<DeliveryZone | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [bannerHeight,  setBannerHeight]  = useState(0)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        if (typeof data.delivery_fee === 'number') setDeliveryFee(data.delivery_fee)
        setDeliveryZone(data.delivery_zone ?? null)
        if (data.config.enabled) setBannerHeight(0)
      }
    } catch (err) {
      console.error('Failed to fetch service status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  // Derive a human-readable area label from the zone address.
  // Falls back to the first part of the address (city-level) or a generic label.
  const serviceAreaLabel = deliveryZone?.address
    ? deliveryZone.address.split(',').slice(0, 2).join(',').trim()
    : 'your area'

  return (
    <ServiceStatusContext.Provider
      value={{
        isEnabled:    config.enabled,
        message:      config.message,
        loading,
        bannerHeight,
        deliveryFee,
        deliveryZone,
        serviceAreaLabel,
        setBannerHeight,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </ServiceStatusContext.Provider>
  )
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext)
  if (context === undefined) throw new Error('useServiceStatus must be used within ServiceStatusProvider')
  return context
}
