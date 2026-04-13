import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json()

    // 1. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // 2. Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET!
    const body   = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.warn('Razorpay signature mismatch for subscription — possible tamper attempt')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // 3. Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 4. Update subscriptions
    const { data, error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        status:         'active',
        payment_status: 'paid',
        payment_id:     razorpay_payment_id,
      })
      .eq('user_id', user.id)
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending_payment')
      .select()

    if (updateErr) {
      console.error('Subscription verification update error:', updateErr)
      return NextResponse.json({ error: 'Failed to activate subscriptions' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // Maybe already processed or mismatch
      return NextResponse.json({ success: true, message: 'Already activated or no matching pending subscriptions' })
    }

    return NextResponse.json({
      success: true,
      count:   data.length,
      subscriptions: data,
    })
  } catch (err) {
    console.error('subscription verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
