'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import OAuthButtons from '@/components/ui/OAuthButtons'

export default function SignupPage() {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const supabase = useMemo(() => createClient(), [])

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    // 1. Create account — Supabase sends a confirmation email automatically
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim(), name: name.trim() },
        // After clicking the email link, redirect to /api/auth/callback
        // which then redirects to / (home) after confirming the session
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. If email confirmation is required, Supabase returns a user but no session
    //    identities[0].identity_data tells us if this email is already registered
    const identities = data.user?.identities ?? []
    if (identities.length === 0) {
      setError('An account with this email already exists. Please log in instead.')
      setLoading(false)
      return
    }

    // 3. Pre-create the user row in DB so the profile is ready when they confirm
    if (data.user) {
      await supabase.from('users').upsert(
        {
          id:               data.user.id,
          email:            email.trim(),
          name:             name.trim(),
          role:             'user',
          has_set_password: true,  // they set a password during signup
        },
        { onConflict: 'id' }
      )
    }

    setLoading(false)
    setSuccess(true)
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
        <div className="w-full max-w-md text-center rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-2">
            We sent a confirmation link to
          </p>
          <p className="font-semibold text-gray-800 mb-6">{email}</p>
          <p className="text-sm text-gray-400 mb-8">
            Click the link in the email to activate your account. After confirming, you&apos;ll be taken to the home page.
          </p>
          <Button href="/login" variant="secondary" className="w-full">
            Back to login
          </Button>
          <p className="mt-4 text-xs text-gray-400">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-green-600 hover:underline font-medium"
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    )
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-green-600">🥗 Fuelist</Link>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Create an account</h1>
            <p className="mt-1 text-gray-500 text-sm">Join the Fuelist community</p>
          </div>

          <OAuthButtons />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Full name"
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
            <Input
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm password"
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
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
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-green-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
