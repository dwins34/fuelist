import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const DURATION_DISCOUNT: Record<number, number> = { 7: 0, 14: 0.05, 30: 0.10 }

// ── GET — list current user's subscriptions ───────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      menu_items (id, name, image_url, price, category)
    `)
    .eq('user_id', user.id)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscriptions: data })
}

// ── POST — create subscriptions for one or more items ────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // ── Check service status ──────────────────────────────────────────────
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      menu_item_ids,   // array  (new multi-item flow)
      menu_item_id,    // string (legacy single-item fallback)
      delivery_slot,
      frequency,
      duration_days,
      address,
    } = body

    // Normalise: accept both array and single id
    const itemIds: string[] = Array.isArray(menu_item_ids)
      ? menu_item_ids
      : menu_item_id ? [menu_item_id] : []

    if (itemIds.length === 0 || !delivery_slot || !frequency || !duration_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validSlots = ['morning', 'afternoon', 'evening']
    const validFreqs = ['daily', 'weekdays', 'weekends']
    const validDurations = [7, 14, 30]

    if (!validSlots.includes(delivery_slot))
      return NextResponse.json({ error: 'Invalid delivery_slot' }, { status: 400 })
    if (!validFreqs.includes(frequency))
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
    if (!validDurations.includes(Number(duration_days)))
      return NextResponse.json({ error: 'Invalid duration_days (7, 14 or 30)' }, { status: 400 })

    // Fetch all requested items in one query
    const { data: items, error: itemsErr } = await supabase
      .from('menu_items')
      .select('id, price, is_available')
      .in('id', itemIds)

    if (itemsErr || !items || items.length === 0) {
      return NextResponse.json({ error: 'No valid menu items found' }, { status: 404 })
    }

    const unavailable = items.filter((i) => !i.is_available)
    if (unavailable.length > 0) {
      return NextResponse.json({ error: 'One or more selected items are currently unavailable' }, { status: 400 })
    }

    // Compute schedule precisely
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const durationDaysNum = Number(duration_days)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + durationDaysNum)

    // Accurate delivery count (matching refund logic)
    let totalDeliveries = 0
    const current = new Date(startDate)
    while (current < endDate) {
      const day = current.getDay()
      let isDue = false
      if (frequency === 'daily') isDue = true
      else if (frequency === 'weekdays') isDue = day >= 1 && day <= 5
      else if (frequency === 'weekends') isDue = day === 0 || day === 6
      
      if (isDue) totalDeliveries++
      current.setDate(current.getDate() + 1)
    }

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // Check for duplicate active subscriptions on the same slot
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('menu_item_id')
      .eq('user_id', user.id)
      .eq('delivery_slot', delivery_slot)
      .eq('status', 'active')
      .in('menu_item_id', itemIds)

    const alreadySubscribed = new Set((existingSubs ?? []).map((s) => s.menu_item_id as string))
    const newItemIds = itemIds.filter((id) => !alreadySubscribed.has(id))

    if (newItemIds.length === 0) {
      return NextResponse.json({
        error: 'You already have active subscriptions for all selected items at this time slot',
      }, { status: 409 })
    }

    // Calculate discount
    const discountRate = DURATION_DISCOUNT[durationDaysNum] || 0

    // Calculate total price across all items
    let totalOrderAmount = 0
    const rows = items
      .filter((i) => newItemIds.includes(i.id))
      .map((item) => {
        const basePrice = (item.price as number) * totalDeliveries
        const discountedPrice = Math.floor(basePrice * (1 - discountRate))
        totalOrderAmount += discountedPrice

        return {
          user_id: user.id,
          menu_item_id: item.id,
          delivery_slot,
          frequency,
          duration_days: durationDaysNum,
          start_date: startStr,
          end_date: endStr,
          status: 'pending_payment',
          payment_status: 'pending_payment',
          price_per_delivery: item.price as number,
          total_price: discountedPrice,
          address: address ?? null,
        }
      })

    // Create Razorpay order
    let razorpayOrder
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalOrderAmount * 100), // paise
        currency: 'INR',
        receipt: `sub_${Date.now()}`,
      })
    } catch (err) {
      console.error('Razorpay order creation failed:', err)
      return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
    }

    // Add razorpay_order_id to rows
    const finalRows = rows.map(r => ({ ...r, razorpay_order_id: razorpayOrder.id }))

    const { data: created, error: insertErr } = await supabase
      .from('subscriptions')
      .insert(finalRows)
      .select()

    if (insertErr) {
      console.error('subscription insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create subscriptions' }, { status: 500 })
    }

    return NextResponse.json({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      subscriptions: created,
    }, { status: 201 })
  } catch (err) {
    console.error('subscription create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
