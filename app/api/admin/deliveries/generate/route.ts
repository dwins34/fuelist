import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/deliveries/generate
 * Generates delivery log entries for today's subscriptions and pending one-off orders.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

    // 1. Fetch active subscriptions for today
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        menu_items(id, name, image_url, price)
      `)
      .eq('status', 'active')
      .eq('payment_status', 'paid')
      .lte('start_date', todayStr)
      .or(`end_date.is.null,end_date.gte.${todayStr}`)

    if (subError) throw subError

    // Filter subscriptions by frequency
    const activeSubsToday = (subscriptions || []).filter(sub => {
      if (sub.frequency === 'daily') return true
      if (sub.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
      if (sub.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6
      return false
    })

    // 2. Fetch pending paid one-off orders
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_status', 'paid')
      .not('order_status', 'in', '("delivered","cancelled")')

    if (orderError) throw orderError

    // 3. Prepare logs
    const logs = []

    // Map subscriptions to logs
    for (const sub of activeSubsToday) {
      logs.push({
        subscription_id: sub.id,
        user_id:         sub.user_id,
        delivery_date:   todayStr,
        delivery_slot:   sub.delivery_slot,
        status:          'preparing',
        items:           [{ item: sub.menu_items, quantity: 1 }],
        total_amount:    sub.price_per_delivery,
        address:         sub.address,
      })
    }

    // Map one-off orders to logs
    for (const order of (orders || [])) {
      logs.push({
        order_id:        order.id,
        user_id:         order.user_id,
        delivery_date:   todayStr,
        delivery_slot:   'afternoon', // Default for one-off if not specified
        status:          order.order_status === 'new' ? 'preparing' : order.order_status,
        items:           order.items,
        total_amount:    order.total_amount,
        address:         order.address,
      })
    }

    if (logs.length === 0) {
      return NextResponse.json({ success: true, message: 'No deliveries to generate' })
    }

    // 4. Batch upsert into delivery_log (avoid duplicates for the same date/sub or date/order)
    // We'll use a unique constraint check or just filter existing
    const { data: existingLogs } = await supabaseAdmin
      .from('delivery_log')
      .select('subscription_id, order_id')
      .eq('delivery_date', todayStr)

    const existingSubIds = new Set(existingLogs?.map(l => l.subscription_id).filter(Boolean))
    const existingOrderIds = new Set(existingLogs?.map(l => l.order_id).filter(Boolean))

    const newLogs = logs.filter(log => {
      if (log.subscription_id && existingSubIds.has(log.subscription_id)) return false
      if (log.order_id && existingOrderIds.has(log.order_id)) return false
      return true
    })

    if (newLogs.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('delivery_log')
        .insert(newLogs)

      if (insertError) throw insertError
    }

    return NextResponse.json({ 
      success: true, 
      generated: newLogs.length, 
      skipped: logs.length - newLogs.length 
    })
  } catch (err: any) {
    console.error('Generation API Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate deliveries' }, { status: 500 })
  }
}
