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
    const { error: dbErr, count } = await supabaseAdmin
      .from('users')
      .update({ phone })
      .eq('id', user.id)
      .select('id', { count: 'exact', head: true })

    if (dbErr) {
      console.error('verify-otp db error:', dbErr)
      return NextResponse.json({ error: 'Failed to save phone number.' }, { status: 500 })
    }

    if (count === 0) {
      console.error('verify-otp: no row updated for user', user.id)
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, phone, persisted: true })
  } catch (err) {
    console.error('verify-otp route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
