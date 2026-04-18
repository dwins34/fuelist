import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/admin/promote
 * Body: { userId: string, role: 'admin' | 'user' | 'kitchen' | 'delivery' }
 *
 * Updates both:
 *   1. public.users.role  (read by admin layout / app UI)
 *   2. auth.users.raw_app_meta_data.role  (read by middleware JWT check)
 *
 * Only callable by an existing admin.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role ?? user.user_metadata?.role
  if (callerRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  const VALID_ROLES = ['admin', 'user', 'kitchen', 'delivery']
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  // 1. Update public.users table
  const { error: dbErr } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // 2. Stamp app_metadata so the middleware JWT check works immediately
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  return NextResponse.json({ success: true, userId, role })
}
