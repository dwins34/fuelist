import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (!['admin', 'kitchen'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    // comma-separated
  const minutes   = searchParams.get('minutes')   // time window
  const staffId   = searchParams.get('staff_id')
  const unassigned = searchParams.get('unassigned')

  let query = supabase
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

  if (status) {
    const statuses = status.split(',')
    query = query.in('order_status', statuses)
  }

  if (minutes) {
    const since = new Date(Date.now() - Number(minutes) * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  if (staffId) {
    query = query.eq('assigned_staff_id', staffId)
  } else if (unassigned === 'true') {
    query = query.is('assigned_staff_id', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
