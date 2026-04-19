import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_TRANSITIONS: Record<string, string[]> = {
  new:             ['preparing', 'cancelled'],
  preparing:       ['ready', 'cancelled'],
  ready:           ['out_for_delivery', 'delivered'],
  out_for_delivery:['delivered'],
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (!['admin', 'kitchen'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status } = await req.json()
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('order_status')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[order.order_status] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.order_status} → ${status}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ order_status: status })
    .eq('id', id)
    .select('id, order_status, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
