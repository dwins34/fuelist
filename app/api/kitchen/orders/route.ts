import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getTodayStrIST } from '@/lib/utils'

function authCheck(role: string) {
  return ['admin', 'kitchen'].includes(role)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (!authCheck(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const minutes    = searchParams.get('minutes')
  const staffId    = searchParams.get('staff_id')
  const unassigned = searchParams.get('unassigned')

  // ── 1. Fetch regular orders ──────────────────────────────────────────────────
  let orderQuery = supabaseAdmin
    .from('orders')
    .select(`
      id, items, total_amount, delivery_fee, payment_status, order_status,
      estimated_prep_time, priority_score, assigned_staff_id, assigned_at,
      created_at, updated_at, address,
      staff:assigned_staff_id ( id, name )
    `)
    .not('order_status', 'in', '("delivered","cancelled","refunded")')
    .order('priority_score', { ascending: false })
    .order('created_at', { ascending: true })

  if (status) orderQuery = orderQuery.in('order_status', status.split(','))
  if (minutes) {
    const since = new Date(Date.now() - Number(minutes) * 60 * 1000).toISOString()
    orderQuery = orderQuery.gte('created_at', since)
  }
  if (staffId) orderQuery = orderQuery.eq('assigned_staff_id', staffId)
  else if (unassigned === 'true') orderQuery = orderQuery.is('assigned_staff_id', null)

  const { data: orders, error: ordersErr } = await orderQuery
  if (ordersErr) return NextResponse.json({ error: ordersErr.message }, { status: 500 })

  // ── 2. Fetch today's subscription delivery_log ───────────────────────────────
  const todayStr = getTodayStrIST()

  let dlQuery = supabaseAdmin
    .from('delivery_log')
    .select(`
      id, items, total_amount, status, delivery_slot, delivery_date,
      assigned_staff_id, assigned_at, created_at, address, subscription_id,
      staff:assigned_staff_id ( id, name )
    `)
    .eq('delivery_date', todayStr)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: true })

  if (status) dlQuery = dlQuery.in('status', status.split(','))
  if (staffId) dlQuery = dlQuery.eq('assigned_staff_id', staffId)
  else if (unassigned === 'true') dlQuery = dlQuery.is('assigned_staff_id', null)

  const { data: dlEntries } = await dlQuery

  // ── 3. Normalise delivery_log to match KDSOrder shape ───────────────────────
  const subOrders = (dlEntries ?? []).map((dl) => ({
    id:                 dl.id,
    items:              dl.items ?? [],
    total_amount:       dl.total_amount,
    order_status:       dl.status,         // kitchen uses order_status field
    estimated_prep_time: 10,
    priority_score:     5,
    assigned_staff_id:  dl.assigned_staff_id,
    assigned_at:        dl.assigned_at,
    created_at:         dl.created_at,
    address:            dl.address,
    staff:              dl.staff,
    // Extra context for kitchen card rendering
    is_subscription:    true,
    delivery_slot:      dl.delivery_slot,
    subscription_id:    dl.subscription_id,
  }))

  return NextResponse.json([...(orders ?? []), ...subOrders])
}
