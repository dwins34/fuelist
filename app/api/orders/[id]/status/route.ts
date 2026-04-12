import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OrderStatus, Role } from '@/types'

// Valid transitions per role
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

  // Fetch the caller's role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as Role | undefined
  if (!role || role === 'user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status: newStatus }: { status: OrderStatus } = await req.json()

  // Fetch current order status
  const { data: order } = await supabase
    .from('orders')
    .select('order_status')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const currentStatus = order.order_status as OrderStatus
  const allowed = ALLOWED_TRANSITIONS[role]

  // Validate the transition is permitted for this role
  if (allowed[currentStatus] !== newStatus) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStatus}' to '${newStatus}' as role '${role}'` },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('orders')
    .update({ order_status: newStatus })
    .eq('id', id)

  if (error) {
    console.error('order status update error:', error)
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, order_status: newStatus })
}
