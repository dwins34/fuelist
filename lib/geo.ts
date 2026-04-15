/**
 * lib/geo.ts — Geospatial utilities for Fuelist delivery radius system.
 *
 * Designed for:
 *  - Haversine distance between two coordinates
 *  - Delivery eligibility check against admin-configured zone
 *  - Future: multiple hubs (nearest hub routing), distance-based pricing
 */

export interface LatLng {
  lat: number
  lng: number
}

export interface DeliveryZone {
  lat: number
  lng: number
  radius_km: number
  address: string
}

export interface DeliveryCheckResult {
  eligible: boolean
  distanceKm: number | null   // null when coordinates unavailable
  radiusKm: number
  reason: 'within_radius' | 'outside_radius' | 'no_user_coords' | 'no_zone_configured' | 'fallback_pincode'
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine Formula
// Calculates the great-circle distance between two points on Earth (in km).
// Accurate to within ~0.3% for distances under 500 km.
// ─────────────────────────────────────────────────────────────────────────────
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371 // Earth's mean radius in km

  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng

  return R * 2 * Math.asin(Math.sqrt(h))
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// ─────────────────────────────────────────────────────────────────────────────
// Core eligibility check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns whether a user coordinate falls within the delivery zone.
 * Returns a structured result so callers can show accurate UI feedback.
 *
 * @param userCoords  - User's latitude/longitude (from GPS or Places API)
 * @param zone        - Admin-configured hub location + radius
 */
export function isWithinDeliveryRadius(
  userCoords: LatLng | null | undefined,
  zone: DeliveryZone | null | undefined,
): DeliveryCheckResult {
  if (!zone) {
    // Admin hasn't configured a zone yet — fall through to pincode check
    return { eligible: false, distanceKm: null, radiusKm: 0, reason: 'no_zone_configured' }
  }

  if (!userCoords || !isValidCoord(userCoords)) {
    return { eligible: false, distanceKm: null, radiusKm: zone.radius_km, reason: 'no_user_coords' }
  }

  const distanceKm = haversineDistanceKm(
    { lat: zone.lat, lng: zone.lng },
    userCoords,
  )

  const eligible = distanceKm <= zone.radius_km

  return {
    eligible,
    distanceKm: Math.round(distanceKm * 10) / 10,   // 1 decimal place
    radiusKm: zone.radius_km,
    reason: eligible ? 'within_radius' : 'outside_radius',
  }
}

/**
 * Future-ready: finds the nearest hub from a list and checks eligibility.
 * Returns the best (nearest) result.
 */
export function isWithinAnyDeliveryHub(
  userCoords: LatLng | null | undefined,
  zones: DeliveryZone[],
): DeliveryCheckResult & { nearestHub?: DeliveryZone } {
  if (!zones.length) {
    return { eligible: false, distanceKm: null, radiusKm: 0, reason: 'no_zone_configured' }
  }

  if (!userCoords || !isValidCoord(userCoords)) {
    return { eligible: false, distanceKm: null, radiusKm: zones[0].radius_km, reason: 'no_user_coords' }
  }

  let best: (DeliveryCheckResult & { nearestHub: DeliveryZone }) | null = null

  for (const zone of zones) {
    const result = isWithinDeliveryRadius(userCoords, zone)
    if (!best || (result.distanceKm ?? Infinity) < (best.distanceKm ?? Infinity)) {
      best = { ...result, nearestHub: zone }
    }
    if (result.eligible) break   // short-circuit on first eligible hub
  }

  return best!
}

// ─────────────────────────────────────────────────────────────────────────────
// Distance-based delivery fee tier (for future dynamic pricing)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryTier {
  maxKm: number     // up to this distance
  fee: number       // fee in ₹
}

/**
 * Returns the applicable delivery fee for a given distance.
 * Tiers must be sorted by maxKm ascending.
 *
 * Example usage (admin-configurable in future):
 *   const tiers = [{ maxKm: 3, fee: 0 }, { maxKm: 7, fee: 25 }, { maxKm: 15, fee: 45 }]
 *   getTieredDeliveryFee(2.4, tiers) → 0
 *   getTieredDeliveryFee(5.1, tiers) → 25
 */
export function getTieredDeliveryFee(distanceKm: number, tiers: DeliveryTier[]): number | null {
  for (const tier of tiers) {
    if (distanceKm <= tier.maxKm) return tier.fee
  }
  return null   // beyond all tiers — ineligible
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isValidCoord(c: LatLng): boolean {
  return (
    typeof c.lat === 'number' &&
    typeof c.lng === 'number' &&
    !isNaN(c.lat) &&
    !isNaN(c.lng) &&
    c.lat >= -90 && c.lat <= 90 &&
    c.lng >= -180 && c.lng <= 180 &&
    // Reject (0,0) — common placeholder for "no coords"
    !(c.lat === 0 && c.lng === 0)
  )
}
