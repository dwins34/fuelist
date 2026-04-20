import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (!['admin', 'kitchen'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { staff_id } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('delivery_log')
    .update({
      assigned_staff_id: staff_id ?? null,
      assigned_at: staff_id ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id, assigned_staff_id, assigned_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
