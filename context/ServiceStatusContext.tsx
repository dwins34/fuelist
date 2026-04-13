'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ServiceConfig {
  enabled: boolean
  message: string
}

interface ServiceStatusContextType {
  isEnabled: boolean
  message: string
  loading: boolean
  refreshStatus: () => Promise<void>
}

const ServiceStatusContext = createContext<ServiceStatusContextType | undefined>(undefined)

export function ServiceStatusProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ServiceConfig>({ enabled: true, message: 'Currently out of service' })
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch (err) {
      console.error('Failed to fetch service status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <ServiceStatusContext.Provider
      value={{
        isEnabled: config.enabled,
        message: config.message,
        loading,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </ServiceStatusContext.Provider>
  )
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext)
  if (context === undefined) {
    throw new Error('useServiceStatus must be used within a ServiceStatusProvider')
  }
  return context
}
