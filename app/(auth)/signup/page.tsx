'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import OAuthButtons from '@/components/ui/OAuthButtons'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    try {
      localStorage.setItem("LAST_EMAIL_KEY", email)
    } catch { }

    // ✅ Sync user to DB
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'User',
          role: 'user',
        },
        { onConflict: 'id' }
      )
    }

    router.push('/')
    router.refresh()
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
        <div className="w-full max-w-md text-center rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Button href="/login" variant="secondary" className="w-full">Back to login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-green-600">🥗 Fuelist</Link>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Create an account</h1>
            <p className="mt-1 text-gray-500 text-sm">Join the Fuelist community</p>
          </div>

          {/* OAuth providers */}
          <OAuthButtons />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
