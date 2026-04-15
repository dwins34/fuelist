'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthContext } from '@/context/AuthContext'
import { UserRewardLog } from '@/types'

import AddressManager from '@/components/account/AddressManager'
import AccountSidebar, { AccountTab } from '@/components/account/AccountSidebar'
import PersonalInfoTab from '@/components/account/PersonalInfoTab'
import SubscriptionsTab from '@/components/account/SubscriptionsTab'
import SecurityTab from '@/components/account/SecurityTab'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
interface SubscriptionRow {
  id: string
  delivery_slot: string
  frequency: string
  duration_days: number
  start_date: string
  end_date: string
  status: 'active' | 'cancelled' | 'pending_payment'
  payment_status: 'pending_payment' | 'paid' | 'refunded'
  refund_amount: number
  price_per_delivery: number
  menu_items: {
    name: string
    image_url: string
  } | {
    name: string
    image_url: string
  }[]
}

interface FormErrors {
  name?: string
  phone?: string
  password?: string
  confirm?: string
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateProfile(fields: { name: string; phone: string }): FormErrors {
  const errs: FormErrors = {}
  if (!fields.name.trim()) errs.name = 'Full name is required.'
  else if (fields.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.'
  
  const rawPhone = fields.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone) errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone)) errs.phone = 'Enter a valid phone number (7–15 digits).'
  
  return errs
}

function validatePassword(password: string, confirm: string): FormErrors {
  const errs: FormErrors = {}
  if (!password) errs.password = 'Password is required.'
  else if (password.length < 6) errs.password = 'Password must be at least 6 characters.'
  if (password && confirm && password !== confirm) errs.confirm = 'Passwords do not match.'
  else if (password && !confirm) errs.confirm = 'Please confirm your password.'
  return errs
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 flex flex-col lg:flex-row gap-12 animate-pulse">
      <div className="w-full lg:w-80 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-stone-100" />
          <div className="h-4 w-32 bg-stone-100 rounded" />
          <div className="h-20 w-full bg-stone-50 rounded-[2rem]" />
        </div>
      </div>
      <div className="flex-1 space-y-8">
        <div className="h-10 w-48 bg-stone-100 rounded" />
        <div className="space-y-4">
           {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-stone-50 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={cn(
        "fixed bottom-8 right-8 z-[100] flex items-center gap-4 rounded-[2rem] px-8 py-5 text-sm font-black shadow-premium border-2 uppercase tracking-tight",
        type === 'success' ? "bg-white text-emerald-800 border-emerald-50" : "bg-white text-rose-800 border-rose-50"
      )}
    >
      <div className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm",
        type === 'success' ? "bg-emerald-500" : "bg-rose-500"
      )}>
        <Icon name={type === 'success' ? 'success' : 'error'} size={14} strokeWidth={4} />
      </div>
      {message}
    </motion.div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const { profile, loading, error: loadError, saveProfile } = useUserProfile()
  const { accessToken, user } = useAuthContext()

  const [activeTab, setActiveTab] = useState<AccountTab>('personal')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwErrors, setPwErrors] = useState<FormErrors>({})
  const [pwSaving, setPwSaving] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subActionId, setSubActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const isGoogleUser = user?.app_metadata?.provider === 'google' || user?.identities?.some((i: any) => i.provider === 'google')

  useEffect(() => {
    if (!loading && !profile && !loadError) router.push('/login')
  }, [loading, profile, loadError, router])

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setPhone(profile.phone)
  }, [profile])

  useEffect(() => {
    if (!profile?.id || !accessToken) return
    setSubsLoading(true)
    fetch('/api/subscriptions')
      .then((r) => r.json())
      .then((d) => setSubscriptions(d.subscriptions ?? []))
      .catch(() => {})
      .finally(() => setSubsLoading(false))
  }, [profile?.id, accessToken])

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
  }, [profile?.id, accessToken])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    if (e) e.preventDefault()
    const errs = validateProfile({ name, phone })
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    setSaving(true)
    try {
      const { error } = await saveProfile({ name: name.trim(), phone: phone.trim() })
      if (error) showToast('Failed to save. Please try again.', 'error')
      else showToast('Profile saved successfully.', 'success')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    if (e) e.preventDefault()
    const errs = validatePassword(password, confirm)
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwErrors({})
    setPwSaving(true)
    try {
      if (!accessToken) { showToast('Not authenticated.', 'error'); setPwSaving(false); return }
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!sbUrl || !sbKey) { showToast('Supabase not configured.', 'error'); return }

      const authRes = await fetch(`${sbUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: { 
          apikey: sbKey, 
          Authorization: `Bearer ${accessToken}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ password }),
      })
      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({}))
        showToast(body?.message ?? 'Failed to update password', 'error')
        return
      }
      if (profile) {
        await fetch(`${sbUrl}/rest/v1/users?id=eq.${profile.id}`, {
          method: 'PATCH',
          headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ has_set_password: true }),
        })
      }
      setPassword(''); setConfirm(''); setHasPassword(true); setShowPwForm(false)
      showToast('Password updated successfully.', 'success')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSubAction(id: string, status: 'cancelled') {
    setSubActionId(id)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status, refund_amount: data.subscription.refund_amount } : s)))
        showToast('Subscription cancelled.', 'success')
      } else {
        showToast(data.error ?? 'Failed to update subscription.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSubActionId(null)
    }
  }

  if (loading) return <Skeleton />

  return (
    <div className="relative h-[calc(100vh-var(--banner-height,0px)-72px)] overflow-hidden bg-white">
      {/* Premium Background Background Decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[10%] -right-[5%] h-[40%] w-[30%] rounded-full bg-amber-50/30 blur-[100px]" />
        <div className="absolute top-[20%] -left-[10%] h-[50%] w-[35%] rounded-full bg-stone-50 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[10%] h-[30%] w-[25%] rounded-full bg-amber-50/20 blur-[80px]" />
      </div>

      <div className="h-full relative mx-auto max-w-7xl px-6 py-6 sm:px-8">
        <div className="h-full flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Sidebar Section */}
          <div className="h-auto lg:h-full no-scrollbar py-2 px-1 shrink-0 w-full lg:w-80">
            <AccountSidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              profile={profile ? {
                name: profile.name,
                email: profile.email,
                reward_points: profile.reward_points ?? 0
              } : null}
            />
          </div>

          {/* Main Workspace Section */}
          <main className="flex-1 min-h-0 overflow-y-auto pr-4 pb-20 custom-scrollbar scroll-smooth">
            <div className="max-w-4xl py-4">
              {activeTab === 'personal' && (
                <PersonalInfoTab 
                  name={name} setName={setName}
                  phone={phone} setPhone={setPhone}
                  email={profile?.email}
                  formErrors={formErrors}
                  saving={saving}
                  onSubmit={handleSaveProfile}
                />
              )}

              {activeTab === 'address' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                  <div className="border-b border-stone-100 pb-5">
                    <h1 className="text-xl font-black text-stone-900 tracking-tighter uppercase">Deployment Locations</h1>
                    <p className="text-xs font-medium text-stone-400 mt-1">Manage your high-performance delivery zones.</p>
                  </div>
                  <AddressManager />
                </motion.div>
              )}

              {activeTab === 'subscriptions' && (
                <SubscriptionsTab 
                  subscriptions={subscriptions as any}
                  loading={subsLoading}
                  actionId={subActionId}
                  onAction={handleSubAction}
                />
              )}

              {activeTab === 'security' && (
                <SecurityTab 
                  isGoogleUser={isGoogleUser}
                  email={profile?.email}
                  hasPassword={hasPassword}
                  showPwForm={showPwForm}
                  setShowPwForm={setShowPwForm}
                  passwordForm={{
                    password,
                    confirm,
                    errors: pwErrors,
                    saving: pwSaving
                  }}
                  setPassword={setPassword}
                  setConfirm={setConfirm}
                  onPasswordSubmit={handleSetPassword}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  )
}
