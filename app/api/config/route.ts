import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

/**
 * GET /api/config
 * Publicly fetches global app configuration
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('key', 'service_status')
      .single()

    if (error) throw error

    return NextResponse.json({ config: data.value })
  } catch (err) {
    console.error('Config API GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
  }
}

/**
 * PATCH /api/config
 * Updates global app configuration (Admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { enabled, message } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('app_config')
      .upsert({
        key: 'service_status',
        value: { enabled, message },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, config: data.value })
  } catch (err) {
    console.error('Config API PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
  }
}
