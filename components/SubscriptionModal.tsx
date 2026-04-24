'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl, categoryLabel, getServingSize } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { useDeliveryCheck } from '@/hooks/useDeliveryCheck'
import { useScrollLock } from '@/hooks/useScrollLock'
import PhoneOtpVerify from '@/components/ui/PhoneOtpVerify'
import { useRouter } from 'next/navigation'
import AddressManager from '@/components/account/AddressManager'
import { useAddresses, UserAddress } from '@/hooks/useAddresses'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type DeliverySlot = 'morning' | 'afternoon' | 'evening'
type Frequency    = 'daily' | 'weekdays' | 'weekends'
type Step         = 'items' | 'schedule' | 'confirm' | 'login' | 'address' | 'paying' | 'success'

interface SubscriptionModalProps {
  initialItem?: MenuItem
  onClose: () => void
  onSuccess?: () => void
  restoredConfig?: PendingSubscriptionConfig | null
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on?(event: string, handler: () => void): void }
  }
}

export interface PendingSubscriptionConfig {
  selectedItemIds: string[]
  quantities?: Record<string, number>
  slot: DeliverySlot
  freq: Frequency
  duration: number
  step?: Step
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

// ── Config ────────────────────────────────────────────────────────────────────

const SLOTS: { value: DeliverySlot; label: string; time: string; icon: IconName }[] = [
  { value: 'morning',   label: 'Morning',   time: '8 – 10 AM', icon: 'points' },
  { value: 'afternoon', label: 'Afternoon', time: '12 – 2 PM', icon: 'zap' },
  { value: 'evening',   label: 'Evening',   time: '6 – 8 PM',  icon: 'time' },
]

const FREQS: { value: Frequency; label: string; desc: string }[] = [
  { value: 'daily',    label: 'Daily',    desc: '7 Days/Week' },
  { value: 'weekdays', label: 'Weekdays', desc: 'Mon – Fri'   },
  { value: 'weekends', label: 'Weekends', desc: 'Sat & Sun'   },
]

const DURATIONS: { value: number; label: string; badge: string }[] = [
  { value: 7,  label: '7 Days',  badge: ''        },
  { value: 14, label: '14 Days', badge: '5% OFF'  },
  { value: 30, label: '30 Days', badge: '10% OFF' },
]

const DISCOUNT: Record<number, number> = { 7: 0, 14: 0.05, 30: 0.10 }

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function deliveriesCount(freq: Frequency, duration: number): number {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + duration)
  let count = 0; const cur = new Date(start)
  while (cur < end) {
    const day = cur.getDay()
    if (freq === 'daily') count++
    else if (freq === 'weekdays' && day >= 1 && day <= 5) count++
    else if (freq === 'weekends' && (day === 0 || day === 6)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function isProfileComplete(profile: { name: string; phone: string } | null): boolean {
  if (!profile) return false
  return !!(profile.name?.trim() && profile.phone?.trim())
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubscriptionModal({ initialItem, onClose, onSuccess, restoredConfig }: SubscriptionModalProps) {
  const { profile, reloadProfile } = useAuthContext()
  const { fetchAddresses } = useAddresses()
  const { isEnabled, serviceAreaLabel, deliveryFee } = useServiceStatus()
  const { check: checkDelivery } = useDeliveryCheck()
  const router = useRouter()

  const [slot,     setSlot]     = useState<DeliverySlot>(restoredConfig?.slot ?? 'morning')
  const [freq,     setFreq]     = useState<Frequency>(restoredConfig?.freq ?? 'daily')
  const [duration, setDuration] = useState<number>(restoredConfig?.duration ?? 7)

  const onSlotChange     = (s: DeliverySlot) => { setSlot(s); setError(null) }
  const onFreqChange     = (f: Frequency)    => { setFreq(f); setError(null) }
  const onDurationChange = (d: number)       => { setDuration(d); setError(null) }

  const [allItems,     setAllItems]     = useState<MenuItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [search,       setSearch]       = useState('')

  // quantities: { [itemId]: count } — 0 or absent means not selected
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (restoredConfig?.quantities) return restoredConfig.quantities
    if (restoredConfig?.selectedItemIds?.length) {
      return Object.fromEntries(restoredConfig.selectedItemIds.map(id => [id, 1]))
    }
    if (initialItem) return { [initialItem.id]: 1 }
    return {}
  })

  const [step,            setStep]           = useState<Step>(restoredConfig?.step ?? (restoredConfig ? 'confirm' : 'items'))
  const [loading,         setLoading]        = useState(false)
  const [error,           setError]          = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null)
  const [outOfArea,       setOutOfArea]      = useState(false)
  const [checkingArea,    setCheckingArea]   = useState(false)

  useScrollLock(true)

  useEffect(() => {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    fetch(`${sbUrl}/rest/v1/menu_items?is_available=eq.true&order=category.asc,name.asc`, {
      headers: { apikey: sbKey, 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then((rows: MenuItem[]) => setAllItems(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setItemsLoading(false))
  }, [])

  useEffect(() => {
    if (restoredConfig && profile && step === 'confirm') {
      clearPendingSubscription()
      if (!isProfileComplete(profile)) setStep('address')
    }
  }, [restoredConfig, profile, step])

  // Force-refresh addresses whenever the address step becomes active so that
  // addresses saved during a previous order flow are immediately visible.
  useEffect(() => {
    if (step === 'address') {
      fetchAddresses(true)
    }
  }, [step, fetchAddresses])

  // Derived
  const selectedItems  = allItems.filter(i => (quantities[i.id] ?? 0) > 0)
  const filteredItems  = allItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )
  const totalItemsCount = Object.values(quantities).reduce((s, q) => s + q, 0)

  const deliveries     = deliveriesCount(freq, duration)
  const discountRate   = DISCOUNT[duration]
  // food base = sum of (price × qty) per delivery × deliveries
  const perDeliveryFood = selectedItems.reduce((s, i) => s + i.price * (quantities[i.id] ?? 1), 0)
  const itemsBaseTotal  = perDeliveryFood * deliveries
  const discountAmt     = Math.floor(itemsBaseTotal * discountRate)
  const deliveryTotal   = deliveryFee * deliveries
  const finalTotal      = itemsBaseTotal - discountAmt + deliveryTotal

  const slotLabel     = SLOTS.find(s => s.value === slot)!
  const freqLabel     = FREQS.find(f => f.value === freq)!
  const durationLabel = DURATIONS.find(d => d.value === duration)!

  function setQty(id: string, qty: number) {
    setQuantities(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, 10) // cap at 10
      return next
    })
  }

  const handleAdvanceToConfirm = useCallback(() => {
    if (!profile) {
      savePendingSubscription({ selectedItemIds: Object.keys(quantities), quantities, slot, freq, duration })
      setStep('login')
      return
    }
    if (!isProfileComplete(profile) || !selectedAddress) {
      setOutOfArea(false); setStep('address')
      return
    }
    setStep('confirm')
  }, [profile, quantities, slot, freq, duration, selectedAddress])

  const handleSelectAddress = useCallback(async (addr: UserAddress) => {
    setOutOfArea(false); setCheckingArea(true)
    const coords = (addr.lat && addr.lng) ? { lat: addr.lat, lng: addr.lng } : null
    const result = await checkDelivery(coords, addr.pincode)
    setCheckingArea(false)
    if (!result.eligible) { setOutOfArea(true); return }
    setSelectedAddress(addr)
    setStep('confirm')
  }, [checkDelivery])

  async function handleSubscribe() {
    if (!profile) { router.push('/login'); return }
    if (!selectedAddress) { setStep('address'); return }

    setLoading(true); setError(null)
    try {
      // Build item list with quantities for the API
      const itemsPayload = selectedItems.map(i => ({ id: i.id, quantity: quantities[i.id] ?? 1 }))

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:         itemsPayload,
          // legacy field kept for backwards compat
          menu_item_ids: itemsPayload.map(i => i.id),
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
        setError(data.error ?? 'Failed to subscribe'); setLoading(false)
        if (data.error?.toLowerCase().includes('already have active subscriptions')) setStep('schedule')
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) { setError('Could not load payment gateway. Check your connection.'); setLoading(false); return }

      const rzp = new (window as any).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency,
        name:        'Fuelist',
        description: 'Meal Subscription',
        order_id:    data.order_id,
        prefill:     { name: profile.name, contact: profile.phone, email: profile.email },
        theme:       { color: '#f59e0b' },
        handler: async (response: any) => {
          setStep('paying')
          try {
            const verifyRes = await fetch('/api/subscriptions/verify', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            })
            if (!verifyRes.ok) throw new Error('Verification failed')
            setStep('success'); onSuccess?.()
          } catch {
            setError('Payment verified but activation failed. Contact support.')
            setStep('confirm')
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch {
      setError('Network error. Please try again.'); setLoading(false)
    }
  }

  const FLOW_STEPS: Step[] = ['items', 'schedule', 'address', 'confirm']
  const headerTitle =
    step === 'items'    ? 'Choose Your Meals'   :
    step === 'schedule' ? 'Set Your Schedule'   :
    step === 'address'  ? 'Delivery Address'    :
    step === 'confirm'  ? 'Review & Confirm'    :
    step === 'login'    ? 'Sign In to Continue' :
    step === 'paying'   ? 'Processing Payment'  : "You're All Set!"

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm touch-none animate-in fade-in duration-300"
      onClick={e => { if (e.target === e.currentTarget && step !== 'paying') onClose() }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl rounded-[2.5rem] bg-white shadow-premium overflow-hidden max-h-[92vh] flex flex-col border border-stone-100"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">{headerTitle}</h2>
            {step !== 'success' && step !== 'paying' && step !== 'login' && (
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-0.5">
                {totalItemsCount === 0 ? 'Pick your bowls' : `${totalItemsCount} portion${totalItemsCount !== 1 ? 's' : ''} · ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {step !== 'success' && step !== 'paying' && step !== 'login' && (
              <div className="hidden sm:flex gap-1.5">
                {FLOW_STEPS.map((s, i) => (
                  <div key={s} className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    (step === s || FLOW_STEPS.indexOf(step as any) > i) ? "w-6 bg-amber-500" : "w-1.5 bg-stone-100"
                  )} />
                ))}
              </div>
            )}
            {step !== 'paying' && (
              <button onClick={onClose} className="rounded-2xl p-2.5 text-stone-300 hover:text-stone-900 hover:bg-stone-50 transition-all">
                <Icon name="close" size={20} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          <AnimatePresence mode="wait">

            {/* ── Login ── */}
            {step === 'login' && (
              <motion.div key="login-step" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="px-10 py-12 text-center">
                <div className="mx-auto w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-8 shadow-inner">
                  <Icon name="security" size={40} />
                </div>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">Sign In to Continue</h3>
                <p className="mt-3 text-sm font-medium text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Your meal plan is ready. Sign in or create an account to confirm your subscription.
                </p>
                <div className="mt-8 rounded-3xl bg-stone-50 border border-stone-100 p-6 text-left space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 ml-1">Your Plan Summary</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="premium">{totalItemsCount} Portions</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{slotLabel.label}</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{freqLabel.label}</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{durationLabel.label}</Badge>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400">Total</span>
                    <span className="text-xl font-black text-stone-900 tracking-tighter">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={() => { savePendingSubscription({ selectedItemIds: Object.keys(quantities), quantities, slot, freq, duration }); router.push('/login?redirect=/menu') }} leftIcon={<Icon name="security" size={14} strokeWidth={2.5} />} className="py-6 shadow-premium">Sign In</Button>
                  <Button variant="secondary" onClick={() => { savePendingSubscription({ selectedItemIds: Object.keys(quantities), quantities, slot, freq, duration }); router.push('/signup?redirect=/menu') }} className="py-6">Create Account</Button>
                </div>
                <button onClick={() => setStep('schedule')} className="mt-8 text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors">Edit Schedule</button>
              </motion.div>
            )}

            {/* ── Address: out of area ── */}
            {step === 'address' && outOfArea && (
              <motion.div key="address-outofarea" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="flex flex-col items-center justify-center py-16 text-center px-10">
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-400 mb-6 border border-red-100">
                  <Icon name="error" size={40} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-stone-900 tracking-tight">Outside Delivery Area</h3>
                <p className="text-sm font-medium text-stone-400 mt-2 max-w-[260px] leading-relaxed">
                  We deliver within <span className="text-stone-700 font-black">{serviceAreaLabel}</span>. This address is outside our zone.
                </p>
                <Button variant="secondary" className="mt-8" onClick={() => setOutOfArea(false)}>Try Another Address</Button>
                <button onClick={() => setStep('schedule')} className="mt-4 text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors">Back to Schedule</button>
              </motion.div>
            )}

            {/* ── Address: checking ── */}
            {step === 'address' && checkingArea && !outOfArea && (
              <motion.div key="address-checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 border-[3px] border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-stone-400">Checking delivery coverage…</p>
              </motion.div>
            )}

            {/* ── Address: picker ── */}
            {step === 'address' && !outOfArea && !checkingArea && (
              <motion.div key="address-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6 py-6">
                <div className="mb-6">
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">Where should we deliver?</h3>
                  <p className="text-sm font-medium text-stone-400 mt-1">Select or add the address for your daily deliveries.</p>
                </div>
                {profile && !profile.phone && (
                  <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Icon name="phone" size={15} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-stone-900">Verify your phone first</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">We need your WhatsApp number for delivery updates.</p>
                      </div>
                    </div>
                    <PhoneOtpVerify compact onVerified={async () => { await reloadProfile() }} />
                  </div>
                )}
                <AddressManager hideHeader selectedId={selectedAddress?.id} onSelect={handleSelectAddress} />
                <button onClick={() => setStep('schedule')} className="mt-8 w-full text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors">Back to Schedule</button>
              </motion.div>
            )}

            {/* ── Items picker ── */}
            {step === 'items' && (
              <motion.div key="items-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 py-5 space-y-4">
                {/* Search */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-amber-500 transition-colors">
                    <Icon name="search" size={16} strokeWidth={3} />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search bowls or drinks…"
                    className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50 pl-10 pr-4 py-3 text-sm font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-amber-300 focus:bg-white transition-all"
                  />
                </div>

                {/* Grid */}
                {itemsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map(i => <div key={i} className="h-52 bg-stone-50 rounded-2xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredItems.map(item => {
                      const qty       = quantities[item.id] ?? 0
                      const isSelected = qty > 0
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className={cn(
                            "relative rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col",
                            isSelected
                              ? "border-amber-400 shadow-md shadow-amber-100"
                              : "border-stone-100 hover:border-stone-200"
                          )}
                        >
                          {/* Image */}
                          <div className="relative h-32 w-full bg-stone-100 shrink-0">
                            {item.image_url
                              ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="50vw" />
                              : <div className="flex h-full items-center justify-center text-stone-300"><Icon name="bowl" size={32} /></div>
                            }
                            {/* Serving size badge */}
                            <div className="absolute top-2 left-2">
                              <span className="text-[8px] font-black bg-stone-900/70 text-white backdrop-blur-sm rounded-full px-2 py-0.5 uppercase tracking-wide">
                                {getServingSize(item.category)}
                              </span>
                            </div>
                            {/* Price badge */}
                            <div className="absolute top-2 right-2">
                              <span className="text-[9px] font-black bg-white/90 text-amber-600 rounded-full px-2 py-0.5 shadow-sm">
                                {formatPrice(item.price)}
                              </span>
                            </div>
                            {/* Selection tick */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-amber-500/10" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex flex-col gap-2 p-2.5 flex-1">
                            <p className="text-[11px] font-black text-stone-900 leading-tight capitalize line-clamp-2">{item.name}</p>

                            {/* Macros */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded-md bg-orange-50 text-[8px] font-black text-orange-500 border border-orange-100">
                                {item.calories} kcal
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[8px] font-black text-blue-600 border border-blue-100">
                                P {item.protein}g
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-[8px] font-black text-emerald-600 border border-emerald-100">
                                C {item.carbs}g
                              </span>
                            </div>

                            {/* Quantity control */}
                            <div className="mt-auto">
                              {qty === 0 ? (
                                <button
                                  onClick={() => setQty(item.id, 1)}
                                  className="w-full py-1.5 rounded-xl bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-colors"
                                >
                                  + Add
                                </button>
                              ) : (
                                <div className="flex items-center justify-between rounded-xl bg-amber-500 px-1 py-0.5">
                                  <button
                                    onClick={() => setQty(item.id, qty - 1)}
                                    className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black text-base transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="text-[12px] font-black text-white tracking-tight">{qty}</span>
                                  <button
                                    onClick={() => setQty(item.id, qty + 1)}
                                    className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-black text-base transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Schedule ── */}
            {step === 'schedule' && (
              <motion.div key="schedule-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 py-4 space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-0.5">Delivery Time</p>
                  <div className="flex gap-2">
                    {SLOTS.map(s => (
                      <button key={s.value} onClick={() => onSlotChange(s.value)} className={cn(
                        "flex-1 flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 px-1 transition-all duration-200",
                        slot === s.value ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-100" : "border-stone-100 bg-stone-50 hover:border-stone-200"
                      )}>
                        <Icon name={s.icon} size={16} strokeWidth={2.5} className={slot === s.value ? "text-amber-500" : "text-stone-400"} />
                        <p className={cn("text-[10px] font-black tracking-tight", slot === s.value ? "text-amber-700" : "text-stone-600")}>{s.label}</p>
                        <p className="text-[9px] text-stone-400 leading-none">{s.time}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-0.5">Frequency</p>
                    <div className="flex flex-col gap-1.5">
                      {FREQS.map(f => (
                        <button key={f.value} onClick={() => onFreqChange(f.value)} className={cn(
                          "w-full flex items-center justify-between rounded-xl border-2 px-3 py-2 transition-all duration-200",
                          freq === f.value ? "border-amber-500 bg-amber-50" : "border-stone-100 bg-stone-50 hover:border-stone-200"
                        )}>
                          <div className="text-left">
                            <p className={cn("text-[11px] font-black tracking-tight", freq === f.value ? "text-amber-700" : "text-stone-700")}>{f.label}</p>
                            <p className="text-[9px] text-stone-400">{f.desc}</p>
                          </div>
                          {freq === f.value && <div className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0"><Icon name="success" size={8} strokeWidth={4} className="text-white" /></div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-0.5">Duration</p>
                    <div className="flex flex-col gap-1.5">
                      {DURATIONS.map(d => (
                        <button key={d.value} onClick={() => onDurationChange(d.value)} className={cn(
                          "relative w-full flex items-center justify-between rounded-xl border-2 px-3 py-2 transition-all duration-200",
                          duration === d.value ? "border-amber-500 bg-amber-50" : "border-stone-100 bg-stone-50 hover:border-stone-200"
                        )}>
                          <p className={cn("text-[11px] font-black tracking-tight", duration === d.value ? "text-amber-700" : "text-stone-700")}>{d.label}</p>
                          {d.badge && <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{d.badge}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cost breakdown card */}
                <div className="rounded-2xl bg-stone-900 overflow-hidden border border-white/5">
                  <div className="flex">
                    <div className="flex-1 min-w-0 p-4 border-r border-white/10 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Your Plan</p>
                      <div className="space-y-1.5 max-h-24 overflow-hidden">
                        {selectedItems.length === 0
                          ? <p className="text-[9px] text-white/30">No items selected</p>
                          : selectedItems.slice(0, 4).map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="relative h-5 w-5 rounded-md overflow-hidden shrink-0 bg-white/10">
                                {item.image_url ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="20px" /> : <Icon name="bowl" size={10} className="m-auto text-white/40" />}
                              </div>
                              <p className="text-[10px] font-black text-white/80 truncate flex-1">{item.name}</p>
                              <span className="text-[8px] font-black text-white/40 shrink-0">{getServingSize(item.category)}</span>
                              {(quantities[item.id] ?? 1) > 1 && (
                                <span className="text-[8px] font-black text-amber-400 shrink-0">×{quantities[item.id]}</span>
                              )}
                            </div>
                          ))
                        }
                        {selectedItems.length > 4 && <p className="text-[9px] font-black text-amber-400">+{selectedItems.length - 4} more</p>}
                      </div>
                      <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1">
                        <span className="text-[9px] font-black bg-white/10 text-white/60 rounded-full px-2 py-0.5">{slotLabel.label}</span>
                        <span className="text-[9px] font-black bg-white/10 text-white/60 rounded-full px-2 py-0.5">{freqLabel.label}</span>
                        <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5">{duration}d · {deliveries} deliveries</span>
                      </div>
                    </div>
                    <div className="w-40 shrink-0 p-4 space-y-2 relative">
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Breakdown</p>
                      <div className="space-y-1 text-[10px] font-bold">
                        <div className="flex justify-between text-white/50">
                          <span>Food ({deliveries}×)</span>
                          <span>{formatPrice(itemsBaseTotal)}</span>
                        </div>
                        <div className="flex justify-between text-white/50">
                          <span>Delivery ({deliveries}×)</span>
                          <span>{formatPrice(deliveryTotal)}</span>
                        </div>
                        {discountAmt > 0 && (
                          <div className="flex justify-between text-amber-400">
                            <span>Discount</span>
                            <span>−{formatPrice(discountAmt)}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Total</p>
                          <p className="text-2xl font-black tracking-tighter text-amber-500">{formatPrice(finalTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Confirm ── */}
            {step === 'confirm' && (
              <motion.div key="confirm-step" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="px-6 py-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1.5">Delivery Time</p>
                    <div className="flex items-center gap-2">
                      <Icon name={slotLabel.icon} size={14} className="text-amber-500" />
                      <span className="text-xs font-black text-stone-900">{slotLabel.label}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1.5">Frequency</p>
                    <span className="text-xs font-black text-stone-900">{freqLabel.label} · {duration}d</span>
                  </div>
                  <div className="col-span-2 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-300 mb-1.5">Deliver To</p>
                    <p className="text-xs font-bold text-stone-600 truncate capitalize">
                      {selectedAddress ? [selectedAddress.house_number, selectedAddress.street_address, selectedAddress.city].filter(Boolean).join(', ') : 'No Address'}
                    </p>
                  </div>
                </div>

                {/* Meals */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2 ml-0.5">Your Meals ({totalItemsCount} portions)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 bg-white border border-stone-100 rounded-2xl">
                        <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-stone-50">
                          {item.image_url ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="40px" /> : <Icon name="bowl" size={16} className="m-auto" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black capitalize text-stone-900 truncate leading-tight">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-black text-amber-500">{getServingSize(item.category)}</span>
                            <span className="text-stone-200">·</span>
                            <span className="text-[9px] font-bold text-stone-400">{item.calories} kcal</span>
                          </div>
                        </div>
                        {/* Quantity badge */}
                        <div className="shrink-0 h-7 w-7 rounded-xl bg-amber-500 flex items-center justify-center">
                          <span className="text-[11px] font-black text-white">×{quantities[item.id] ?? 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="rounded-2xl bg-stone-900 overflow-hidden border border-white/5">
                  <div className="px-5 py-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-3">Price Breakdown</p>
                    <div className="space-y-2 text-[10px] font-bold">
                      <div className="flex justify-between text-white/50">
                        <span>Food × {deliveries} deliveries</span>
                        <span>{formatPrice(itemsBaseTotal)}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>Delivery × {deliveries}</span>
                        <span>{formatPrice(deliveryTotal)}</span>
                      </div>
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount ({Math.round(discountRate * 100)}% off food)</span>
                          <span>−{formatPrice(discountAmt)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total</span>
                      <span className="text-2xl font-black tracking-tighter text-amber-500">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Paying ── */}
            {step === 'paying' && (
              <motion.div key="paying-state" className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-8">
                <div className="relative">
                  <div className="h-20 w-20 border-4 border-amber-500/20 rounded-full" />
                  <motion.div className="absolute inset-0 h-20 w-20 border-4 border-amber-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black capitalize tracking-tighter text-stone-900">Activating Your Plan</h3>
                  <p className="text-[11px] font-black capitalize tracking-widest text-stone-300">Processing payment…</p>
                </div>
              </motion.div>
            )}

            {/* ── Success ── */}
            {step === 'success' && (
              <motion.div key="success-state" className="px-10 py-16 text-center">
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-8 shadow-inner shadow-emerald-100">
                  <Icon name="success" size={48} strokeWidth={3} />
                </div>
                <h3 className="text-3xl font-black text-stone-900 tracking-tighter">You're All Set!</h3>
                <p className="mt-4 text-sm font-medium text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Your subscription is active. First delivery during the <span className="text-stone-900 font-black">{slotLabel.label}</span> slot.
                </p>
                <div className="mt-10 p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 text-xs font-bold text-emerald-700 capitalize tracking-widest">
                  Track your deliveries in your account dashboard.
                </div>
                <Button onClick={onClose} size="lg" leftIcon={<Icon name="checkCircle" size={16} strokeWidth={2.5} />} className="mt-10 w-full">Done</Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer CTA ── */}
        <AnimatePresence>
          {step === 'items' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-5 py-4 border-t border-stone-800 bg-stone-900">
              {totalItemsCount > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 text-center mb-3">
                  {totalItemsCount} portion{totalItemsCount !== 1 ? 's' : ''} · {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                </p>
              )}
              <Button size="lg" onClick={() => setStep('schedule')} disabled={totalItemsCount === 0} className="w-full">
                {totalItemsCount === 0 ? 'Add items to continue' : `Next: Set Schedule • ${formatPrice(perDeliveryFood)}/delivery`}
              </Button>
            </motion.div>
          )}
          {step === 'schedule' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-5 py-4 border-t border-stone-800 bg-stone-900 space-y-3">
              {error && <p className="text-center text-xs font-black uppercase tracking-widest text-red-400">{error}</p>}
              <Button size="lg" onClick={handleAdvanceToConfirm} className="w-full">Next: Confirm Address</Button>
              <button onClick={() => setStep('items')} className="w-full text-xs font-black uppercase tracking-widest text-stone-500 hover:text-white transition-colors">Back to Meals</button>
            </motion.div>
          )}
          {step === 'address' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-5 py-4 border-t border-stone-800 bg-stone-900">
              <p className="text-center text-xs font-black uppercase tracking-widest text-stone-500 flex items-center justify-center gap-2">
                {checkingArea && <span className="h-3 w-3 border-2 border-stone-600 border-t-amber-500 rounded-full animate-spin inline-block" />}
                {checkingArea ? 'Checking coverage…' : outOfArea ? 'Address outside delivery area' : 'Select a delivery address to continue'}
              </p>
            </motion.div>
          )}
          {step === 'confirm' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-5 py-4 border-t border-stone-800 bg-stone-900 space-y-3">
              {error && <p className="text-center text-xs font-black uppercase tracking-widest text-red-400">{error}</p>}
              <Button size="lg" onClick={handleSubscribe} disabled={loading || !isEnabled} className="w-full">
                {loading
                  ? <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : isEnabled ? `Confirm & Pay • ${formatPrice(finalTotal)}` : 'Store Currently Closed'}
              </Button>
              <button onClick={() => { setOutOfArea(false); setStep('address') }} className="w-full text-xs font-black uppercase tracking-widest text-stone-500 hover:text-white transition-colors">Change Address</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
