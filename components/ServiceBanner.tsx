'use client'

import { useEffect, useRef } from 'react'
import { useServiceStatus } from '@/context/ServiceStatusContext'

export default function ServiceBanner() {
  const { isEnabled, message, loading, setBannerHeight } = useServiceStatus()
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading || isEnabled || !bannerRef.current) {
      setBannerHeight(0)
      document.documentElement.style.setProperty('--banner-height', '0px')
      return
    }

    const banner = bannerRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        setBannerHeight(h)
        document.documentElement.style.setProperty('--banner-height', `${h}px`)
      }
    })

    observer.observe(banner)
    
    // Initial measure
    const initialHeight = banner.offsetHeight
    setBannerHeight(initialHeight)
    document.documentElement.style.setProperty('--banner-height', `${initialHeight}px`)

    return () => observer.disconnect()
  }, [loading, isEnabled, setBannerHeight])

  if (loading || isEnabled) return null

  return (
    <div 
      ref={bannerRef}
      className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-bold shadow-md sticky top-0 z-[100] animate-in fade-in slide-in-from-top duration-500"
    >
      <span className="mr-2">⚠️</span>
      {message}
    </div>
  )
}
