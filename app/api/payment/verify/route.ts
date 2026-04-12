import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      total_amount,
      address,
    } = await req.json()

    // ── 1. Validate required fields ───────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // ── 2. Verify Razorpay signature (HMAC-SHA256) ────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET!
    const body   = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.warn('Razorpay signature mismatch — possible tamper attempt')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // ── 3. Get authenticated user (optional — guest orders allowed) ───────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ── 4. Prevent duplicate payments: check if this payment_id already exists ─
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('payment_id', razorpay_payment_id)
      .maybeSingle()

    if (existing) {
      // Already processed — return success idempotently
      return NextResponse.json({ success: true, order_id: existing.id })
    }

    // ── 5. Insert order into DB ───────────────────────────────────────────────
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id:        user?.id ?? null,
        items:          items ?? [],
        total_amount:   total_amount ?? 0,
        payment_status: 'paid',
        payment_id:     razorpay_payment_id,
        razorpay_order_id,
        address:        address ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Order insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order_id: order.id })
  } catch (err) {
    console.error('verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
