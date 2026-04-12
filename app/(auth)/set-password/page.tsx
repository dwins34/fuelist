'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from "@/components/Logo"

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sessionMissing, setSessionMissing] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setSessionMissing(true)
        } else {
          setUserEmail(session.user.email ?? null)
        }
      }
    )
    if (sessionMissing) {
      router.push('/login?error=session_expired')
    }

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    // 1. Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(`Failed to set password: ${updateError.message}`)
      setLoading(false)
      return
    }

    // 2. Get current user from local session (no network call needed)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      setError('User not found after password update.')
      setLoading(false)
      return
    }

    const user = session.user

    // 3. Update has_set_password flag in DB
    const { error: dbError } = await supabase
      .from('users')
      .update({ has_set_password: true })
      .eq('id', user.id)

    if (dbError) {
      console.error('DB update error:', dbError.message)
      setError('Password set but failed to update profile.')
      setLoading(false)
      return
    }

    // 4. Optional: Verify login works (your existing logic)
    if (userEmail) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      })

      if (signInError) {
        setError(
          'Password saved but email login is not enabled. Enable Email provider in Supabase.'
        )
        setLoading(false)
        return
      }
    }

    // 5. Success → redirect
    router.push('/')
    router.refresh()
  }

  if (sessionMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-gray-100 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session expired</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your login session expired before the password could be set. Please sign in with Google again.
          </p>
          <Button href="/login" className="w-full">Back to login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-green-600"><Logo size={20} /> Fuelist</Link>
            <div className="mt-4 text-4xl">🔐</div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">Set your password</h1>
            <p className="mt-2 text-sm text-gray-500">
              Create a password so you can sign in with{' '}
              <span className="font-medium text-gray-700">{userEmail ?? 'your email'}</span>{' '}
              next time — no need for Google every time.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm Password"
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Save password &amp; continue
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            Want to skip this for now?{' '}
            <Link href="/" className="text-green-600 hover:underline font-medium">
              Go to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
