import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Sign out globally — revokes refresh token on Supabase server
  // and clears the server-side session cookies
  await supabase.auth.signOut({ scope: 'global' })

  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/', origin), { status: 302 })
}
