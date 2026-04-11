import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Next.js 16: params is a Promise
type RouteParams = { params: Promise<{ id: string }> }

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const admin = await requireAdmin(supabase)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('menu_items')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const admin = await requireAdmin(supabase)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
