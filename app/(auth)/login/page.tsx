'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import OAuthButtons from '@/components/ui/OAuthButtons'
import Logo from "@/components/Logo"

const LAST_EMAIL_KEY = 'fuelist_last_email'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastEmail, setLastEmail] = useState<string | null>(null)
  const [usingSavedEmail, setUsingSavedEmail] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_EMAIL_KEY)
      if (saved) {
        setLastEmail(saved)
        setUsingSavedEmail(true)
        setEmail(saved)
      }
    } catch {}
  }, [])

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

    try { localStorage.setItem(LAST_EMAIL_KEY, email) } catch {}

    router.push('/')
    router.refresh()
  }

  function switchAccount() {
    setUsingSavedEmail(false)
    setEmail('')
    setPassword('')
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-green-600"><Logo size={20} /> Fuelist</Link>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-gray-500 text-sm">Sign in to your account</p>
          </div>

          {/* Saved account prompt */}
          {usingSavedEmail && lastEmail && (
            <div className="mb-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Continue as</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{lastEmail}</p>
              </div>
              <button
                type="button"
                onClick={switchAccount}
                className="shrink-0 text-xs font-medium text-green-700 hover:text-green-900 underline underline-offset-2"
              >
                Use different account
              </button>
            </div>
          )}

          {/* OAuth providers — only show when not using saved email */}
          {!usingSavedEmail && (
            <>
              <OAuthButtons />
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!usingSavedEmail && (
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
            )}
            <Input
              label="Password"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          {/* Show OAuth when using saved email */}
          {usingSavedEmail && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <OAuthButtons />
            </>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-green-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
