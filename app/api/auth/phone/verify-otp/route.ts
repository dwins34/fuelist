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

    // 1. Try updating phone on the existing row (safe — touches only phone)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ phone })
      .eq('id', user.id)
      .select('id')

    if (updateErr) {
      console.error('verify-otp update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save phone number.' }, { status: 500 })
    }

    // 2. Row didn't exist yet — insert with safe defaults
    if (!updated || updated.length === 0) {
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

      // 23505 = unique_violation: row was created by a concurrent request — not an error
      if (insertErr && insertErr.code !== '23505') {
        console.error('verify-otp insert error:', insertErr)
        return NextResponse.json({ error: 'Failed to save phone number.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, phone, persisted: true })
  } catch (err) {
    console.error('verify-otp route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
