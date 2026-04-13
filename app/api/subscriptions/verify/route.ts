import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getTodayStrIST } from '@/lib/utils'

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

    // ── 5. Add to delivery_log if start_date is today ─────────────────────────
    try {
      const todayStr = getTodayStrIST()
      const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon... 6=Sat

      // Fetch items for the logs
      const itemIds = data.map(s => s.menu_item_id)
      const { data: items } = await supabase.from('menu_items').select('id, name, image_url, price').in('id', itemIds)
      const itemMap = Object.fromEntries(items?.map(i => [i.id, i]) || [])

      const logs = data.filter(sub => {
        if (sub.start_date !== todayStr) return false
        if (sub.frequency === 'daily') return true
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
        await supabase.from('delivery_log').insert(logs)
      }
    } catch (err) {
      console.error('Failed to auto-generate first delivery log:', err)
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
