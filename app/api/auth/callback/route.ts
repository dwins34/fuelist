import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_code`)
    }

    const supabase = await createClient()

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('EXCHANGE ERROR:', error.message)
      return NextResponse.redirect(`${baseUrl}/login?error=exchange_failed`)
    }

    // Sync Google user to DB
    const user = sessionData.user
    if (user) {
      // Check if this user already exists in DB
      const { data: existingProfile } = await supabase
        .from('users')
        .select('has_set_password')
        .eq('id', user.id)
        .single()

      const isFirstLogin = !existingProfile
      // Check all linked identities — more reliable than app_metadata.provider alone
      const isGoogleUser =
        user.app_metadata?.provider === 'google' ||
        user.identities?.some((i) => i.provider === 'google')

      if (isFirstLogin && isGoogleUser) {
        // New Google user — create DB row and send to set-password
        await supabase.from('users').insert({
          id: user.id,
          email: user.email ?? '',
          name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'User',
          role: 'user',
          has_set_password: false,
        })
        return NextResponse.redirect(`${baseUrl}/set-password`)
      }

      // Returning Google user who skipped set-password previously
      if (!isFirstLogin && isGoogleUser && existingProfile?.has_set_password === false) {
        return NextResponse.redirect(`${baseUrl}/set-password`)
      }

      if (isFirstLogin && !isGoogleUser) {
        // Email signup user — DB row may have failed to save during signup, create it now
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email ?? '',
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'User',
          role: 'user',
          has_set_password: true,
        }, { onConflict: 'id' })
      }
    }

    return NextResponse.redirect(`${baseUrl}${next}`)
  } catch (err) {
    console.error('CALLBACK CRASH:', err)
    return NextResponse.redirect(`/login?error=server_error`)
  }
}