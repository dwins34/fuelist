import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTodayStrIST } from '@/lib/utils'

// Called daily by Vercel Cron at 05:30 IST (00:00 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/daily-subscriptions", "schedule": "0 0 * * *" }] }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayStr = getTodayStrIST()
  const dayOfWeek = new Date().getDay() // 0=Sun … 6=Sat

  // 1. Fetch all active subscriptions that span today
  const { data: subs, error: subsErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, menu_item_id, delivery_slot, frequency, start_date, end_date, price_per_delivery, address')
    .eq('status', 'active')
    .lte('start_date', todayStr)
    .gte('end_date', todayStr)

  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json({ generated: 0 })

  // 2. Filter by frequency
  const dueToday = subs.filter(s => {
    if (s.frequency === 'daily') return true
    if (s.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
    if (s.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6
    return false
  })

  if (dueToday.length === 0) return NextResponse.json({ generated: 0 })

  // 3. Check which ones already have a delivery_log entry for today (idempotency)
  const subIds = dueToday.map(s => s.id)
  const { data: existing } = await supabaseAdmin
    .from('delivery_log')
    .select('subscription_id')
    .in('subscription_id', subIds)
    .eq('delivery_date', todayStr)

  const alreadyLogged = new Set((existing ?? []).map(e => e.subscription_id))
  const toCreate = dueToday.filter(s => !alreadyLogged.has(s.id))

  if (toCreate.length === 0) return NextResponse.json({ generated: 0, message: 'All already logged' })

  // 4. Fetch menu items for these subscriptions
  const itemIds = [...new Set(toCreate.map(s => s.menu_item_id))]
  const { data: menuItems } = await supabaseAdmin
    .from('menu_items')
    .select('id, name, image_url, price, category')
    .in('id', itemIds)

  const itemMap = Object.fromEntries((menuItems ?? []).map(i => [i.id, i]))

  // 5. Insert delivery_log entries
  const logs = toCreate.map(sub => ({
    subscription_id: sub.id,
    user_id:         sub.user_id,
    delivery_date:   todayStr,
    delivery_slot:   sub.delivery_slot,
    status:          'new',
    items:           [{ item: itemMap[sub.menu_item_id], quantity: 1 }],
    total_amount:    sub.price_per_delivery,
    address:         sub.address,
  }))

  const { error: insertErr } = await supabaseAdmin.from('delivery_log').insert(logs)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ generated: logs.length, date: todayStr })
}
