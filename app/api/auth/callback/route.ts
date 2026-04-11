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

    // Check if the Google user has already set a password
    const userId = sessionData.user?.id
    if (userId) {
      const { data: profile } = await supabase
        .from('users')
        .select('has_set_password')
        .eq('id', userId)
        .single()

      if (profile && !profile.has_set_password) {
        return NextResponse.redirect(`${baseUrl}/set-password`)
      }
    }

    return NextResponse.redirect(`${baseUrl}${next}`)
  } catch (err) {
    console.error('CALLBACK CRASH:', err)
    return NextResponse.redirect(`/login?error=server_error`)
  }
}