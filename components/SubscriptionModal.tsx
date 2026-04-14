'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl, categoryLabel } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { useRouter } from 'next/navigation'
import AddressManager from '@/components/account/AddressManager'
import { UserAddress } from '@/hooks/useAddresses'

// ── Types ────────────────────────────────────────────────────────────────────

type DeliverySlot = 'morning' | 'afternoon' | 'evening'
type Frequency    = 'daily' | 'weekdays' | 'weekends'
type Step         = 'items' | 'schedule' | 'confirm' | 'login' | 'address' | 'paying' | 'success'

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

/** Check if a user's profile is complete enough for billing */
function isProfileComplete(profile: { name: string; phone: string } | null): boolean {
  if (!profile) return false
  return !!(profile.name?.trim() && profile.phone?.trim())
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

  const onSlotChange = (s: DeliverySlot) => { setSlot(s); setError(null) }
  const onFreqChange = (f: Frequency) => { setFreq(f); setError(null) }
  const onDurationChange = (d: number) => { setDuration(d); setError(null) }

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
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null)

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
      if (!isProfileComplete(profile)) {
        setStep('address')
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
      savePendingSubscription({
        selectedItemIds: Array.from(selected),
        slot,
        freq,
        duration,
      })
      setStep('login')
      return
    }

    if (!isProfileComplete(profile) || !selectedAddress) {
      setStep('address')
      return
    }

    setStep('confirm')
  }, [profile, selected, slot, freq, duration, selectedAddress])

  const handleSelectAddress = useCallback((addr: UserAddress) => {
    setSelectedAddress(addr)
    setStep('confirm')
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    if (!profile) { router.push('/login'); return }
    if (!selectedAddress) { setStep('address'); return }

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
          address: {
            name:          profile.name,
            phone:         profile.phone,
            address_line1: selectedAddress.house_number,
            address_line2: selectedAddress.street_address,
            city:          selectedAddress.city,
            state:         selectedAddress.state,
            pincode:       selectedAddress.pincode,
            landmark:      selectedAddress.landmark,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to subscribe')
        setLoading(false)
        // If it's the duplicate subscription error, send them back to pick a different slot
        if (data.error?.toLowerCase().includes('already have active subscriptions')) {
          setStep('schedule')
        }
        return
      }

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
        amount:      data.amount,
        currency:    data.currency,
        name:        'Fuelist',
        description: 'Monthly Subscription',
        order_id:    data.order_id,
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

      const rzp = new (window as any).Razorpay(options)
      rzp.open()

    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  // ── Step header labels ────────────────────────────────────────────────────
  const FLOW_STEPS: Step[] = ['items', 'schedule', 'address', 'confirm']
  const stepIdx = FLOW_STEPS.indexOf(step === 'login' ? 'confirm' : step)

  const headerTitle =
    step === 'items'    ? 'Choose items'       :
    step === 'schedule' ? 'Set your schedule'  :
    step === 'address'  ? 'Delivery address'   :
    step === 'confirm'  ? 'Confirm subscription' :
    step === 'login'    ? 'Login Required'     :
    step === 'paying'   ? 'Processing payment' :
                          'Subscribed!'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 transition-all"
      style={{ paddingTop: isEnabled ? '1rem' : 'calc(1rem + var(--banner-height, 0px))' }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'paying') onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{headerTitle}</h2>
            {step !== 'success' && step !== 'paying' && step !== 'login' && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.size === 0 ? 'Select items below' :
                 `${selected.size} item${selected.size !== 1 ? 's' : ''} selected`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            {step !== 'success' && step !== 'paying' && step !== 'login' && (
              <div className="flex gap-1.5">
                {['items', 'schedule', 'address', 'confirm'].map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${
                    (step === s || FLOW_STEPS.indexOf(step as any) > i) ? 'w-4 bg-green-500' : 'w-1.5 bg-gray-200'
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
        <div className="overflow-y-auto flex-1 min-h-0">

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

          {/* ═══ STEP: Address Selection ═══ */}
          {step === 'address' && (
            <div className="px-5 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-extrabold text-gray-900">Delivery Location</h3>
                <p className="text-sm text-gray-500">Select where you&apos;d like your meals delivered.</p>
              </div>
              
              <AddressManager 
                hideHeader 
                selectedId={selectedAddress?.id} 
                onSelect={handleSelectAddress} 
              />

              <div className="mt-6 flex flex-col gap-4">
                <button
                  onClick={() => setStep('schedule')}
                  className="text-center text-sm text-gray-400 hover:text-gray-600"
                >
                  ← Back to schedule
                </button>
              </div>
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
                    <button key={s.value} onClick={() => onSlotChange(s.value)}
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
                    <button key={f.value} onClick={() => onFreqChange(f.value)}
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
                    <button key={d.value} onClick={() => onDurationChange(d.value)}
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
              {/* Items - Compact Thumbnail Grid */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Items ({selectedItems.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 p-1.5 pr-3 transition-colors hover:bg-gray-100">
                      <div className="relative h-8 w-8 shrink-0 rounded-md overflow-hidden bg-white">
                        {item.image_url ? (
                          <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-xs">🥗</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule summary - 2 Column Grid */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {[
                  { label: 'Time',     value: `${slotLabel.icon} ${slotLabel.label}` },
                  { label: 'Freq',     value: freqLabel.label },
                  { label: 'Plan',     value: durationLabel.label },
                  { label: 'Deliveries',value: deliveries },
                  { label: 'Address',  value: selectedAddress ? [selectedAddress.house_number, selectedAddress.street_address, selectedAddress.landmark, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(', ') : 'None', fullWidth: true },
                  { label: 'Total',    value: formatPrice(finalTotal), isTotal: true },
                ].map(({ label, value, fullWidth, isTotal }) => (
                  <div key={label} className={`flex flex-col ${fullWidth ? 'col-span-2' : ''} ${isTotal ? 'border-t border-gray-200 mt-1 pt-2 col-span-2' : ''}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
                    <span className={`text-sm ${isTotal ? 'text-lg font-black text-green-600' : 'font-semibold text-gray-800'} truncate`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
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
            {error && (
              <p className="text-center text-xs font-semibold text-red-500 pb-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                {error}
              </p>
            )}
            <button onClick={handleAdvanceToConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100">
              Continue to delivery
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => setStep('items')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}

        {step === 'address' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
             <p className="text-center text-xs text-gray-400 pb-2">Select an address above to continue</p>
             <button onClick={() => setStep('schedule')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Back</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white space-y-2">
            {error && (
              <p className="text-center text-xs font-semibold text-red-500 pb-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                {error}
              </p>
            )}
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
            <button onClick={() => setStep('address')} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1">Change address</button>
          </div>
        )}
      </div>
    </div>
  )
}
