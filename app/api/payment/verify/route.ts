import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { Coupon } from '@/types'
import { getTodayStrIST } from '@/lib/utils'

const POINTS_PER_RUPEE    = 1 / 100  // ₹100 = 1 point
const MAX_REDEEM_FRACTION = 0.5      // max 50% of order value redeemable

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      total_amount,
      address,
      coupon_code,
      reward_points_to_use,
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

    // ── 5. Server-side coupon re-validation ──────────────────────────────────
    let resolvedCouponId: string | null = null
    let discountAmount = 0

    if (coupon_code && user) {
      const { data: couponRow } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', String(coupon_code).toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle()

      if (couponRow) {
        const c = couponRow as Coupon
        const expired       = c.expiry_date && new Date(c.expiry_date) < new Date()
        const globalExceeded = c.usage_limit !== null && c.used_count >= c.usage_limit

        if (!expired && !globalExceeded) {
          const { count: userUsage } = await supabase
            .from('coupon_usage')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', c.id)
            .eq('user_id', user.id)

          let firstOrderOk = true
          if (c.is_first_order_only) {
            const { count: prevOrders } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('payment_status', 'paid')
            firstOrderOk = (prevOrders ?? 0) === 0
          }

          if ((userUsage ?? 0) < c.per_user_limit && firstOrderOk) {
            resolvedCouponId = c.id
            const base = Number(total_amount)
            if (c.discount_type === 'flat') {
              discountAmount = c.discount_value
            } else {
              discountAmount = (base * c.discount_value) / 100
              if (c.max_discount !== null) discountAmount = Math.min(discountAmount, c.max_discount)
            }
            discountAmount = Math.min(Math.floor(discountAmount * 100) / 100, base)
          }
        }
      }
    }

    // ── 6. Server-side reward points re-validation ────────────────────────────
    let resolvedPointsUsed = 0

    if (reward_points_to_use && user && Number(reward_points_to_use) > 0) {
      const { data: userRow } = await supabase
        .from('users').select('reward_points').eq('id', user.id).single()

      const available      = (userRow?.reward_points as number) ?? 0
      const requested      = Math.floor(Number(reward_points_to_use))
      const base           = Number(total_amount)
      const maxByFraction  = Math.floor(base * MAX_REDEEM_FRACTION)

      resolvedPointsUsed = Math.min(requested, available, maxByFraction)
    }

    // ── 7. Compute earned points on final paid amount ─────────────────────────
    const baseAmount    = Number(total_amount)
    const finalAmount   = Math.max(0, baseAmount - discountAmount - resolvedPointsUsed)
    const earnedPoints  = Math.floor(finalAmount * POINTS_PER_RUPEE)

    // ── 8. Insert order ───────────────────────────────────────────────────────
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id:               user?.id ?? null,
        items:                 items ?? [],
        total_amount:          baseAmount,
        payment_status:        'paid',
        payment_id:            razorpay_payment_id,
        razorpay_order_id,
        address:               address ?? null,
        coupon_id:             resolvedCouponId,
        discount_amount:       discountAmount,
        reward_points_used:    resolvedPointsUsed,
        reward_points_earned:  earnedPoints,
      })
      .select('id')
      .single()
    
    if (insertError) {
      console.error('Order insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
    }

    const orderId = order.id

    // ── 8b. Add to delivery_log for real-time visibility ───────────────────────
    void Promise.resolve(
      supabase.from('delivery_log').insert({
        order_id:      orderId,
        user_id:       user?.id ?? null,
        delivery_date: getTodayStrIST(),
        delivery_slot: 'afternoon', // Default for one-time orders
        status:        'new',
        items:         items?.map((i: any) => ({ item: i, quantity: i.quantity || 1 })) || [],
        total_amount:  baseAmount,
        address:       address ?? null,
      })
    ).catch(err => console.error('Failed to create initial delivery_log entry:', err))

    // ── 9. Post-order side effects (non-blocking) ─────────────────────────────
    if (user) {
      // 9a. Record coupon usage + increment used_count
      if (resolvedCouponId) {
        const couponId = resolvedCouponId
        void Promise.resolve(
          supabase.from('coupon_usage').insert({ coupon_id: couponId, user_id: user.id, order_id: orderId })
        ).catch(console.error)

        // Safe increment: read then write
        void (async () => {
          const { data } = await supabase.from('coupons').select('used_count').eq('id', couponId).single()
          await supabase.from('coupons')
            .update({ used_count: ((data?.used_count as number) ?? 0) + 1 })
            .eq('id', couponId)
        })().catch(console.error)
      }

      // 9b. Deduct redeemed points
      if (resolvedPointsUsed > 0) {
        const { data: u } = await supabase.from('users').select('reward_points').eq('id', user.id).single()
        const after = Math.max(0, ((u?.reward_points as number) ?? 0) - resolvedPointsUsed)
        await supabase.from('users').update({ reward_points: after }).eq('id', user.id)
        void Promise.resolve(
          supabase.from('user_rewards_log').insert({
            user_id: user.id, type: 'order_redeem',
            points_change: -resolvedPointsUsed,
            description: `Redeemed on order ${orderId}`, order_id: orderId,
          })
        ).catch(console.error)
      }

      // 9c. Credit earned points
      if (earnedPoints > 0) {
        const { data: u } = await supabase.from('users').select('reward_points').eq('id', user.id).single()
        const after = ((u?.reward_points as number) ?? 0) + earnedPoints
        await supabase.from('users').update({ reward_points: after }).eq('id', user.id)
        void Promise.resolve(
          supabase.from('user_rewards_log').insert({
            user_id: user.id, type: 'order_earn',
            points_change: earnedPoints,
            description: `Earned from order ${orderId}`, order_id: orderId,
          })
        ).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      order_id:             orderId,
      discount_amount:      discountAmount,
      reward_points_used:   resolvedPointsUsed,
      reward_points_earned: earnedPoints,
    })
  } catch (err) {
    console.error('verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
