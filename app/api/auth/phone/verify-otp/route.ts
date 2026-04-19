import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ success: true, phone, persisted: false })

    // Use admin client — bypasses RLS so the update always lands
    const { error: dbErr, data: updated } = await supabaseAdmin
      .from('users')
      .update({ phone })
      .eq('id', user.id)
      .select('id')

    if (dbErr) {
      console.error('verify-otp db error:', dbErr)
      return NextResponse.json({ error: 'Failed to save phone number.' }, { status: 500 })
    }

    if (!updated || updated.length === 0) {
      // Profile row missing — auto-create it (trigger may not have fired)
      const { error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({
          id:            user.id,
          email:         user.email ?? '',
          name:          user.user_metadata?.full_name ?? user.user_metadata?.name ?? (user.email?.split('@')[0] ?? ''),
          role:          'user',
          phone,
          reward_points: 0,
        })
        .select('id')
      if (insertErr) {
        console.error('verify-otp: failed to auto-create profile', insertErr)
        return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
      }
    }

    return NextResponse.json({ success: true, phone, persisted: true })
  } catch (err) {
    console.error('verify-otp route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
