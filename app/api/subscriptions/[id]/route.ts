import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── PATCH — pause or cancel a subscription ────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json() as { status: 'active' | 'paused' | 'cancelled' }

  const validStatuses = ['active', 'paused', 'cancelled']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Verify ownership before updating
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  if (sub.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (sub.status === 'cancelled') {
    return NextResponse.json({ error: 'Cancelled subscriptions cannot be modified' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: updated })
}
