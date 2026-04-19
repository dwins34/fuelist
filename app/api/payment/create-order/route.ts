import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Razorpay from 'razorpay'
import { getTodayStrIST } from '@/lib/utils'

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

    const body = await req.json()
    const { amount, items, address, coupon_code, reward_points_to_use, delivery_fee } = body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get authenticated user (optional — guest orders allowed)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch delivery fee server-side (authoritative)
    let deliveryFee = 0
    try {
      const { data: feeRow } = await supabaseAdmin
        .from('app_config').select('value').eq('key', 'delivery_fee').maybeSingle()
      const dbFee = (feeRow?.value as any)?.fee
      deliveryFee = typeof dbFee === 'number' ? Math.max(0, dbFee) : 0
    } catch { /* use 0 */ }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // paise
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    })

    // Estimate prep time
    const itemList  = Array.isArray(items) ? items : []
    const itemCount = itemList.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
    const { count: activeOrders } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('order_status', ['new', 'preparing'])
    const estimatedPrepTime = Math.max(5, itemCount * 5 + Math.floor((activeOrders ?? 0) / 2))

    // Save pending order to DB so the webhook can recover it if client verify fails
    const { data: pendingOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id:             user?.id ?? null,
        items:               itemList,
        total_amount:        amount,         // provisional; verify will correct this
        delivery_fee:        deliveryFee,
        payment_status:      'pending_payment',
        razorpay_order_id:   razorpayOrder.id,
        address:             address ?? null,
        estimated_prep_time: estimatedPrepTime,
        order_status:        'new',
        // Store cart context for webhook recovery
        coupon_code_hint:    coupon_code ?? null,
        reward_points_hint:  reward_points_to_use ?? 0,
      })
      .select('id')
      .single()

    if (insertError) {
      // Non-fatal: proceed without pending record (verify will insert instead)
      console.error('create-order: pending insert failed:', insertError.message)
    }

    return NextResponse.json({
      order_id:        razorpayOrder.id,
      pending_order_id: pendingOrder?.id ?? null,
      amount:          razorpayOrder.amount,
      currency:        razorpayOrder.currency,
    })
  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
