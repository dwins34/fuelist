import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/razorpay/webhook
 *
 * Handles Razorpay payment events:
 *   - payment.captured  → mark order/subscription as paid
 *   - refund.processed  → mark order as refunded, insert into refunds table
 *   - refund.failed     → mark refund as failed
 *
 * Configure in Razorpay Dashboard → Webhooks → add this URL.
 * Webhook secret must be set in RAZORPAY_WEBHOOK_SECRET env var.
 */
export async function POST(req: NextRequest) {
  // ── 1. Verify Razorpay webhook signature ───────────────────────────────────
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (secret) {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSig !== signature) {
      console.warn('Razorpay webhook: signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventId   = payload?.id
  const eventType = payload?.event

  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'Missing event fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── 2. Idempotency check — skip duplicate webhook deliveries ───────────────
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // ── 3. Record the event (idempotency key) ──────────────────────────────────
  await supabase.from('webhook_events').insert({ id: eventId, event_type: eventType })

  // ── 4. Handle events ───────────────────────────────────────────────────────
  try {
    switch (eventType) {
      case 'payment.captured': {
        const payment    = payload.payload?.payment?.entity
        const razorpayId = payment?.order_id   // Razorpay order ID

        if (!razorpayId) break

        // Update orders table
        await supabase
          .from('orders')
          .update({ payment_status: 'paid', status: 'confirmed' })
          .eq('razorpay_order_id', razorpayId)

        // Update subscriptions table
        await supabase
          .from('subscriptions')
          .update({ payment_status: 'paid', status: 'active' })
          .eq('razorpay_order_id', razorpayId)

        break
      }

      case 'refund.processed': {
        const refund         = payload.payload?.refund?.entity
        const razorpayRefId  = refund?.id
        const razorpayPayId  = refund?.payment_id
        const amountPaise    = refund?.amount ?? 0
        const amountRupees   = amountPaise / 100

        if (!razorpayRefId || !razorpayPayId) break

        // Find the order by payment_id
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_id', razorpayPayId)
          .maybeSingle()

        if (order) {
          await Promise.all([
            // Mark order as refunded
            supabase
              .from('orders')
              .update({ status: 'refunded' })
              .eq('id', order.id),

            // Upsert refund record
            supabase.from('refunds').upsert({
              order_id:           order.id,
              razorpay_refund_id: razorpayRefId,
              razorpay_payment_id: razorpayPayId,
              amount:             amountRupees,
              status:             'processed',
            }, { onConflict: 'razorpay_refund_id' }),
          ])
          break
        }

        // Try subscriptions
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('payment_id', razorpayPayId)
          .maybeSingle()

        if (sub) {
          await supabase.from('refunds').upsert({
            subscription_id:     sub.id,
            razorpay_refund_id:  razorpayRefId,
            razorpay_payment_id: razorpayPayId,
            amount:              amountRupees,
            status:              'processed',
          }, { onConflict: 'razorpay_refund_id' })
        }

        break
      }

      case 'refund.failed': {
        const refund = payload.payload?.refund?.entity
        if (!refund?.id) break

        await supabase
          .from('refunds')
          .update({ status: 'failed' })
          .eq('razorpay_refund_id', refund.id)

        break
      }

      default:
        // Unhandled event — still 200 so Razorpay doesn't retry
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Return 200 anyway — log the error but don't cause Razorpay to retry
    // (retries would re-insert duplicate events which we handle above)
    return NextResponse.json({ ok: true, warning: 'Processing error logged' })
  }
}
