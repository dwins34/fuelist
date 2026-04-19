import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/phone/verify-otp
 * UPDATED: Persists a phone number that has already been verified 
 * by the client (via Firebase Auth).
 *
 * Body: { phone: string }
 *   phone — the verified phone number (e.g. "+919876543210")
 */
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // ── 1. Get authenticated user ─────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // User not logged in — return success so client can use it in session
      return NextResponse.json({ success: true, phone, persisted: false })
    }

    // ── 2. Persist verified phone to users table ──────────────────────────────
    const { error: dbErr } = await supabase
      .from('users')
      .update({ phone: phone })
      .eq('id', user.id)

    if (dbErr) {
      console.error('verify-otp sync: db update failed', dbErr)
      return NextResponse.json({ error: 'Phone verified but failed to save. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, phone, persisted: true })
  } catch (err) {
    console.error('verify-otp route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
