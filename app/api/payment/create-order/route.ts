import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    // Check service status
    const { data: config } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'service_status')
      .single()

    if (config?.value && !config.value.enabled) {
      return NextResponse.json({ 
        error: config.value.message || 'Service is currently unavailable' 
      }, { status: 403 })
    }

    const { amount } = await req.json()

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // amount must be in paise (INR × 100)
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    })

    return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
