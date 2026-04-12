'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthContext } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Image from 'next/image'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { UserRewardLog } from '@/types'

// ── Subscription type (local, not in global types to keep it scoped) ──────────
interface SubscriptionRow {
  id: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  frequency: 'daily' | 'weekdays' | 'weekends'
  duration_days: number
  start_date: string
  end_date: string
  status: 'active' | 'paused' | 'cancelled'
  price_per_delivery: number
  total_price: number
  menu_items: {
    id: string
    name: string
    image_url: string
    price: number
    category: string
  }
}

const SLOT_LABEL: Record<string, string> = {
  morning:   '🌅 Morning (8–10 AM)',
  afternoon: '☀️ Afternoon (12–2 PM)',
  evening:   '🌆 Evening (6–8 PM)',
}
const FREQ_LABEL: Record<string, string> = {
  daily:    'Every day',
  weekdays: 'Mon–Fri',
  weekends: 'Sat & Sun',
}

// ── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string
  phone?: string
  address_line1?: string
  city?: string
  pincode?: string
  password?: string
  confirm?: string
}

function validateProfile(fields: {
  name: string
  phone: string
  address_line1: string
  city: string
  pincode: string
}): FormErrors {
  const errs: FormErrors = {}

  if (!fields.name.trim())
    errs.name = 'Full name is required.'
  else if (fields.name.trim().length < 2)
    errs.name = 'Name must be at least 2 characters.'
  else if (fields.name.trim().length > 80)
    errs.name = 'Name must be under 80 characters.'

  const rawPhone = fields.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone)
    errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone))
    errs.phone = 'Enter a valid phone number (7–15 digits).'

  if (!fields.address_line1.trim())
    errs.address_line1 = 'Address line 1 is required.'
  else if (fields.address_line1.trim().length < 5)
    errs.address_line1 = 'Please enter a complete address.'

  if (!fields.city.trim())
    errs.city = 'City is required.'
  else if (fields.city.trim().length < 2)
    errs.city = 'Enter a valid city name.'

  if (!fields.pincode.trim())
    errs.pincode = 'Pincode is required.'
  else if (!/^\d{4,10}$/.test(fields.pincode.trim()))
    errs.pincode = 'Enter a valid pincode (digits only).'

  return errs
}

function validatePassword(password: string, confirm: string): FormErrors {
  const errs: FormErrors = {}
  if (!password)
    errs.password = 'Password is required.'
  else if (password.length < 6)
    errs.password = 'Password must be at least 6 characters.'
  else if (password.length > 72)
    errs.password = 'Password must be under 72 characters.'
  if (password && confirm && password !== confirm)
    errs.confirm = 'Passwords do not match.'
  else if (password && !confirm)
    errs.confirm = 'Please confirm your password.'
  return errs
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded-lg" />
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border transition-all ${
      type === 'success'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  )
}

// ── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter()
  const { profile, loading, error: loadError, saveProfile } = useUserProfile()
  const { accessToken, user } = useAuthContext()

  // Profile form state
  const [name,          setName]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [addressLine1,  setAddressLine1]  = useState('')
  const [addressLine2,  setAddressLine2]  = useState('')
  const [city,          setCity]          = useState('')
  const [state,         setState]         = useState('')
  const [pincode,       setPincode]       = useState('')
  const [landmark,      setLandmark]      = useState('')
  const [formErrors,    setFormErrors]    = useState<FormErrors>({})
  const [saving,        setSaving]        = useState(false)

  // Password form state
  const [showPwForm,    setShowPwForm]    = useState(false)
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [pwErrors,      setPwErrors]      = useState<FormErrors>({})
  const [pwSaving,      setPwSaving]      = useState(false)
  const [hasPassword,   setHasPassword]   = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Rewards state
  const [rewardsLog, setRewardsLog]       = useState<UserRewardLog[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(false)

  // Subscriptions state
  const [subscriptions, setSubscriptions]         = useState<SubscriptionRow[]>([])
  const [subsLoading, setSubsLoading]             = useState(false)
  const [subActionId, setSubActionId]             = useState<string | null>(null)

  // Detect if user is a Google user
  const isGoogleUser =
    user?.app_metadata?.provider === 'google' ||
    user?.identities?.some((i: { provider: string }) => i.provider === 'google')

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !profile && !loadError) router.push('/login')
  }, [loading, profile, loadError, router])

  // Pre-fill form once profile loads
  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setPhone(profile.phone)
    setAddressLine1(profile.address_line1)
    setAddressLine2(profile.address_line2)
    setCity(profile.city)
    setState(profile.state)
    setPincode(profile.pincode)
    setLandmark(profile.landmark)
  }, [profile])

  // Fetch reward log
  useEffect(() => {
    if (!profile?.id || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    setRewardsLoading(true)
    fetch(
      `${sbUrl}/rest/v1/user_rewards_log?user_id=eq.${profile.id}&order=created_at.desc&limit=10`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` } },
    )
      .then((r) => r.json())
      .then((rows) => setRewardsLog(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setRewardsLoading(false))
  }, [profile?.id, accessToken])

  // Fetch subscriptions
  useEffect(() => {
    if (!profile?.id || !accessToken) return
    setSubsLoading(true)
    fetch('/api/subscriptions')
      .then((r) => r.json())
      .then((d) => setSubscriptions(d.subscriptions ?? []))
      .catch(() => {})
      .finally(() => setSubsLoading(false))
  }, [profile?.id, accessToken])

  async function handleSubAction(id: string, status: 'active' | 'paused' | 'cancelled') {
    setSubActionId(id)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      if (res.ok) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status } : s)),
        )
        showToast(
          status === 'cancelled' ? 'Subscription cancelled.' :
          status === 'paused'    ? 'Subscription paused.'    : 'Subscription resumed.',
          'success',
        )
      } else {
        showToast('Failed to update subscription.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSubActionId(null)
    }
  }

  // Check if user already has a password set
  useEffect(() => {
    if (!profile?.id || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return

    fetch(`${sbUrl}/rest/v1/users?id=eq.${profile.id}&select=has_set_password&limit=1`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((rows) => { if (rows[0]?.has_set_password) setHasPassword(true) })
      .catch(() => {})
  }, [profile?.id, accessToken])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Save profile ──────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const errs = validateProfile({ name, phone, address_line1: addressLine1, city, pincode })
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    setSaving(true)

    try {
      const { error } = await saveProfile({
        name:          name.trim(),
        phone:         phone.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        city:          city.trim(),
        state:         state.trim(),
        pincode:       pincode.trim(),
        landmark:      landmark.trim(),
      })
      if (error) showToast('Failed to save. Please try again.', 'error')
      else       showToast('Profile saved successfully.', 'success')
    } finally {
      setSaving(false)
    }
  }

  // ── Set / update password ─────────────────────────────────────────────────

  async function handleSetPassword(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const errs = validatePassword(password, confirm)
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwErrors({})
    setPwSaving(true)

    try {
      if (!accessToken) { showToast('Not authenticated.', 'error'); return }

      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!sbUrl || !sbKey) { showToast('Supabase not configured.', 'error'); return }

      const authRes = await fetch(`${sbUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey:         sbKey,
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({}))
        showToast(body?.message ?? `Failed to update password (${authRes.status})`, 'error')
        return
      }

      if (profile) {
        await fetch(`${sbUrl}/rest/v1/users?id=eq.${profile.id}`, {
          method: 'PATCH',
          headers: {
            apikey:         sbKey,
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ has_set_password: true }),
        })
      }

      setPassword('')
      setConfirm('')
      setHasPassword(true)
      setShowPwForm(false)
      showToast(hasPassword ? 'Password updated.' : 'Password set — you can now sign in with email too.', 'success')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">{loadError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your details are saved for faster checkout.</p>
      </div>

      {/* ── Reward Points ── */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              ⭐ Reward Points
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Earn 1 pt for every ₹100 spent · 1 pt = ₹1 off</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-amber-600">{profile?.reward_points ?? 0}</p>
            <p className="text-xs text-amber-500 font-medium">
              ≈ {formatPrice(profile?.reward_points ?? 0)} value
            </p>
          </div>
        </div>

        {rewardsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-amber-100 rounded-lg" />
            ))}
          </div>
        ) : rewardsLog.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">
            No reward activity yet. Start ordering to earn points!
          </p>
        ) : (
          <div className="space-y-1">
            {rewardsLog.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {log.type === 'order_earn'   ? '🛍️' :
                     log.type === 'order_redeem' ? '💳' :
                     log.type === 'review'       ? '⭐' : '🎁'}
                  </span>
                  <span className="text-xs text-gray-600 truncate max-w-[200px]">
                    {log.description ?? log.type}
                  </span>
                </div>
                <span className={`text-xs font-bold shrink-0 ${log.points_change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {log.points_change > 0 ? '+' : ''}{log.points_change} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Subscriptions ── */}
      <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">🔄 My Subscriptions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Daily meal plans you&apos;ve set up</p>
          </div>
          <a
            href="/menu"
            className="text-xs font-semibold text-green-600 hover:text-green-800 transition-colors"
          >
            + New
          </a>
        </div>

        {subsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 px-4 py-6 text-center space-y-2">
            <p className="text-2xl">🥗</p>
            <p className="text-sm text-gray-500 font-medium">No active subscriptions</p>
            <p className="text-xs text-gray-400">
              Click <span className="font-semibold">🔄 Subscribe Daily</span> on any menu item to start.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`rounded-xl border p-4 flex gap-3 ${
                  sub.status === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
                  sub.status === 'paused'    ? 'bg-amber-50 border-amber-200'          :
                                               'bg-green-50 border-green-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-white">
                  {sub.menu_items?.image_url ? (
                    <Image
                      src={getImageUrl(sub.menu_items.image_url)}
                      alt={sub.menu_items.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🥗</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {sub.menu_items?.name}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      sub.status === 'active'    ? 'bg-green-500 text-white'  :
                      sub.status === 'paused'    ? 'bg-amber-400 text-white'  :
                                                   'bg-gray-400 text-white'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {SLOT_LABEL[sub.delivery_slot]} · {FREQ_LABEL[sub.frequency]}
                  </p>
                  <p className="text-xs text-gray-400">
                    {sub.start_date} → {sub.end_date} · {formatPrice(sub.price_per_delivery)}/delivery
                  </p>

                  {/* Action buttons */}
                  {sub.status !== 'cancelled' && (
                    <div className="flex gap-2 mt-2">
                      {sub.status === 'active' ? (
                        <button
                          onClick={() => handleSubAction(sub.id, 'paused')}
                          disabled={subActionId === sub.id}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50"
                        >
                          {subActionId === sub.id ? 'Pausing…' : 'Pause'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubAction(sub.id, 'active')}
                          disabled={subActionId === sub.id}
                          className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {subActionId === sub.id ? 'Resuming…' : 'Resume'}
                        </button>
                      )}
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this subscription? This cannot be undone.')) {
                            handleSubAction(sub.id, 'cancelled')
                          }
                        }}
                        disabled={subActionId === sub.id}
                        className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Personal info + Address ── */}
      <form onSubmit={handleSaveProfile} noValidate>
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Personal information</h2>

          <Input
            label="Full name"
            id="name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name: undefined })) }}
            placeholder="Your name"
            error={formErrors.name}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
              {profile?.email}
            </p>
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
          </div>

          <Input
            label="Phone number"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setFormErrors((p) => ({ ...p, phone: undefined })) }}
            placeholder="+91 98765 43210"
            error={formErrors.phone}
          />
        </section>

        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4 mt-6">
          <h2 className="text-base font-semibold text-gray-800">Delivery address</h2>

          <Input
            label="Address line 1"
            id="address_line1"
            type="text"
            value={addressLine1}
            onChange={(e) => { setAddressLine1(e.target.value); setFormErrors((p) => ({ ...p, address_line1: undefined })) }}
            placeholder="House / flat / building number"
            error={formErrors.address_line1}
          />

          <Input
            label="Address line 2 (optional)"
            id="address_line2"
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Street / area / colony"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              id="city"
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); setFormErrors((p) => ({ ...p, city: undefined })) }}
              placeholder="New Delhi"
              error={formErrors.city}
            />
            <Input
              label="State (optional)"
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Delhi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pincode"
              id="pincode"
              type="text"
              inputMode="numeric"
              value={pincode}
              onChange={(e) => { setPincode(e.target.value); setFormErrors((p) => ({ ...p, pincode: undefined })) }}
              placeholder="110001"
              error={formErrors.pincode}
            />
            <Input
              label="Landmark (optional)"
              id="landmark"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Near metro station"
            />
          </div>
        </section>

        <Button type="submit" loading={saving} className="w-full mt-4">
          Save details
        </Button>
      </form>

      {/* ── Login & Security ── */}
      <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Login &amp; security</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage how you sign in to your account.
          </p>
        </div>

        {/* Login options */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Login options</p>
          <div className="space-y-2">

            {/* Google row */}
            {isGoogleUser && (
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <GoogleIcon />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Google account</p>
                    <p className="text-xs text-gray-400">{profile?.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Connected
                </span>
              </div>
            )}

            {/* Email + password row */}
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 shrink-0">
                  <svg className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Email &amp; password</p>
                  <p className="text-xs text-gray-400">
                    {hasPassword ? 'Password is set — you can sign in with email' : 'Not set up yet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowPwForm((v) => !v); setPwErrors({}) }}
                className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
              >
                {showPwForm ? 'Cancel' : hasPassword ? 'Change' : 'Set up'}
              </button>
            </div>
          </div>
        </div>

        {/* Inline password form */}
        {showPwForm && (
          <form onSubmit={handleSetPassword} noValidate className="space-y-3 pt-1 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 pt-1">
              {hasPassword ? 'Change your password' : 'Add a password to your account'}
            </p>
            <p className="text-xs text-gray-400 -mt-1">
              {hasPassword
                ? 'Enter a new password below.'
                : 'Once set, you can sign in with your email and password — no need for Google every time.'}
            </p>
            <Input
              label="New password"
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwErrors((p) => ({ ...p, password: undefined })) }}
              placeholder="At least 6 characters"
              error={pwErrors.password}
            />
            <Input
              label="Confirm password"
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setPwErrors((p) => ({ ...p, confirm: undefined })) }}
              placeholder="Repeat your password"
              error={pwErrors.confirm}
            />
            <Button type="submit" loading={pwSaving} className="w-full">
              {hasPassword ? 'Update password' : 'Save password'}
            </Button>
          </form>
        )}
      </section>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
