import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // ── Admin route protection ───────────────────────────────────────────────────
  // Role is read from the JWT app_metadata — zero extra DB round-trip per request.
  // The role is stamped into app_metadata by the Supabase auth hook / admin API
  // and refreshes with the token, so it's always authoritative.
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Read role from JWT metadata — no DB query needed
    const role =
      user.app_metadata?.role ??           // set via supabaseAdmin.auth.admin.updateUserById
      user.user_metadata?.role ??           // fallback for older records
      null

    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── Redirect authenticated users away from auth pages ───────────────────────
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
