import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Coupon } from '@/types'
import { getTodayStrIST } from '@/lib/utils'

const POINTS_PER_RUPEE    = 1 / 100
const MAX_REDEEM_FRACTION = 0.5

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      total_amount,
      delivery_fee: clientDeliveryFee,
      address,
      coupon_code,
      reward_points_to_use,
      is_free_order,
    } = await req.json()

    // ── 1. Validate required fields ───────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // ── 2. Verify Razorpay signature (skip for free orders) ──────────────────
    if (!is_free_order) {
      const secret = process.env.RAZORPAY_KEY_SECRET!
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expectedSignature !== razorpay_signature) {
        console.warn('Razorpay signature mismatch — possible tamper attempt')
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
      }
    }

    // ── 3. Get authenticated user ─────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ── 4. Idempotency: check if already processed ────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('payment_id', razorpay_payment_id)
      .neq('payment_status', 'pending_payment')
      .maybeSingle()

    if (existing) {
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
        const expired        = c.expiry_date && new Date(c.expiry_date) < new Date()
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
            discountAmount = c.discount_type === 'flat'
              ? c.discount_value
              : Math.min((base * c.discount_value) / 100, c.max_discount ?? Infinity)
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
      const available     = (userRow?.reward_points as number) ?? 0
      const requested     = Math.floor(Number(reward_points_to_use))
      const base          = Number(total_amount)
      resolvedPointsUsed  = Math.min(requested, available, Math.floor(base * MAX_REDEEM_FRACTION))
    }

    // ── 7. Fetch delivery fee (server-authoritative) ──────────────────────────
    let deliveryFee = 0
    try {
      const { data: feeRow } = await supabase
        .from('app_config').select('value').eq('key', 'delivery_fee').maybeSingle()
      const dbFee = (feeRow?.value as any)?.fee
      deliveryFee = typeof dbFee === 'number' ? Math.max(0, dbFee) : 0
    } catch { /* use 0 */ }

    // ── 8. Compute final amounts ──────────────────────────────────────────────
    const baseAmount   = Number(total_amount)
    const finalAmount  = Math.max(0, baseAmount - discountAmount - resolvedPointsUsed) + deliveryFee
    const earnedPoints = Math.floor(finalAmount * POINTS_PER_RUPEE)

    const itemList  = Array.isArray(items) ? items : []
    const itemCount = itemList.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
    const { count: activeOrders } = await supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .in('order_status', ['new', 'preparing'])
    const estimatedPrepTime = Math.max(5, itemCount * 5 + Math.floor((activeOrders ?? 0) / 2))

    // ── 9. Upsert order — update pending if exists, otherwise insert ──────────
    const orderFields = {
      user_id:              user?.id ?? null,
      items:                itemList,
      total_amount:         finalAmount,
      delivery_fee:         deliveryFee,
      payment_status:       is_free_order ? 'free' : 'paid',
      payment_id:           is_free_order ? null : razorpay_payment_id,
      razorpay_order_id,
      address:              address ?? null,
      coupon_id:            resolvedCouponId,
      discount_amount:      discountAmount,
      reward_points_used:   resolvedPointsUsed,
      reward_points_earned: earnedPoints,
      estimated_prep_time:  estimatedPrepTime,
      order_status:         'new',
    }

    // Try updating the pending record created by create-order
    const { data: updated } = await supabaseAdmin
      .from('orders')
      .update(orderFields)
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('payment_status', 'pending_payment')
      .select('id')
      .maybeSingle()

    let orderId: string

    if (updated?.id) {
      orderId = updated.id
    } else {
      // No pending record (free order or create-order didn't persist) — insert fresh
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert(orderFields)
        .select('id')
        .single()

      if (insertError) {
        console.error('Order insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
      }
      orderId = inserted.id
    }

    // ── 10. Add to delivery_log ────────────────────────────────────────────────
    void supabaseAdmin.from('delivery_log').upsert({
      order_id:      orderId,
      user_id:       user?.id ?? null,
      delivery_date: getTodayStrIST(),
      delivery_slot: 'afternoon',
      status:        'new',
      items:         itemList.map((i: any) => ({ item: i, quantity: i.quantity || 1 })),
      total_amount:  baseAmount,
      address:       address ?? null,
    }, { onConflict: 'order_id', ignoreDuplicates: true })
      .then(({ error }) => { if (error) console.error('delivery_log upsert error:', error.message) })

    // ── 11. Post-order side effects (non-blocking) ────────────────────────────
    if (user) {
      if (resolvedCouponId) {
        const couponId = resolvedCouponId
        void supabaseAdmin.from('coupon_usage')
          .insert({ coupon_id: couponId, user_id: user.id, order_id: orderId })
          .then(({ error }) => { if (error) console.error('coupon_usage insert:', error.message) })

        // Atomic increment via RPC if available, else read-modify-write
        void supabaseAdmin.rpc('increment_coupon_used_count', { coupon_id_param: couponId })
          .then(({ error }) => {
            if (error) {
              // Fallback
              return supabaseAdmin.from('coupons').select('used_count').eq('id', couponId).single()
                .then(({ data }) => supabaseAdmin.from('coupons')
                  .update({ used_count: ((data?.used_count as number) ?? 0) + 1 })
                  .eq('id', couponId))
            }
          })
      }

      if (resolvedPointsUsed > 0) {
        const { data: u } = await supabaseAdmin.from('users').select('reward_points').eq('id', user.id).single()
        const after = Math.max(0, ((u?.reward_points as number) ?? 0) - resolvedPointsUsed)
        await supabaseAdmin.from('users').update({ reward_points: after }).eq('id', user.id)
        void supabaseAdmin.from('user_rewards_log').insert({
          user_id: user.id, type: 'order_redeem',
          points_change: -resolvedPointsUsed,
          description: `Redeemed on order ${orderId}`, order_id: orderId,
        })
      }

      if (earnedPoints > 0) {
        const { data: u } = await supabaseAdmin.from('users').select('reward_points').eq('id', user.id).single()
        const after = ((u?.reward_points as number) ?? 0) + earnedPoints
        await supabaseAdmin.from('users').update({ reward_points: after }).eq('id', user.id)
        void supabaseAdmin.from('user_rewards_log').insert({
          user_id: user.id, type: 'order_earn',
          points_change: earnedPoints,
          description: `Earned from order ${orderId}`, order_id: orderId,
        })
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
