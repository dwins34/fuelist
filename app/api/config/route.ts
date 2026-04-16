import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/config
 * Publicly returns service_status + delivery_fee configs in one call.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['service_status', 'delivery_fee', 'delivery_zone'])

    if (error) throw error

    const byKey = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))

    return NextResponse.json({
      config:         byKey['service_status']  ?? { enabled: true, message: '' },
      delivery_fee:   byKey['delivery_fee']?.fee ?? 25,   // default ₹25
      delivery_zone:  byKey['delivery_zone'] ?? null,     // { lat, lng, radius_km, address }
    })
  } catch (err) {
    console.error('Config API GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
  }
}

/**
 * PATCH /api/config
 * Admin-only — updates service_status and/or delivery_fee.
 * Body: { enabled?, message?, delivery_fee?: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const upserts: { key: string; value: unknown; updated_at: string }[] = []
    const now = new Date().toISOString()

    // Service status update
    if (body.enabled !== undefined || body.message !== undefined) {
      // Read current first so we only change what was sent
      const { data: cur } = await supabaseAdmin
        .from('app_config').select('value').eq('key', 'service_status').single()
      const current = (cur?.value as any) ?? { enabled: true, message: '' }
      upserts.push({
        key: 'service_status',
        value: {
          enabled: body.enabled  ?? current.enabled,
          message: body.message  ?? current.message,
        },
        updated_at: now,
      })
    }

    // Delivery fee update
    if (body.delivery_fee !== undefined) {
      const fee = Math.max(0, Number(body.delivery_fee))
      upserts.push({ key: 'delivery_fee', value: { fee }, updated_at: now })
    }

    // Delivery zone update
    if (body.delivery_zone !== undefined) {
      const { lat, lng, radius_km, address: zoneAddress } = body.delivery_zone ?? {}
      if (
        typeof lat === 'number' && typeof lng === 'number' &&
        typeof radius_km === 'number' && radius_km > 0
      ) {
        upserts.push({
          key: 'delivery_zone',
          value: { lat, lng, radius_km, address: zoneAddress ?? '' },
          updated_at: now,
        })
      }
    }

    if (upserts.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('app_config')
      .upsert(upserts, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Config API PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
  }
}
