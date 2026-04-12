'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthContext } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

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

  // Name
  if (!fields.name.trim())
    errs.name = 'Full name is required.'
  else if (fields.name.trim().length < 2)
    errs.name = 'Name must be at least 2 characters.'
  else if (fields.name.trim().length > 80)
    errs.name = 'Name must be under 80 characters.'

  // Phone
  const rawPhone = fields.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone)
    errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone))
    errs.phone = 'Enter a valid phone number (7–15 digits).'

  // Address line 1
  if (!fields.address_line1.trim())
    errs.address_line1 = 'Address line 1 is required.'
  else if (fields.address_line1.trim().length < 5)
    errs.address_line1 = 'Please enter a complete address.'

  // City
  if (!fields.city.trim())
    errs.city = 'City is required.'
  else if (fields.city.trim().length < 2)
    errs.city = 'Enter a valid city name.'

  // Pincode
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter()
  const { profile, loading, error: loadError, saveProfile } = useUserProfile()
  const { accessToken } = useAuthContext()

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
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [pwErrors,      setPwErrors]      = useState<FormErrors>({})
  const [pwSaving,      setPwSaving]      = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

  // ── Change password ───────────────────────────────────────────────────────

  async function handleChangePassword(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    const errs = validatePassword(password, confirm)
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwErrors({})
    setPwSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (!error && profile && accessToken) {
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (sbUrl && sbKey) {
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
      }

      if (error) showToast(error.message, 'error')
      else {
        setPassword('')
        setConfirm('')
        showToast('Password updated successfully.', 'success')
      }
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

      {/* ── Password ── */}
      <form onSubmit={handleChangePassword} noValidate>
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Password</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Google sign-in users can set a password to also log in with email.
            </p>
          </div>

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
            Update password
          </Button>
        </section>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
