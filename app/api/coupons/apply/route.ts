import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Coupon } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { code, order_amount } = await req.json() as { code: string; order_amount: number }

    if (!code || typeof order_amount !== 'number') {
      return NextResponse.json({ valid: false, error: 'Missing code or order_amount', discount_amount: 0 }, { status: 400 })
    }

    const supabase = await createClient()

    // ── 1. Get authenticated user ─────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()

    // ── 2. Fetch coupon ───────────────────────────────────────────────────────
    const { data: coupon, error: couponErr } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    if (couponErr || !coupon) {
      return NextResponse.json({ valid: false, error: 'Coupon not found or inactive', discount_amount: 0 })
    }

    const c = coupon as Coupon

    // ── 3. Check expiry ───────────────────────────────────────────────────────
    if (c.expiry_date && new Date(c.expiry_date) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired', discount_amount: 0 })
    }

    // ── 4. Check global usage limit ───────────────────────────────────────────
    if (c.usage_limit !== null && c.used_count >= c.usage_limit) {
      return NextResponse.json({ valid: false, error: 'Coupon usage limit reached', discount_amount: 0 })
    }

    // ── 5. Check minimum order amount ─────────────────────────────────────────
    if (order_amount < c.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₹${c.min_order_amount} required for this coupon`,
        discount_amount: 0,
      })
    }

    // ── 6. User-specific checks (requires auth) ───────────────────────────────
    if (user) {
      // Check if coupon is restricted to specific users
      if (c.applicable_user_ids && c.applicable_user_ids.length > 0) {
        if (!c.applicable_user_ids.includes(user.id)) {
          return NextResponse.json({ valid: false, error: 'This coupon is not applicable to your account', discount_amount: 0 })
        }
      }

      // Check per-user usage limit
      const { count: userUsageCount } = await supabase
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', c.id)
        .eq('user_id', user.id)

      if ((userUsageCount ?? 0) >= c.per_user_limit) {
        return NextResponse.json({ valid: false, error: 'You have already used this coupon', discount_amount: 0 })
      }

      // Check first-order-only restriction
      if (c.is_first_order_only) {
        const { count: orderCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('payment_status', 'paid')

        if ((orderCount ?? 0) > 0) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is only valid for your first order',
            discount_amount: 0,
          })
        }
      }
    } else {
      // Guest user — block first-order-only and user-restricted coupons
      if (c.is_first_order_only) {
        return NextResponse.json({ valid: false, error: 'Please sign in to use this coupon', discount_amount: 0 })
      }
      if (c.applicable_user_ids && c.applicable_user_ids.length > 0) {
        return NextResponse.json({ valid: false, error: 'Please sign in to use this coupon', discount_amount: 0 })
      }
    }

    // ── 7. Calculate discount ─────────────────────────────────────────────────
    let discount_amount: number
    if (c.discount_type === 'flat') {
      discount_amount = c.discount_value
    } else {
      discount_amount = (order_amount * c.discount_value) / 100
      if (c.max_discount !== null) {
        discount_amount = Math.min(discount_amount, c.max_discount)
      }
    }
    // Discount cannot exceed order amount
    discount_amount = Math.min(discount_amount, order_amount)
    discount_amount = Math.floor(discount_amount * 100) / 100  // round to 2dp

    return NextResponse.json({
      valid: true,
      coupon: c,
      discount_amount,
      is_first_order: c.is_first_order_only,
    })
  } catch (err) {
    console.error('apply-coupon error:', err)
    return NextResponse.json({ valid: false, error: 'Internal server error', discount_amount: 0 }, { status: 500 })
  }
}
