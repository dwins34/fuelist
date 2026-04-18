'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem } from '@/types'
import { formatPrice, getImageUrl, categoryLabel } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { useDeliveryCheck } from '@/hooks/useDeliveryCheck'
import { useScrollLock } from '@/hooks/useScrollLock'
import PhoneOtpVerify from '@/components/ui/PhoneOtpVerify'
import { useRouter } from 'next/navigation'
import AddressManager from '@/components/account/AddressManager'
import { UserAddress } from '@/hooks/useAddresses'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Config ───────────────────────────────────────────────────────────────────

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

function deliveriesCount(freq: Frequency, duration: number) {
  const perWeek = freq === 'daily' ? 7 : freq === 'weekdays' ? 5 : 2
  return Math.round((perWeek * duration) / 7)
}

function isProfileComplete(profile: { name: string; phone: string } | null): boolean {
  if (!profile) return false
  return !!(profile.name?.trim() && profile.phone?.trim())
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubscriptionModal({ initialItem, onClose, onSuccess, restoredConfig }: SubscriptionModalProps) {
  const { profile, reloadProfile } = useAuthContext()
  const { isEnabled, serviceAreaLabel } = useServiceStatus()
  const { check: checkDelivery } = useDeliveryCheck()
  const router = useRouter()

  const [slot,     setSlot]     = useState<DeliverySlot>(restoredConfig?.slot ?? 'morning')
  const [freq,     setFreq]     = useState<Frequency>(restoredConfig?.freq ?? 'daily')
  const [duration, setDuration] = useState<number>(restoredConfig?.duration ?? 7)

  const onSlotChange = (s: DeliverySlot) => { setSlot(s); setError(null) }
  const onFreqChange = (f: Frequency) => { setFreq(f); setError(null) }
  const onDurationChange = (d: number) => { setDuration(d); setError(null) }

  const [allItems,  setAllItems]  = useState<MenuItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [selected, setSelected]  = useState<Set<string>>(
    restoredConfig
      ? new Set(restoredConfig.selectedItemIds)
      : initialItem ? new Set([initialItem.id]) : new Set()
  )
  const [search, setSearch] = useState('')

  const [step,         setStep]         = useState<Step>(restoredConfig?.step ?? (restoredConfig ? 'confirm' : 'items'))
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null)
  const [outOfArea,    setOutOfArea]    = useState(false)
  const [checkingArea, setCheckingArea] = useState(false)
  const [showAllSummaryItems, setShowAllSummaryItems] = useState(false)

  useScrollLock(true)

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

  useEffect(() => {
    if (restoredConfig && profile && step === 'confirm') {
      clearPendingSubscription()
      if (!isProfileComplete(profile)) {
        setStep('address')
      }
    }
  }, [restoredConfig, profile, step])

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
      setOutOfArea(false)
      setStep('address')
      return
    }

    setStep('confirm')
  }, [profile, selected, slot, freq, duration, selectedAddress])

  const handleSelectAddress = useCallback(async (addr: UserAddress) => {
    setOutOfArea(false)
    setCheckingArea(true)

    const coords = (addr.lat && addr.lng) ? { lat: addr.lat, lng: addr.lng } : null
    const result = await checkDelivery(coords, addr.pincode)

    setCheckingArea(false)

    if (!result.eligible) {
      // Do NOT commit the address — keeps selectedAddress null so
      // handleAdvanceToConfirm correctly routes back here next time.
      setOutOfArea(true)
      return
    }

    setSelectedAddress(addr)   // only set after eligibility confirmed
    setStep('confirm')
  }, [checkDelivery])

  async function handleSubscribe() {
    if (!profile) { router.push('/login'); return }
    if (!selectedAddress) { setStep('address'); return }

    setLoading(true)
    setError(null)

    try {
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
        if (data.error?.toLowerCase().includes('already have active subscriptions')) {
          setStep('schedule')
        }
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setError('Could not load payment gateway. Check your connection.')
        setLoading(false)
        return
      }

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
        theme: { color: '#f59e0b' },
        handler: async (response: any) => {
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
        modal: { ondismiss: () => { setLoading(false) } },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()

    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const FLOW_STEPS: Step[] = ['items', 'schedule', 'address', 'confirm']
  const headerTitle =
    step === 'items'    ? 'Choose Your Meals'    :
    step === 'schedule' ? 'Set Your Schedule'    :
    step === 'address'  ? 'Delivery Address'     :
    step === 'confirm'  ? 'Review & Confirm'     :
    step === 'login'    ? 'Sign In to Continue'  :
    step === 'paying'   ? 'Processing Payment'   :
                          "You're All Set!"

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm touch-none transition-all animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'paying') onClose() }}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl rounded-[2.5rem] bg-white shadow-premium overflow-hidden max-h-[92vh] flex flex-col border border-stone-100"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">{headerTitle}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {step !== 'success' && step !== 'paying' && step !== 'login' && (
                <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">
                  {selected.size === 0 ? 'Pick your bowls' :
                   `${selected.size} Item${selected.size !== 1 ? 's' : ''} Selected`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
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
            
            {/* Login / Auth Required */}
            {step === 'login' && (
              <motion.div 
                key="login-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="px-10 py-12 text-center"
              >
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
                    <Badge variant="premium">{selected.size} Items</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{slotLabel.label}</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{freqLabel.label}</Badge>
                    <Badge variant="secondary" className="bg-white border-none shadow-sm">{durationLabel.label}</Badge>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                     <span className="text-xs font-bold text-stone-400">Subtotal</span>
                     <span className="text-xl font-black text-stone-900 tracking-tighter">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={() => {
                      savePendingSubscription({ selectedItemIds: Array.from(selected), slot, freq, duration })
                      router.push('/login?redirect=/menu')
                    }}
                    leftIcon={<Icon name="security" size={14} strokeWidth={2.5} />}
                    className="py-6 shadow-premium"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      savePendingSubscription({ selectedItemIds: Array.from(selected), slot, freq, duration })
                      router.push('/signup?redirect=/menu')
                    }}
                    className="py-6"
                  >
                    Create Account
                  </Button>
                </div>
                <button onClick={() => setStep('schedule')} className="mt-8 text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors">
                  Edit Schedule
                </button>
              </motion.div>
            )}

            {/* Address step — out of area fallback */}
            {step === 'address' && outOfArea && (
              <motion.div
                key="address-outofarea"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex flex-col items-center justify-center py-16 text-center px-10"
              >
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-400 mb-6 border border-red-100 shadow-sm shadow-red-100">
                  <Icon name="error" size={40} strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-stone-900 tracking-tight">Outside Delivery Area</h3>
                <p className="text-sm font-medium text-stone-400 mt-2 max-w-[260px] leading-relaxed">
                  We currently deliver within <span className="text-stone-700 font-black">{serviceAreaLabel}</span>. The selected address is outside our delivery zone.
                </p>
                <Button
                  variant="secondary"
                  className="mt-8"
                  onClick={() => setOutOfArea(false)}
                >
                  Try Another Address
                </Button>
                <button
                  onClick={() => setStep('schedule')}
                  className="mt-4 text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors"
                >
                  Back to Schedule
                </button>
              </motion.div>
            )}

            {/* Address step — checking loader */}
            {step === 'address' && checkingArea && !outOfArea && (
              <motion.div
                key="address-checking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-4"
              >
                <div className="h-10 w-10 border-[3px] border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-stone-400">Checking delivery coverage…</p>
              </motion.div>
            )}

            {/* Address step — picker */}
            {step === 'address' && !outOfArea && !checkingArea && (
              <motion.div
                key="address-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6 py-6"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">Where should we deliver?</h3>
                  <p className="text-sm font-medium text-stone-400 mt-1">Select or add the address for your daily deliveries.</p>
                </div>

                {/* Phone verification — shown when profile has no phone yet */}
                {profile && !profile.phone && (
                  <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Icon name="phone" size={15} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-stone-900">Verify your phone first</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">We need your WhatsApp number for delivery updates.</p>
                      </div>
                    </div>
                    <PhoneOtpVerify
                      compact
                      onVerified={async (phone) => {
                        await reloadProfile()
                      }}
                    />
                  </div>
                )}

                <AddressManager hideHeader selectedId={selectedAddress?.id} onSelect={handleSelectAddress} />

                <button onClick={() => setStep('schedule')} className="mt-8 w-full text-[10px] font-black capitalize tracking-widest text-stone-300 hover:text-stone-900 transition-colors">
                  Back to Schedule
                </button>
              </motion.div>
            )}

            {/* Items Picker */}
            {step === 'items' && (
              <motion.div 
                key="items-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-6 space-y-5"
              >
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-amber-500 transition-colors">
                    <Icon name="search" size={18} strokeWidth={3} />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find your favorite bowls..."
                    className="w-full rounded-2xl border-2 border-stone-50 bg-stone-50/50 pl-12 pr-6 py-4 text-sm font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-amber-200 focus:bg-white transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  {itemsLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-stone-50 rounded-3xl" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredItems.map((item) => {
                        const isSelected = selected.has(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                              "relative w-full flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition-all duration-300 group",
                              isSelected
                                ? "border-amber-500 bg-white shadow-lg shadow-amber-100 -translate-y-0.5"
                                : "border-stone-50 bg-stone-50/30 hover:border-stone-100 hover:bg-white"
                            )}
                          >
                            <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-white shadow-sm">
                              {item.image_url ? (
                                <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                              ) : <Icon name="bowl" size={24} className="m-auto" />}
                            </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-start justify-between gap-2">
                                 <p className="text-xs font-black text-stone-900 leading-tight capitalize tracking-tight whitespace-normal">{item.name}</p>
                                 <p className="text-[10px] font-black text-amber-600 shrink-0">{formatPrice(item.price)}</p>
                               </div>
                               
                               <div className="flex items-center gap-1.5 mt-2">
                                 <span className="px-1.5 py-0.5 rounded-lg bg-stone-100 text-[8px] font-black text-stone-500 uppercase tracking-tighter">
                                   {item.calories} kcal
                                 </span>
                                 <span className="px-1.5 py-0.5 rounded-lg bg-blue-50 text-[8px] font-black text-blue-600 uppercase tracking-tighter">
                                   P {item.protein}g
                                 </span>
                                 <span className="px-1.5 py-0.5 rounded-lg bg-emerald-50 text-[8px] font-black text-emerald-600 uppercase tracking-tighter">
                                   C {item.carbs}g
                                 </span>
                               </div>
                             </div>
                            <div className={cn(
                              "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                              isSelected ? "bg-amber-500 border-amber-500 shadow-sm" : "border-stone-100"
                            )}>
                              {isSelected && <Icon name="success" size={10} strokeWidth={4} className="text-white" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Schedule Step */}
            {step === 'schedule' && (
              <motion.div 
                key="schedule-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6 py-6 space-y-7"
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-300 mb-4 ml-1">Delivery Time</p>
                  <div className="grid grid-cols-3 gap-3">
                    {SLOTS.map((s) => (
                      <button key={s.value} onClick={() => onSlotChange(s.value)}
                        className={cn(
                          "rounded-3xl border-2 p-5 text-center transition-all duration-300",
                          slot === s.value ? "border-amber-500 bg-white shadow-lg shadow-amber-100 -translate-y-1" : "border-stone-50 bg-stone-50/30 hover:border-stone-100 hover:bg-white"
                        )}
                      >
                        <div className={cn("text-amber-500 mb-3 flex justify-center", slot === s.value ? "animate-bounce" : "")}>
                          <Icon name={s.icon} size={24} strokeWidth={2.5} />
                        </div>
                        <p className="text-xs font-black text-stone-900 capitalize tracking-tight">{s.label}</p>
                        <p className="text-[10px] font-bold text-stone-400 mt-1 opacity-60 leading-none">{s.time}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-300 mb-4 ml-1">Delivery Frequency</p>
                  <div className="grid grid-cols-1 gap-3">
                    {FREQS.map((f) => (
                      <button key={f.value} onClick={() => onFreqChange(f.value)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-3xl border-2 px-6 py-4 transition-all duration-300",
                          freq === f.value ? "border-amber-500 bg-white shadow-lg shadow-amber-100" : "border-stone-50 bg-stone-50/30 hover:border-stone-100 hover:bg-white"
                        )}
                      >
                        <div className="text-left">
                          <p className="text-sm font-black text-stone-900 capitalize tracking-tight">{f.label}</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-0.5 tracking-wide">{f.desc}</p>
                        </div>
                        {freq === f.value && (
                           <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                             <Icon name="success" size={14} strokeWidth={4} className="text-white" />
                           </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-300 mb-4 ml-1">Plan Duration</p>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATIONS.map((d) => (
                      <button key={d.value} onClick={() => onDurationChange(d.value)}
                        className={cn(
                          "relative rounded-3xl border-2 p-5 text-center transition-all duration-300",
                          duration === d.value ? "border-amber-500 bg-white shadow-lg shadow-amber-100 -translate-y-1" : "border-stone-50 bg-stone-50/30 hover:border-stone-100 hover:bg-white"
                        )}
                      >
                        <p className="text-sm font-black text-stone-900 capitalize tracking-tight">{d.label}</p>
                        {d.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            {d.badge}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary + Price Card */}
                <div className="rounded-[2rem] bg-stone-900 text-white overflow-hidden shadow-premium border border-white/5">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left: Plan Summary */}
                    <div className="flex-1 min-w-0 p-5 border-b sm:border-b-0 sm:border-r border-white/10 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Your Plan</p>
                      {/* Items */}
                      <div className={cn("space-y-2", showAllSummaryItems && "max-h-48 overflow-y-auto custom-scrollbar pr-2")}>
                        {(showAllSummaryItems ? selectedItems : selectedItems.slice(0, 3)).map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <div className="relative h-7 w-7 rounded-lg overflow-hidden shrink-0 bg-white/10">
                              {item.image_url ? (
                                <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 150px" />
                              ) : (
                                <Icon name="bowl" size={12} className="m-auto text-white/40" />
                              )}
                            </div>
                            <p className="text-[11px] font-black capitalize tracking-tight text-white/80 whitespace-normal">{item.name}</p>
                          </div>
                        ))}
                        {selectedItems.length === 0 && (
                          <p className="text-[10px] text-white/30 font-bold">No items selected</p>
                        )}
                        {!showAllSummaryItems && selectedItems.length > 3 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAllSummaryItems(true) }}
                            className="w-full text-center py-2 mt-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-amber-400 hover:bg-white/10 transition-all uppercase tracking-widest"
                          >
                            +{selectedItems.length - 3} More Items
                          </button>
                        )}
                        {showAllSummaryItems && selectedItems.length > 3 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAllSummaryItems(false) }}
                            className="w-full text-center py-2 mt-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-stone-400 hover:bg-white/10 transition-all uppercase tracking-widest"
                          >
                            Show Less
                          </button>
                        )}
                      </div>
                      {/* Schedule pills */}
                      <div className="pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/60 rounded-full px-2.5 py-0.5">{slotLabel.label}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/60 rounded-full px-2.5 py-0.5">{freqLabel.label}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 rounded-full px-2.5 py-0.5">{duration}d</span>
                      </div>
                    </div>
                    {/* Right: Price Breakdown */}
                    <div className="w-36 shrink-0 p-5 space-y-3 relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 h-20 w-20 bg-amber-500/10 blur-2xl rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 relative z-10">Total Cost</p>
                      <div className="space-y-2 relative z-10">
                        <div className="flex justify-between items-baseline opacity-40">
                          <span className="text-[10px] font-black uppercase tracking-widest">Base</span>
                          <span className="text-xs font-bold">{formatPrice(baseTotal)}</span>
                        </div>
                        {discountAmt > 0 && (
                          <div className="flex justify-between items-baseline text-amber-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">Off</span>
                            <span className="text-xs font-bold">−{formatPrice(discountAmt)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-white/10 mt-2">
                          <span className="text-3xl font-black tracking-tighter text-amber-500">{formatPrice(finalTotal)}</span>
                          <p className="text-[10px] font-bold text-white/40 mt-1">{deliveries} deliveries</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && (
              <motion.div 
                key="confirm-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="px-8 py-8 space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-stone-50 border border-stone-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 mb-2">Delivery Time</p>
                    <div className="flex items-center gap-3">
                       <Icon name={slotLabel.icon} size={18} className="text-amber-500" />
                       <span className="text-sm font-black capitalize tracking-tight text-stone-900">{slotLabel.label}</span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-stone-50 border border-stone-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 mb-2">Frequency</p>
                    <span className="text-sm font-black capitalize tracking-tight text-stone-900">{freqLabel.label}</span>
                  </div>
                  <div className="col-span-2 p-5 rounded-3xl bg-stone-50 border border-stone-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 mb-2">Deliver To</p>
                    <p className="text-xs font-bold text-stone-600 truncate capitalize tracking-tight">
                        {selectedAddress ? [selectedAddress.house_number, selectedAddress.street_address, selectedAddress.city].filter(Boolean).join(', ') : 'No Address'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-300 ml-1">Your Meals ({selectedItems.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 pr-4 bg-white border border-stone-50 rounded-2xl shadow-sm">
                        <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-stone-50 shadow-inner">
                          {item.image_url ? (
                            <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 150px" />
                          ) : <Icon name="bowl" size={16} className="m-auto" />}
                        </div>
                        <p className="text-xs font-black capitalize tracking-tight text-stone-900 whitespace-normal">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* State: Paying */}
            {step === 'paying' && (
              <motion.div key="paying-state" className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-8">
                 <div className="relative">
                    <div className="h-20 w-20 border-4 border-amber-500/20 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 h-20 w-20 border-4 border-amber-500 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-black capitalize tracking-tighter text-stone-900">Activating Your Plan</h3>
                   <p className="text-[11px] font-black capitalize tracking-widest text-stone-300">Processing payment…</p>
                 </div>
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div key="success-state" className="px-10 py-16 text-center">
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mb-8 shadow-inner shadow-emerald-100 scale-110">
                   <Icon name="success" size={48} strokeWidth={3} />
                </div>
                <h3 className="text-3xl font-black text-stone-900 tracking-tighter">You're All Set!</h3>
                <p className="mt-4 text-sm font-medium text-stone-400 max-w-xs mx-auto leading-relaxed">
                  Your subscription is active. Your first delivery will arrive during the <span className="text-stone-900 font-black">{slotLabel.label}</span> slot.
                </p>
                <div className="mt-10 p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 text-xs font-bold text-emerald-700 capitalize tracking-widest">
                  Track your deliveries in your account dashboard.
                </div>
                <Button onClick={onClose} size="lg" leftIcon={<Icon name="checkCircle" size={16} strokeWidth={2.5} />} className="mt-10 w-full">
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer CTA ── */}
        <AnimatePresence>
          {step === 'items' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-6 py-5 border-t border-stone-800 bg-stone-900">
              {selected.size > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 text-center mb-3">
                  {selected.size} item{selected.size !== 1 ? 's' : ''} selected
                </p>
              )}
              <Button
                size="lg"
                onClick={() => setStep('schedule')}
                disabled={selected.size === 0}
                className="w-full"
              >
                {selected.size === 0 
                  ? 'Next: Set Schedule' 
                  : `Next: Set Schedule • ${formatPrice(selectedItems.reduce((s, i) => s + i.price, 0))}`
                }
              </Button>
            </motion.div>
          )}

          {step === 'schedule' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-6 py-5 border-t border-stone-800 bg-stone-900 space-y-3">
              {error && <p className="text-center text-xs font-black uppercase tracking-widest text-red-400 mb-2">{error}</p>}
              <Button size="lg" onClick={handleAdvanceToConfirm} className="w-full">
                Next: Confirm Address
              </Button>
              <button onClick={() => setStep('items')} className="w-full text-xs font-black uppercase tracking-widest text-stone-500 hover:text-white transition-colors">Back to Meals</button>
            </motion.div>
          )}

          {step === 'address' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-6 py-5 border-t border-stone-800 bg-stone-900">
              <p className="text-center text-xs font-black uppercase tracking-widest text-stone-500 flex items-center justify-center gap-2">
                {checkingArea && <span className="h-3 w-3 border-2 border-stone-600 border-t-amber-500 rounded-full animate-spin inline-block" />}
                {checkingArea ? 'Checking coverage…' : outOfArea ? 'Address outside delivery area' : 'Select a delivery address to continue'}
              </p>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="px-6 py-5 border-t border-stone-800 bg-stone-900 space-y-3">
              {error && <p className="text-center text-xs font-black uppercase tracking-widest text-red-400 mb-2">{error}</p>}
              <Button
                size="lg"
                onClick={handleSubscribe}
                disabled={loading || !isEnabled}
                className="w-full"
              >
                {loading
                  ? <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : isEnabled
                    ? `Confirm & Pay • ${formatPrice(finalTotal)}`
                    : 'Store Currently Closed'}
              </Button>
              <button onClick={() => { setOutOfArea(false); setStep('address') }} className="w-full text-xs font-black uppercase tracking-widest text-stone-500 hover:text-white transition-colors">Change Address</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
