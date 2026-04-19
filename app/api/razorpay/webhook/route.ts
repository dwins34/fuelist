import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTodayStrIST } from '@/lib/utils'

/**
 * POST /api/razorpay/webhook
 *
 * Safety net for all payment flows:
 *   - Normal orders:    activates pending_payment orders if client verify failed
 *   - Subscriptions:   activates pending_payment subscriptions + generates delivery_log
 *   - Refunds:         records refund, marks order/subscription as refunded
 *
 * Register this URL in Razorpay Dashboard → Webhooks.
 * Set RAZORPAY_WEBHOOK_SECRET env var to the webhook secret from Razorpay.
 *
 * Events to enable in Razorpay Dashboard:
 *   ✅ payment.captured
 *   ✅ refund.processed
 *   ✅ refund.failed
 */
export async function POST(req: NextRequest) {
  // ── 1. Verify webhook signature ───────────────────────────────────────────
  const rawBody  = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret   = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (expectedSig !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const eventId   = payload?.id
  const eventType = payload?.event
  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'Missing event fields' }, { status: 400 })
  }

  // ── 2. Idempotency — skip duplicates ──────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from('webhook_events').select('id').eq('id', eventId).maybeSingle()

  if (existing) return NextResponse.json({ ok: true, duplicate: true })

  await supabaseAdmin.from('webhook_events').insert({ id: eventId, event_type: eventType })

  // ── 3. Handle events ──────────────────────────────────────────────────────
  try {
    switch (eventType) {

      // ── payment.captured ────────────────────────────────────────────────────
      case 'payment.captured': {
        const payment      = payload.payload?.payment?.entity
        const razorpayOId  = payment?.order_id   // Razorpay order ID
        const razorpayPId  = payment?.id          // Razorpay payment ID
        const amountPaise  = payment?.amount ?? 0

        if (!razorpayOId) break

        // ── Orders: activate pending order (safety net when client verify failed)
        const { data: pendingOrder } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, items, address, total_amount')
          .eq('razorpay_order_id', razorpayOId)
          .eq('payment_status', 'pending_payment')
          .maybeSingle()

        if (pendingOrder) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'paid',
              payment_id:     razorpayPId,
              order_status:   'new',
            })
            .eq('id', pendingOrder.id)

          // Generate delivery_log entry
          const todayStr = getTodayStrIST()
          const items    = Array.isArray(pendingOrder.items) ? pendingOrder.items : []
          await supabaseAdmin.from('delivery_log').upsert({
            order_id:      pendingOrder.id,
            user_id:       pendingOrder.user_id,
            delivery_date: todayStr,
            delivery_slot: 'afternoon',
            status:        'new',
            items:         items.map((i: any) => ({ item: i, quantity: i.quantity || 1 })),
            total_amount:  amountPaise / 100,
            address:       pendingOrder.address,
          }, { onConflict: 'order_id', ignoreDuplicates: true })

          console.info(`[webhook] Recovered pending order ${pendingOrder.id} via payment.captured`)
        } else {
          // Order was already activated by client verify — just confirm payment_id
          await supabaseAdmin
            .from('orders')
            .update({ payment_id: razorpayPId, payment_status: 'paid' })
            .eq('razorpay_order_id', razorpayOId)
            .neq('payment_status', 'pending_payment')
        }

        // ── Subscriptions: activate pending subscriptions ─────────────────────
        const { data: pendingSubs } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, menu_item_id, delivery_slot, frequency, start_date, price_per_delivery, address')
          .eq('razorpay_order_id', razorpayOId)
          .eq('status', 'pending_payment')

        if (pendingSubs && pendingSubs.length > 0) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'active', payment_status: 'paid', payment_id: razorpayPId })
            .eq('razorpay_order_id', razorpayOId)
            .eq('status', 'pending_payment')

          // Generate delivery_log for today if start_date matches
          const todayStr  = getTodayStrIST()
          const dayOfWeek = new Date().getDay()

          const itemIds = pendingSubs.map(s => s.menu_item_id)
          const { data: menuItems } = await supabaseAdmin
            .from('menu_items').select('id, name, image_url, price').in('id', itemIds)
          const itemMap = Object.fromEntries((menuItems ?? []).map(i => [i.id, i]))

          const logs = pendingSubs.filter(sub => {
            if (sub.start_date !== todayStr) return false
            if (sub.frequency === 'daily')    return true
            if (sub.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
            if (sub.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6
            return false
          }).map(sub => ({
            subscription_id: sub.id,
            user_id:         sub.user_id,
            delivery_date:   todayStr,
            delivery_slot:   sub.delivery_slot,
            status:          'new',
            items:           [{ item: itemMap[sub.menu_item_id], quantity: 1 }],
            total_amount:    sub.price_per_delivery,
            address:         sub.address,
          }))

          if (logs.length > 0) {
            await supabaseAdmin.from('delivery_log').insert(logs)
          }

          console.info(`[webhook] Activated ${pendingSubs.length} subscription(s) via payment.captured`)
        }

        break
      }

      // ── refund.processed ────────────────────────────────────────────────────
      case 'refund.processed': {
        const refund        = payload.payload?.refund?.entity
        const razorpayRefId = refund?.id
        const razorpayPayId = refund?.payment_id
        const amountRupees  = (refund?.amount ?? 0) / 100

        if (!razorpayRefId || !razorpayPayId) break

        const { data: order } = await supabaseAdmin
          .from('orders').select('id').eq('payment_id', razorpayPayId).maybeSingle()

        if (order) {
          await Promise.all([
            supabaseAdmin.from('orders').update({ order_status: 'refunded', payment_status: 'refunded' }).eq('id', order.id),
            supabaseAdmin.from('refunds').upsert({
              order_id: order.id, razorpay_refund_id: razorpayRefId,
              razorpay_payment_id: razorpayPayId, amount: amountRupees, status: 'processed',
            }, { onConflict: 'razorpay_refund_id' }),
          ])
          break
        }

        const { data: sub } = await supabaseAdmin
          .from('subscriptions').select('id').eq('payment_id', razorpayPayId).maybeSingle()

        if (sub) {
          await Promise.all([
            supabaseAdmin.from('subscriptions').update({ status: 'cancelled', payment_status: 'refunded' }).eq('id', sub.id),
            supabaseAdmin.from('refunds').upsert({
              subscription_id: sub.id, razorpay_refund_id: razorpayRefId,
              razorpay_payment_id: razorpayPayId, amount: amountRupees, status: 'processed',
            }, { onConflict: 'razorpay_refund_id' }),
          ])
        }

        break
      }

      // ── refund.failed ───────────────────────────────────────────────────────
      case 'refund.failed': {
        const refund = payload.payload?.refund?.entity
        if (!refund?.id) break
        await supabaseAdmin.from('refunds').update({ status: 'failed' }).eq('razorpay_refund_id', refund.id)
        break
      }

      default:
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] Processing error:', err)
    return NextResponse.json({ ok: true, warning: 'Processing error logged' })
  }
}
