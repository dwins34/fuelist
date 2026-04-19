import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

async function getRole(user: any, request: NextRequest): Promise<string> {
  // Fast path: role already in JWT
  const jwtRole = user.app_metadata?.role ?? user.user_metadata?.role ?? null
  if (jwtRole) return jwtRole

  // Fallback: read from public.users (covers users assigned a role before re-login)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    return data?.role ?? 'user'
  } catch {
    return 'user'
  }
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/kitchen')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole(user, request)
    if (!['admin', 'kitchen', 'delivery'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole(user, request)
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Redirect authenticated users away from auth pages → role home ───────────
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const role = await getRole(user, request)
    const dest =
      role === 'admin'    ? '/admin' :
      role === 'kitchen'  ? '/kitchen' :
      role === 'delivery' ? '/kitchen' :
      '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
