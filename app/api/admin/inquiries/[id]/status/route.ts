import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await req.json()

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('contact_messages')
      .update({ status })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, status })
  } catch (error: any) {
    console.error('Inquiries API Update Error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
