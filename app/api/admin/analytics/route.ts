import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 *   - metrics       — totals for the date range
 *   - dailyRevenue  — per-day breakdown for chart
 *   - orderType     — normal vs subscription split
 *   - topItems      — most ordered menu items
 *   - refunds       — refund stats + list
 *   - recentOrders  — paginated order list
 */
export async function GET(req: NextRequest) {
  // ── Auth check: admin only ─────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single()
  if (userRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Date range params ──────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const page  = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = 20

  // Default: last 7 days in IST
  const nowIST  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const defTo   = nowIST.toISOString().slice(0, 10)
  const defFrom = new Date(nowIST.getTime() - 6 * 86400000).toISOString().slice(0, 10)

  const fromDate = searchParams.get('from') ?? defFrom
  const toDate   = searchParams.get('to')   ?? defTo

  // Convert to full-day UTC bounds
  const fromISO = `${fromDate}T00:00:00+05:30`
  const toISO   = `${toDate}T23:59:59+05:30`

  // ── Run all queries in parallel ────────────────────────────────────────────
  const [
    normalOrders,
    subOrders,
    refundData,
    recentOrdersData,
    dailyData,
  ] = await Promise.all([

    // Normal orders in range
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, delivery_fee, discount_amount, items, status, payment_status, created_at, user_id, address, coupon_id, reward_points_used, reward_points_earned')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .in('payment_status', ['paid', 'free']),

    // Subscription orders in range
    supabaseAdmin
      .from('subscriptions')
      .select('id, total_price, price_per_delivery, duration_days, frequency, status, payment_status, created_at, user_id, menu_item_id, refund_amount')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .eq('payment_status', 'paid'),

    // Refunds in range
    supabaseAdmin
      .from('refunds')
      .select('id, order_id, subscription_id, amount, status, razorpay_refund_id, created_at')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: false }),

    // Recent orders (paginated)
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, payment_status, created_at, user_id, items, address, discount_amount, coupon_id', { count: 'exact' })
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1),

    // Daily revenue (using view)
    supabaseAdmin
      .from('admin_daily_revenue')
      .select('day, order_type, order_count, revenue')
      .gte('day', fromISO)
      .lte('day', toISO)
      .order('day', { ascending: true }),
  ])

  const orders = normalOrders.data ?? []
  const subs   = subOrders.data ?? []

  // ── Metrics ────────────────────────────────────────────────────────────────
  const normalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)
  const subRevenue    = subs.reduce((s, sub) => s + Number(sub.total_price ?? 0), 0)
  const totalRevenue  = normalRevenue + subRevenue
  const totalOrders   = orders.length + subs.length
  const aov           = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Items sold (parse jsonb)
  const itemCounts: Record<string, { name: string; category: string; qty: number; revenue: number }> = {}

  for (const order of orders) {
    const rawItems: any[] = Array.isArray(order.items) ? order.items : []
    for (const entry of rawItems) {
      // Items stored as { id, name, price, category, quantity } or { item: {...}, quantity: N }
      const item = entry?.item ?? entry
      const qty  = entry?.quantity ?? item?.quantity ?? 1
      const key  = item?.id ?? item?.name ?? 'unknown'
      if (!itemCounts[key]) {
        itemCounts[key] = { name: item?.name ?? key, category: item?.category ?? '', qty: 0, revenue: 0 }
      }
      itemCounts[key].qty     += qty
      itemCounts[key].revenue += (item?.price ?? 0) * qty
    }
  }

  const totalItemsSold = Object.values(itemCounts).reduce((s, i) => s + i.qty, 0)

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  // ── Refund stats ───────────────────────────────────────────────────────────
  const refunds       = refundData.data ?? []
  const totalRefunds  = refunds.filter((r) => r.status === 'processed').length
  const totalRefunded = refunds.filter((r) => r.status === 'processed')
                               .reduce((s, r) => s + Number(r.amount), 0)

  // ── Daily revenue for chart ────────────────────────────────────────────────
  // Merge normal + subscription by day
  const dayMap: Record<string, { day: string; normal: number; subscription: number; total: number }> = {}
  for (const row of dailyData.data ?? []) {
    const day = String(row.day).slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { day, normal: 0, subscription: 0, total: 0 }
    const rev = Number(row.revenue ?? 0)
    if (row.order_type === 'normal')       { dayMap[day].normal += rev }
    if (row.order_type === 'subscription') { dayMap[day].subscription += rev }
    dayMap[day].total += rev
  }
  const dailyRevenue = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day))

  // ── Build response ─────────────────────────────────────────────────────────
  return NextResponse.json({
    metrics: {
      totalOrders,
      totalRevenue:  Math.round(totalRevenue * 100) / 100,
      aov:           Math.round(aov * 100) / 100,
      totalItemsSold,
      normalOrders:  orders.length,
      subOrders:     subs.length,
      normalRevenue: Math.round(normalRevenue * 100) / 100,
      subRevenue:    Math.round(subRevenue * 100) / 100,
      totalRefunds,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
    },
    dailyRevenue,
    topItems,
    refunds: refunds.slice(0, 50),
    recentOrders: {
      data:       recentOrdersData.data ?? [],
      total:      recentOrdersData.count ?? 0,
      page,
      totalPages: Math.ceil((recentOrdersData.count ?? 0) / limit),
    },
  })
}
