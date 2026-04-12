import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscriptions: data })
}

// ── POST — create subscriptions for one or more items ────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
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

  const validSlots     = ['morning', 'afternoon', 'evening']
  const validFreqs     = ['daily', 'weekdays', 'weekends']
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

  // Compute schedule
  const deliveriesPerWeek =
    frequency === 'daily' ? 7 : frequency === 'weekdays' ? 5 : 2
  const totalDeliveries = Math.round((deliveriesPerWeek * Number(duration_days)) / 7)

  const startDate = new Date()
  const endDate   = new Date(startDate)
  endDate.setDate(endDate.getDate() + Number(duration_days))
  const startStr  = startDate.toISOString().split('T')[0]
  const endStr    = endDate.toISOString().split('T')[0]

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

  // Build insert rows for new items only
  const rows = items
    .filter((i) => newItemIds.includes(i.id))
    .map((item) => ({
      user_id:            user.id,
      menu_item_id:       item.id,
      delivery_slot,
      frequency,
      duration_days:      Number(duration_days),
      start_date:         startStr,
      end_date:           endStr,
      status:             'active',
      price_per_delivery: item.price as number,
      total_price:        (item.price as number) * totalDeliveries,
      address:            address ?? null,
    }))

  const { data: created, error: insertErr } = await supabase
    .from('subscriptions')
    .insert(rows)
    .select()

  if (insertErr) {
    console.error('subscription insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to create subscriptions' }, { status: 500 })
  }

  const skipped = itemIds.length - newItemIds.length

  return NextResponse.json({
    subscriptions: created,
    created_count: created?.length ?? 0,
    skipped_count: skipped,
    ...(skipped > 0 && {
      warning: `${skipped} item(s) skipped — already subscribed at this slot`,
    }),
  }, { status: 201 })
}
