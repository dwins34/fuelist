'use client'

/**
 * useDeliveryCheck — React hook that encapsulates delivery eligibility logic.
 *
 * Reads the admin zone from ServiceStatusContext (already fetched globally),
 * so there are zero extra network calls at checkout time.
 *
 * Usage:
 *   const { check, result, checking } = useDeliveryCheck()
 *   await check({ lat, lng })         → DeliveryCheckResult
 */

import { useState, useCallback } from 'react'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import {
  isWithinDeliveryRadius,
  isValidCoord,
  DeliveryCheckResult,
  LatLng,
} from '@/lib/geo'
import { isInServiceArea } from '@/lib/serviceArea'

export type { DeliveryCheckResult }

export function useDeliveryCheck() {
  const { deliveryZone } = useServiceStatus()
  const [result, setResult] = useState<DeliveryCheckResult | null>(null)
  const [checking, setChecking] = useState(false)

  /**
   * Run eligibility check for a user coordinate.
   *
   * Falls back to pincode check when:
   *  1. Admin hasn't configured a zone yet, OR
   *  2. User coordinates are unavailable
   *
   * @param coords  - { lat, lng } from Places API or device GPS
   * @param pincode - Fallback pincode string (from address form)
   */
  const check = useCallback(
    async (coords: LatLng | null, pincode?: string): Promise<DeliveryCheckResult> => {
      setChecking(true)

      try {
        // ── Primary: coordinate-based radius check ────────────────────────────
        if (deliveryZone && coords && isValidCoord(coords)) {
          const r = isWithinDeliveryRadius(coords, deliveryZone)
          setResult(r)
          return r
        }

        // ── Zone configured but no coords: require location picker ────────────
        // Don't fall back to pincode when a zone is set — the pincode list is
        // too coarse and lets addresses far outside the zone slip through.
        if (deliveryZone && (!coords || !isValidCoord(coords))) {
          const r: DeliveryCheckResult = {
            eligible: false,
            distanceKm: null,
            radiusKm: deliveryZone.radius_km,
            reason: 'no_user_coords',
          }
          setResult(r)
          return r
        }


        // ── No data to check ──────────────────────────────────────────────────
        const r: DeliveryCheckResult = {
          eligible: false,
          distanceKm: null,
          radiusKm: deliveryZone?.radius_km ?? 0,
          reason: deliveryZone ? 'no_user_coords' : 'no_zone_configured',
        }
        setResult(r)
        return r
      } finally {
        setChecking(false)
      }
    },
    [deliveryZone],
  )

  /** Reset result (e.g. when user changes address) */
  const reset = useCallback(() => setResult(null), [])

  return { check, result, checking, reset }
}
