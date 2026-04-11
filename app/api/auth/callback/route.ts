import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Upsert the user profile — safety net in case the DB trigger didn't fire
      // (ignoreDuplicates preserves the existing role for returning users)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from('users').upsert(
          {
            id: user.id,
            name:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email?.split('@')[0] ??
              'User',
            email: user.email ?? '',
            role: 'user',
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )

        // If the user has ONLY a Google identity (no email identity), they have
        // never set a password — send them to set-password.
        // Once they set a password, Supabase adds an 'email' identity so this
        // check naturally stops triggering on future logins.
        const identities = user.identities ?? []
        const hasEmailIdentity = identities.some((id) => id.provider === 'email')
        const isGoogleOnly = identities.some((id) => id.provider === 'google') && !hasEmailIdentity

        if (isGoogleOnly) {
          return NextResponse.redirect(`${origin}/set-password`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
