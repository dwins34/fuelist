import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { OrderStatus, Role } from '@/types'

const ALLOWED_TRANSITIONS: Record<Role, Partial<Record<OrderStatus, OrderStatus>>> = {
  admin: {
    new:             'preparing',
    preparing:       'ready',
    ready:           'out_for_delivery',
    out_for_delivery: 'delivered',
  },
  kitchen: {
    new:       'preparing',
    preparing: 'ready',
  },
  delivery: {
    ready:           'out_for_delivery',
    out_for_delivery: 'delivered',
  },
  user: {},
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = profile?.role as Role | undefined

  if (!role || role === 'user') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status: newStatus }: { status: OrderStatus } = await req.json()

  const { data: log, error: fetchErr } = await supabase
    .from('delivery_log')
    .select('status, order_id, subscription_id')
    .eq('id', id)
    .single()

  if (fetchErr || !log) return NextResponse.json({ error: 'Delivery log not found' }, { status: 404 })

  // Update logic: for one-off orders, we SHOULD also update the master order status
  // to keep them in sync, but for subscriptions, we only update the log.
  
  const { error: updateErr } = await supabase
    .from('delivery_log')
    .update({ status: newStatus })
    .eq('id', id)

  if (updateErr) throw updateErr

  // If it's a one-off order, sync back to the main orders table using admin client
  // to bypass RLS (kitchen/delivery roles can't update orders directly)
  if (log.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', log.order_id)
  }

  return NextResponse.json({ success: true, status: newStatus })
}
