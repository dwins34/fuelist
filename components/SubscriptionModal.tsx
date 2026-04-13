'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl, categoryLabel } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

type DeliverySlot = 'morning' | 'afternoon' | 'evening'
type Frequency    = 'daily' | 'weekdays' | 'weekends'
type Step         = 'items' | 'schedule' | 'confirm' | 'login' | 'profile' | 'paying' | 'success'

interface SubscriptionModalProps {
  /** Pre-selected item (from MenuCard). If omitted, user starts with empty selection. */
  initialItem?: MenuItem
  onClose: () => void
  onSuccess?: () => void
  /** Restored config from localStorage after login redirect */
  restoredConfig?: PendingSubscriptionConfig | null
}

// Extend Window for Razorpay
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on?(event: string, handler: () => void): void }
  }
}

// ── Pending subscription config (saved to localStorage) ──────────────────────

export interface PendingSubscriptionConfig {
  selectedItemIds: string[]
  slot: DeliverySlot
  freq: Frequency
  duration: number
}

const PENDING_SUB_KEY = 'fuelist_pending_subscription'

export function savePendingSubscription(config: PendingSubscriptionConfig) {
  try { localStorage.setItem(PENDING_SUB_KEY, JSON.stringify(config)) } catch {}
}

export function loadPendingSubscription(): PendingSubscriptionConfig | null {
  try {
    const raw = localStorage.getItem(PENDING_SUB_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function clearPendingSubscription() {
  try { localStorage.removeItem(PENDING_SUB_KEY) } catch {}
}

// ── Config ───────────────────────────────────────────────────────────────────

const SLOTS: { value: DeliverySlot; label: string; time: string; icon: string }[] = [
  { value: 'morning',   label: 'Morning',   time: '8 – 10 AM', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', time: '12 – 2 PM', icon: '☀️' },
  { value: 'evening',   label: 'Evening',   time: '6 – 8 PM',  icon: '🌆' },
]

const FREQS: { value: Frequency; label: string; desc: string }[] = [
  { value: 'daily',    label: 'Every day', desc: '7 days/week' },
  { value: 'weekdays', label: 'Weekdays',  desc: 'Mon – Fri'   },
  { value: 'weekends', label: 'Weekends',  desc: 'Sat & Sun'   },
]

const DURATIONS: { value: number; label: string; badge: string }[] = [
  { value: 7,  label: '7 days',  badge: ''        },
  { value: 14, label: '14 days', badge: '5% off'  },
  { value: 30, label: '30 days', badge: '10% off' },
]

const DISCOUNT: Record<number, number> = { 7: 0, 14: 0.05, 30: 0.10 }

/** Load Razorpay checkout.js */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deliveriesCount(freq: Frequency, duration: number) {
  const perWeek = freq === 'daily' ? 7 : freq === 'weekdays' ? 5 : 2
  return Math.round((perWeek * duration) / 7)
}

/** Check if a user's profile is complete enough to subscribe */
function isProfileComplete(profile: { name: string; phone: string; address_line1: string; city: string; pincode: string } | null): boolean {
  if (!profile) return false
  return !!(
    profile.name?.trim() &&
    profile.phone?.trim() &&
    profile.address_line1?.trim() &&
    profile.city?.trim() &&
    profile.pincode?.trim()
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubscriptionModal({ initialItem, onClose, onSuccess, restoredConfig }: SubscriptionModalProps) {
  const { profile } = useAuthContext()
  const { isEnabled, message: serviceMessage } = useServiceStatus()
  const router = useRouter()

  // ── Schedule state ────────────────────────────────────────────────────────
  const [slot,     setSlot]     = useState<DeliverySlot>(restoredConfig?.slot ?? 'morning')
  const [freq,     setFreq]     = useState<Frequency>(restoredConfig?.freq ?? 'daily')
  const [duration, setDuration] = useState<number>(restoredConfig?.duration ?? 7)

  // ── Item picker state ─────────────────────────────────────────────────────
  const [allItems,  setAllItems]  = useState<MenuItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [selected, setSelected]  = useState<Set<string>>(
    restoredConfig
      ? new Set(restoredConfig.selectedItemIds)
      : initialItem ? new Set([initialItem.id]) : new Set()
  )
  const [search, setSearch] = useState('')

  // ── Flow state ────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<Step>(restoredConfig ? 'confirm' : 'items')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch all available menu items ────────────────────────────────────────
  useEffect(() => {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    fetch(`${sbUrl}/rest/v1/menu_items?is_available=eq.true&order=category.asc,name.asc`, {
      headers: { apikey: sbKey, 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((rows: MenuItem[]) => setAllItems(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setItemsLoading(false))
  }, [])

  // ── If user just logged in and has a restored config, advance step ─────
  useEffect(() => {
    if (restoredConfig && profile && step === 'confirm') {
      clearPendingSubscription()
      // Check profile completeness
      if (!isProfileComplete(profile)) {
        setStep('profile')
      }
    }
  }, [restoredConfig, profile, step])

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedItems  = allItems.filter((i) => selected.has(i.id))
  const filteredItems  = allItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  const deliveries     = deliveriesCount(freq, duration)
  const discountRate   = DISCOUNT[duration]
  const baseTotal      = selectedItems.reduce((s, i) => s + i.price, 0) * deliveries
  const discountAmt    = Math.floor(baseTotal * discountRate)
  const finalTotal     = baseTotal - discountAmt

  const slotLabel     = SLOTS.find((s) => s.value === slot)!
  const freqLabel     = FREQS.find((f) => f.value === freq)!
  const durationLabel = DURATIONS.find((d) => d.value === duration)!

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Advance to confirm — checks auth & profile ──────────────────────────
  const handleAdvanceToConfirm = useCallback(() => {
    if (!profile) {
      // Save current config so it persists across login redirect
      savePendingSubscription({
        selectedItemIds: Array.from(selected),
        slot,
        freq,
        duration,
      })
      setStep('login')
      return
    }

    if (!isProfileComplete(profile)) {
      setStep('profile')
      return
    }

    setStep('confirm')
  }, [profile, selected, slot, freq, duration])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    if (!profile) { router.push('/login'); return }
    if (!isProfileComplete(profile)) { setStep('profile'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. Create sub order on server
      const res = await fetch('/api/subscriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          menu_item_ids: Array.from(selected),
          delivery_slot: slot,
          frequency:     freq,
          duration_days: duration,
          address: profile.address_line1 ? {
            name:          profile.name,
            phone:         profile.phone,
            address_line1: profile.address_line1,
            city:          profile.city,
            pincode:       profile.pincode,
          } : null,
        }),
      })
      const orderData = await res.json()
      if (!res.ok) { setError(orderData.error ?? 'Failed to subscribe'); setLoading(false); return }

      // 2. Load Razorpay
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setError('Could not load payment gateway. Check your connection.')
        setLoading(false)
        return
      }

      // 3. Open Razorpay Checkout
      const options = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'Fuelist',
        description: 'Monthly Subscription',
        order_id:    orderData.order_id,
        prefill: {
          name:    profile.name,
          contact: profile.phone,
          email:   profile.email,
        },
        theme: { color: '#16a34a' },
        handler: async (response: {
          razorpay_order_id:   string
          razorpay_payment_id: string
          razorpay_signature:  string
        }) => {
          setStep('paying')
          try {
            const verifyRes = await fetch('/api/subscriptions/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                razorpay_order_id:    response.razorpay_order_id,
                razorpay_payment_id:  response.razorpay_payment_id,
                razorpay_signature:   response.razorpay_signature,
              }),
            })
            if (!verifyRes.ok) throw new Error('Verification failed')
            setStep('success')
            onSuccess?.()
          } catch (err) {
            console.error('verify failed:', err)
            setError('Payment verified but activation failed. Contact support.')
            setStep('confirm')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  // ── Step header labels ────────────────────────────────────────────────────
  const FLOW_STEPS: Step[] = ['items', 'schedule', 'confirm']
  const stepIdx = FLOW_STEPS.indexOf(step)

  const headerTitle =
    step === 'items'    ? 'Choose items'       :
    step === 'schedule' ? 'Set your schedule'  :
    step === 'confirm'  ? 'Confirm subscription' :
    step === 'login'    ? 'Login Required'     :
    step === 'profile'  ? 'Complete Your Profile' :
    step === 'paying'   ? 'Processing payment' :
                          'Subscribed!'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'paying') onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{headerTitle}</h2>
            {step !== 'success' && step !== 'paying' && step !== 'login' && step !== 'profile' && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.size === 0 ? 'Select items below' :
                 `${selected.size} item${selected.size !== 1 ? 's' : ''} selected`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            {step !== 'success' && step !== 'paying' && step !== 'login' && step !== 'profile' && (
              <div className="flex gap-1.5">
                {FLOW_STEPS.map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${
                    i <= stepIdx ? 'w-4 bg-green-500' : 'w-1.5 bg-gray-200'
                  }`} />
                ))}
              </div>
            )}
            {step !== 'paying' && (
              <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ═══ STEP: Login Required ═══ */}
          {step === 'login' && (
            <div className="px-5 py-10 text-center space-y-4">
              <div className="text-5xl">🔒</div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Create an Account to Subscribe</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your meal selection is saved! Sign in or create an account to complete your subscription.
                </p>
              </div>

              {/* Summary of what they configured */}
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-left space-y-1">
                <p className="text-xs font-semibold text-gray-600">Your plan:</p>
                <p className="text-xs text-gray-500">
                  {selected.size} item{selected.size !== 1 ? 's' : ''} · {slotLabel.icon} {slotLabel.label} · {freqLabel.label} · {durationLabel.label}
                </p>
                <p className="text-sm font-bold text-gray-900">{formatPrice(finalTotal)}</p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    savePendingSubscription({
                      selectedItemIds: Array.from(selected),
                      slot,
                      freq,
                      duration,
                    })
                    router.push('/login?redirect=/menu')
                  }}
                  className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    savePendingSubscription({
                      selectedItemIds: Array.from(selected),
                      slot,
                      freq,
                      duration,
                    })
                    router.push('/signup?redirect=/menu')
                  }}
                  className="w-full rounded-full border border-green-500 px-5 py-3 text-sm font-bold text-green-600 hover:bg-green-50 transition-colors"
                >
                  Create Account
                </button>
              </div>
              <button
                onClick={() => setStep('schedule')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ← Go back to schedule
              </button>
            </div>
          )}

          {/* ═══ STEP: Profile Incomplete ═══ */}
          {step === 'profile' && (
            <div className="px-5 py-10 text-center space-y-4">
              <div className="text-5xl">📋</div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Complete Your Profile</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We need your delivery details to process this subscription. Please fill in your profile first.
                </p>
              </div>

              {/* Show what&apos;s missing */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left space-y-1.5">
                <p className="text-xs font-semibold text-amber-700">Required information:</p>
                {[
                  { label: 'Full name',    ok: !!profile?.name?.trim() },
                  { label: 'Phone number', ok: !!profile?.phone?.trim() },
                  { label: 'Address',      ok: !!profile?.address_line1?.trim() },
                  { label: 'City',         ok: !!profile?.city?.trim() },
                  { label: 'Pincode',      ok: !!profile?.pincode?.trim() },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={ok ? 'text-green-500' : 'text-red-400'}>{ok ? '✓' : '✕'}</span>
                    <span className={ok ? 'text-gray-500' : 'text-amber-800 font-medium'}>{label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    savePendingSubscription({
                      selectedItemIds: Array.from(selected),
                      slot,
                      freq,
                      duration,
                    })
                    router.push('/account')
                  }}
                  className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                >
                  Go to Account Settings
                </button>
              </div>
              <button
                onClick={() => setStep('schedule')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ← Go back
              </button>
            </div>
          )}

          {/* ═══ STEP 1: Item picker ═══ */}
          {step === 'items' && (
            <div className="px-5 py-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Selected chips */}
              {selected.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItems.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2.5 py-1 text-xs font-medium text-green-800"
                    >
                      {item.name}
                      <button onClick={() => toggleItem(item.id)} className="ml-0.5 text-green-500 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Item list */}
              {itemsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const isSelected = selected.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-green-50">
                          {item.image_url ? (
                            <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xl">🥗</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            {categoryLabel(item.category)} · {formatPrice(item.price)}/delivery
                          </p>
                        </div>
                        {/* Checkbox */}
                        <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {filteredItems.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No items found.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Schedule ═══ */}
          {step === 'schedule' && (
            <div className="px-5 py-5 space-y-5">
              {/* Delivery slot */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Delivery time</p>
                <div className="grid grid-cols-3 gap-2">
                  {SLOTS.map((s) => (
                    <button key={s.value} onClick={() => setSlot(s.value)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        slot === s.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{s.icon}</div>
                      <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                      <p className="text-[10px] text-gray-400">{s.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Frequency</p>
                <div className="space-y-2">
                  {FREQS.map((f) => (
                    <button key={f.value} onClick={() => setFreq(f.value)}
                      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all ${
                        freq === f.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800 text-left">{f.label}</p>
                        <p className="text-xs text-gray-400">{f.desc}</p>
                      </div>
                      {freq === f.value && (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Duration</p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        duration === d.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-800">{d.label}</p>
                      <p className={`text-[10px] mt-0.5 ${d.badge ? 'font-semibold text-green-600' : 'text-gray-400'}`}>
                        {d.badge || 'standard'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price preview */}
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 space-y-1">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate max-w-[200px]">{item.name} ×{deliveries}</span>
                    <span>{formatPrice(item.price * deliveries)}</span>
                  </div>
                ))}
                {discountAmt > 0 && (
                  <div className="flex items-center justify-between text-xs text-green-600 border-t border-green-200 pt-1 mt-1">
                    <span>Duration discount</span>
                    <span>−{formatPrice(discountAmt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-green-200 pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Confirm ═══ */}
          {step === 'confirm' && (
            <div className="px-5 py-5 space-y-4">
              {/* Items */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Items ({selectedItems.length})</p>
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-white">
                        {item.image_url ? (
                          <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-lg">🥗</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatPrice(item.price)}/delivery</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule summary */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                {[
                  { label: 'Delivery time', value: `${slotLabel.icon} ${slotLabel.label} (${slotLabel.time})` },
                  { label: 'Frequency',     value: `${freqLabel.label} — ${freqLabel.desc}` },
                  { label: 'Duration',      value: `${durationLabel.label} · ${deliveries} deliveries` },
                  { label: 'Total amount',  value: formatPrice(finalTotal) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </div>
          )}

          {/* ═══ STEP: Paying ═══ */}
          {step === 'paying' && (
            <div className="flex flex-col items-center justify-center py-16 px-5 gap-4 text-center">
              <svg className="h-12 w-12 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div>
                <p className="text-lg font-bold text-gray-900">Activating subscription…</p>
                <p className="text-sm text-gray-400 mt-1">Please do not close this window.</p>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Success ═══ */}
          {step === 'success' && (
            <div className="px-5 py-8 text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">All subscriptions created!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} will be delivered{' '}
                  {freqLabel.desc.toLowerCase()} at {slotLabel.time} for {durationLabel.label}.
                </p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                Manage your subscriptions in{' '}
                <a href="/account" className="font-semibold underline">Account settings</a>.
              </div>
              <button onClick={onClose}
                className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Footer CTA ── */}
        {step === 'items' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
            <button
              onClick={() => setStep('schedule')}
              disabled={selected.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected.size === 0 ? 'Select at least 1 item' : `Continue with ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
              {selected.size > 0 && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        )}

        {step === 'schedule' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
            <button onClick={handleAdvanceToConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100">
              Review & confirm
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => setStep('items')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
            <button
              onClick={handleSubscribe}
              disabled={loading || !isEnabled}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : isEnabled ? (
                `Pay & Subscribe — ${formatPrice(finalTotal)}`
              ) : (
                'Service Paused'
              )}
            </button>
            {!isEnabled && (
              <p className="text-center text-xs text-gray-400 mt-1">
                {serviceMessage}
              </p>
            )}
            <button onClick={() => setStep('schedule')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
