'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { formatPrice, getServingSize } from '@/lib/utils'
import { DeliveryAddress } from '@/lib/whatsapp'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { useDeliveryCheck } from '@/hooks/useDeliveryCheck'
import { useScrollLock } from '@/hooks/useScrollLock'
import { Icon } from '@/lib/icons'
import CouponInput from '@/components/CouponInput'
import RewardPointsToggle from '@/components/RewardPointsToggle'
import AddressManager from '@/components/account/AddressManager'
import { useAddresses, UserAddress } from '@/hooks/useAddresses'
import { ApplyCouponResult } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneOtpVerify from '@/components/ui/PhoneOtpVerify'
import { cn } from '@/lib/utils'

// Extend Window to hold the Razorpay constructor
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on?(event: string, handler: () => void): void }
  }
}

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

interface AddressErrors {
  name?: string
  phone?: string
  address_line1?: string
  city?: string
  pincode?: string
}

const CART_DRAWER_KEY = 'fuelist_cart_drawer_state'

export function saveCartDrawerState(state: { step: string; address: DeliveryAddress }) {
  try { localStorage.setItem(CART_DRAWER_KEY, JSON.stringify(state)) } catch {}
}

export function loadCartDrawerState(): { step: string; address: DeliveryAddress } | null {
  try {
    const raw = localStorage.getItem(CART_DRAWER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearCartDrawerState() {
  try { localStorage.removeItem(CART_DRAWER_KEY) } catch {}
}

// ── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; message: string; type: 'error' | 'success' | 'info' }

function CartToast({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none w-[calc(100vw-2rem)] max-w-xs">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black shadow-xl border w-full',
              t.type === 'error'   && 'bg-white text-rose-700 border-rose-100',
              t.type === 'success' && 'bg-white text-emerald-700 border-emerald-100',
              t.type === 'info'    && 'bg-white text-amber-700 border-amber-100',
            )}
          >
            <Icon
              name={t.type === 'error' ? 'error' : t.type === 'success' ? 'success' : 'info'}
              size={14}
              strokeWidth={3}
              className={cn(
                t.type === 'error'   && 'text-rose-500',
                t.type === 'success' && 'text-emerald-500',
                t.type === 'info'    && 'text-amber-500',
              )}
            />
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function validateAddress(a: DeliveryAddress): AddressErrors {
  const errs: AddressErrors = {}
  if (!a.name.trim()) errs.name = 'Name is required.'
  else if (a.name.trim().length < 2) errs.name = 'Enter your full name.'

  const rawPhone = a.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone) errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone)) errs.phone = 'Enter a valid phone number.'

  if (!a.address_line1.trim()) errs.address_line1 = 'Address is required.'
  else if (a.address_line1.trim().length < 1) errs.address_line1 = 'Please enter a complete address.'

  if (!a.city.trim()) errs.city = 'City is required.'

  if (!a.pincode.trim()) errs.pincode = 'Pincode is required.'
  else if (!/^\d{4,10}$/.test(a.pincode.trim())) errs.pincode = 'Enter a valid pincode.'

  return errs
}

const EMPTY_ADDRESS: DeliveryAddress = {
  name: '', phone: '', address_line1: '',
  address_line2: '', city: '', state: '', pincode: '', landmark: '',
  lat: undefined, lng: undefined,
}

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

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, count, total, updateQuantity, clearCart } = useCart()
  const router = useRouter()

  const [step, setStep] = useState<'cart' | 'address' | 'paying' | 'verify-nudge'>('cart')
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [addrLoading] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const toastCounter = useRef(0)

  const showToast = useCallback((message: string, type: ToastMsg['type'] = 'error') => {
    const id = ++toastCounter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])
  const [outOfArea, setOutOfArea] = useState(false)
  const [orderForOther, setOrderForOther] = useState(false)

  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResult | null>(null)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [isFirstOrder, setIsFirstOrder] = useState(false)

  const { profile, accessToken, reloadProfile } = useAuthContext()
  const { isEnabled, deliveryFee, serviceAreaLabel } = useServiceStatus()
  const { check: checkDelivery } = useDeliveryCheck()
  const { fetchAddresses } = useAddresses()

  useScrollLock(open)

  const discountAmount = appliedCoupon?.discount_amount ?? 0
  const pointsValue = pointsToUse
  const subtotal = Math.max(0, total - discountAmount - pointsValue)
  const finalTotal = subtotal + deliveryFee

  useEffect(() => {
    if (open) {
      // Attempt to restore saved state
      const saved = loadCartDrawerState()
      if (saved) {
        setStep(saved.step as any)
        setAddress(saved.address)
        clearCartDrawerState()
      }
    }
  }, [open])

  // Force-refresh saved addresses when the address step becomes active so that
  // addresses saved during a previous order's payment flow are immediately visible.
  useEffect(() => {
    if (step === 'address') {
      fetchAddresses(true)
    }
  }, [step, fetchAddresses])

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep('cart')
        setErrors({})
        setPayError(null)
        setOutOfArea(false)
        setAppliedCoupon(null)
        setPointsToUse(0)
        setOrderForOther(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!profile || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!sbUrl || !sbKey) return

    fetch(`${sbUrl}/rest/v1/orders?user_id=eq.${profile.id}&payment_status=eq.paid&select=id&limit=1`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((rows: any[]) => setIsFirstOrder(rows?.length === 0))
      .catch(() => {})
  }, [profile, accessToken])

  const handleSelectAddress = useCallback((addr: UserAddress) => {
    setSelectedAddressId(addr.id)
    setAddress(prev => ({
      ...prev,
      address_line1: addr.house_number,
      address_line2: addr.street_address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      landmark: addr.landmark ?? '',
      lat: addr.lat,
      lng: addr.lng,
    }))
    setErrors({})
  }, [])

  const goToAddressStep = useCallback(() => {
    if (count === 0) return
    if (!profile) {
      saveCartDrawerState({ step: 'address', address })
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + '?cart=open')}`)
      return
    }
    // Gating: If profile exists but phone is not verified/present
    if (!profile.phone) {
      setStep('verify-nudge')
      return
    }

    // Pre-fill name & phone from profile if the fields are still empty
    setAddress((prev) => ({
      ...prev,
      name:  prev.name  || profile.name  || '',
      phone: prev.phone || profile.phone || '',
    }))
    setOrderForOther(false)
    setStep('address')
  }, [count, profile, address, router])

  const handlePayment = useCallback(async () => {
    if (!selectedAddressId) {
      showToast('Please select a delivery address to continue.', 'error')
      return
    }

    const errs = validateAddress(address)
    if (Object.keys(errs).length) {
      showToast('Please fill in all required address fields.', 'error')
      setErrors(errs)
      return
    }

    const coords = (address.lat && address.lng) ? { lat: address.lat, lng: address.lng } : null
    let deliveryResult
    try {
      deliveryResult = await checkDelivery(coords, address.pincode)
    } catch {
      setOutOfArea(true)
      return
    }
    if (!deliveryResult.eligible) {
      setOutOfArea(true)
      return
    }

    setPayError(null)
    setStep('paying')

    // ── Free order (100% discount via coupon / points) ───────────────────────
    if (finalTotal <= 0) {
      try {
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id:  `free_${Date.now()}`,
            razorpay_payment_id: `free_${Date.now()}`,
            razorpay_signature:  'free',
            items,
            total_amount: total,
            delivery_fee: deliveryFee,
            address,
            coupon_code: appliedCoupon?.coupon?.code ?? null,
            reward_points_to_use: pointsToUse,
            is_free_order: true,
          }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error ?? 'Failed to place free order')
        }
        clearCart()
        onClose()
        router.push(`/payment/success?order_id=${verifyData.order_id}`)
      } catch (err: any) {
        setPayError(err?.message ?? 'Failed to place order.')
        setStep('address')
      }
      return
    }

    const loaded = await loadRazorpayScript()
    if (!loaded) {
      setPayError('Payment gateway blocked. Please disable your ad blocker and try again.')
      setStep('address')
      return
    }

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalTotal,
          items,
          address,
          coupon_code:          appliedCoupon?.coupon?.code ?? null,
          reward_points_to_use: pointsToUse,
          delivery_fee:         deliveryFee,
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? `create-order failed (${res.status})`)
      }
      const orderData = await res.json()

      // Shared flag so handler and ondismiss can coordinate
      let paymentDone = false

      const options: Record<string, any> = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Fuelist',
        description: 'Premium Meal Subscription',
        order_id: orderData.order_id,
        prefill: {
          name: address.name,
          contact: address.phone,
          email: profile?.email ?? '',
        },
        theme: { color: '#d97706' },
        handler: async (response: any) => {
          // Mark success immediately so ondismiss (fired by Razorpay when the
          // modal auto-closes after payment) does not reset our state.
          paymentDone = true
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                items,
                total_amount: total,
                delivery_fee: deliveryFee,
                address,
                coupon_code: appliedCoupon?.coupon?.code ?? null,
                reward_points_to_use: pointsToUse,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error ?? `Verification failed (${verifyRes.status})`)
            }
            clearCart()
            onClose()
            router.push(`/payment/success?order_id=${verifyData.order_id}`)
          } catch (err: any) {
            console.error('verify failed:', err)
            clearCart()
            onClose()
            const reason = encodeURIComponent(err?.message ?? 'Unknown error')
            router.push(`/payment/failure?reason=${reason}`)
          }
        },
        modal: {
          ondismiss: () => {
            // Razorpay fires ondismiss even after a successful payment when the
            // modal closes automatically. Guard against that here.
            if (paymentDone) return
            setStep('address')
            setPayError('Payment cancelled.')
          },
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.error('handlePayment error:', err)
      setPayError(err?.message ?? 'Failed to initiate payment.')
      setStep('address')
    }
  }, [address, selectedAddressId, items, total, finalTotal, appliedCoupon, pointsToUse, profile, clearCart, onClose, router, checkDelivery, showToast])

  return (
    <AnimatePresence>
      {open && (
        <>
          <CartToast toasts={toasts} />
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'paying' ? undefined : (step === 'address' ? () => setStep('cart') : onClose)}
            className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm touch-none"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            style={{
              top: isEnabled ? '0px' : 'var(--banner-height, 0px)',
              height: isEnabled ? '100%' : 'calc(100% - var(--banner-height, 0px))'
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
              {step === 'address' && (
                <button
                  onClick={() => setStep('cart')}
                  className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors shrink-0"
                  aria-label="Back to cart"
                >
                  <Icon name="arrowRight" size={18} strokeWidth={2.5} className="rotate-180" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black text-stone-900 tracking-tight leading-none">
                  {step === 'cart' ? 'Your Cart' : step === 'address' ? 'Delivery Details' : 'Processing…'}
                </h2>
                {step === 'cart' && count > 0 && (
                  <p className="text-[10px] font-bold text-stone-400 mt-0.5 uppercase tracking-widest">{count} item{count > 1 ? 's' : ''}</p>
                )}
              </div>
              {/* Step pills */}
              {items.length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn('h-1.5 w-5 rounded-full transition-all', step === 'cart' ? 'bg-amber-500' : 'bg-stone-200')} />
                  <span className={cn('h-1.5 w-5 rounded-full transition-all', step === 'address' ? 'bg-amber-500' : 'bg-stone-200')} />
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors shrink-0"
              >
                <Icon name="close" size={17} strokeWidth={2.5} />
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">

                {/* ── CART STEP ── */}
                {step === 'cart' && (
                  <motion.div key="cart" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-200 mb-4">
                          <Icon name="bowl" size={32} />
                        </div>
                        <h3 className="text-base font-black text-stone-900 tracking-tight">Cart is empty</h3>
                        <p className="text-xs font-medium text-stone-400 mt-1.5 max-w-[180px]">Add some healthy bowls to get started!</p>
                        <Button variant="primary" leftIcon={<Icon name="bowl" size={14} strokeWidth={2.5} />} className="mt-6" onClick={() => { onClose(); router.push('/menu') }}>Browse Menu</Button>
                      </div>
                    ) : (
                      <div className="px-4 pt-3 pb-1 divide-y divide-stone-50">
                        {items.map(({ item, quantity }) => (
                          <motion.div key={item.id} layout className="flex items-center gap-3 py-2.5">
                            {/* Veg dot + name */}
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-2 border-emerald-600 flex items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-black text-stone-900 leading-tight whitespace-normal">{item.name}</p>
                                <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                                  {formatPrice(item.price)} · <span className="text-stone-400 font-bold">{getServingSize(item.category)}</span>
                                </p>
                              </div>
                            </div>

                            {/* Qty stepper — Swiggy pill style */}
                            <div className="flex items-center border border-amber-500 rounded-lg overflow-hidden shrink-0">
                              <button
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                className="h-7 w-7 flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors text-lg font-black leading-none"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-xs font-black text-amber-600 border-x border-amber-500">{quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                className="h-7 w-7 flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors text-lg font-black leading-none"
                              >
                                +
                              </button>
                            </div>

                            {/* Row total */}
                            <span className="text-xs font-black text-stone-800 w-12 text-right shrink-0">{formatPrice(item.price * quantity)}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Coupon + points — inside scroll so they don't eat footer space */}
                    {items.length > 0 && (
                      <div className="px-4 pt-1 pb-3 space-y-2 border-t border-dashed border-stone-200 mt-1">
                        <CouponInput
                          orderAmount={total}
                          applied={appliedCoupon}
                          isFirstOrder={isFirstOrder}
                          onApply={(result) => setAppliedCoupon(result)}
                          onRemove={() => { setAppliedCoupon(null); setPointsToUse(0) }}
                        />
                        <RewardPointsToggle
                          availablePoints={profile?.reward_points ?? 0}
                          orderAmount={total - discountAmount}
                          pointsToUse={pointsToUse}
                          onChange={setPointsToUse}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── ADDRESS: out-of-area ── */}
                {step === 'address' && outOfArea && (
                  <motion.div key="outofarea" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 mb-4 border border-red-100">
                      <Icon name="error" size={32} />
                    </div>
                    <h3 className="text-base font-black text-stone-900 tracking-tight">Outside Delivery Area</h3>
                    <p className="text-xs font-medium text-stone-400 mt-1.5 max-w-[200px]">We deliver within {serviceAreaLabel}.</p>
                    <Button variant="secondary" className="mt-6" onClick={() => setOutOfArea(false)}>Try Another Address</Button>
                  </motion.div>
                )}

                {/* ── ADDRESS: form ── */}
                {step === 'address' && !outOfArea && (
                  <motion.div key="address" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-4 py-3 space-y-3">
                    {/* Mini order pill */}
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                      <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest">{count} item{count > 1 ? 's' : ''}</span>
                      <span className="text-sm font-black text-amber-700">{formatPrice(finalTotal)}</span>
                    </div>

                    {/* ── Recipient details ──────────────────────────────────
                     *
                     *  4 mutually exclusive states — only ONE renders at a time:
                     *
                     *  A. orderForOther       → editable inputs for receiver
                     *  B. profile complete    → read-only chip (name + phone)
                     *  C. profile incomplete  → chip (partial) + missing field input
                     *  D. no profile data     → both inputs + account nudge
                     * ─────────────────────────────────────────────────────── */}

                    {orderForOther ? (
                      /* ── A: Ordering for someone else ── */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-0.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Receiver&apos;s details</p>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderForOther(false)
                              setAddress((prev) => ({
                                ...prev,
                                name:  profile?.name  || '',
                                phone: profile?.phone || '',
                              }))
                              setErrors((prev) => ({ ...prev, name: undefined, phone: undefined }))
                            }}
                            className="text-[10px] font-black text-stone-400 hover:text-stone-700 uppercase tracking-wider transition-colors"
                          >
                            ← Use my details
                          </button>
                        </div>
                        <Input
                          label="Receiver's Name"
                          value={address.name}
                          onChange={(v) => { setAddress({ ...address, name: v.target.value }); setErrors({ ...errors, name: undefined }) }}
                          placeholder="Full name of receiver"
                          error={errors.name}
                          icon={<Icon name="user" size={16} />}
                        />
                        <Input
                          label="Receiver's Phone"
                          value={address.phone}
                          onChange={(v) => { setAddress({ ...address, phone: v.target.value }); setErrors({ ...errors, phone: undefined }) }}
                          placeholder="+91 98765 43210"
                          type="tel"
                          error={errors.phone}
                          icon={<Icon name="phone" size={16} />}
                        />
                      </div>

                    ) : (
                      /* ── B: Profile verified (guaranteed by gate) ── */
                      <div className="rounded-2xl bg-stone-50 border border-stone-100 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Delivering to</p>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderForOther(true)
                              setAddress((prev) => ({ ...prev, name: '', phone: '' }))
                              setErrors((prev) => ({ ...prev, name: undefined, phone: undefined }))
                            }}
                            className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-wider transition-colors"
                          >
                            Order for someone else?
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <Icon name="user" size={14} className="text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-stone-900 truncate">{profile?.name || 'Authorized User'}</p>
                            <p className="text-[11px] font-bold text-stone-500">{profile?.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-stone-100">
                      <AddressManager hideHeader selectedId={selectedAddressId || undefined} onSelect={handleSelectAddress} />
                    </div>
                  </motion.div>
                )}

                {/* ── VERIFY PHONE (inline) ── */}
                {step === 'verify-nudge' && (
                  <motion.div
                    key="verify-nudge"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="px-5 py-8 space-y-6"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStep('cart')} className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" aria-label="Back to cart">
                        <Icon name="arrowRight" size={18} strokeWidth={2.5} className="rotate-180 text-stone-500" />
                      </button>
                      <div>
                        <h3 className="text-base font-black text-stone-900 tracking-tight">Verify your number</h3>
                        <p className="text-[11px] font-medium text-stone-400">One-time verification before checkout</p>
                      </div>
                    </div>

                    <PhoneOtpVerify
                      compact
                      onVerified={async (phone) => {
                        // Reload profile so profile.phone is fresh in context
                        await reloadProfile()
                        setAddress((prev) => ({
                          ...prev,
                          name:  prev.name  || profile?.name  || '',
                          phone: prev.phone || phone,
                        }))
                        setStep('address')
                      }}
                    />
                  </motion.div>
                )}

                {/* ── PAYING ── */}
                {step === 'paying' && (
                  <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="mb-5 relative">
                      <div className="h-14 w-14 border-[3px] border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-amber-500"><Icon name="billing" size={20} /></div>
                    </div>
                    <h3 className="text-base font-black text-stone-900 tracking-tight">Opening Payment</h3>
                    <p className="text-xs font-medium text-stone-400 mt-1.5">Connecting to Razorpay…</p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ── Fixed bill + CTA footer ── */}
            {items.length > 0 && step !== 'paying' && step !== 'verify-nudge' && (
              <div className="border-t border-stone-100 bg-white shadow-[0_-4px_20px_rgba(28,25,23,0.06)]">
                {/* Bill summary */}
                <div className="px-4 pt-3 pb-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
                    <span>Item total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                      <span>Coupon discount</span>
                      <span>−{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {pointsValue > 0 && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-600">
                      <span>Rewards ({pointsToUse} pts)</span>
                      <span>−{formatPrice(pointsValue)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
                    <span className="flex items-center gap-1">
                      <Icon name="location" size={10} strokeWidth={2.5} />
                      Delivery fee
                    </span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600 font-black' : ''}>
                      {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                    <span className="text-sm font-black text-stone-900">To pay</span>
                    <span className="text-lg font-black text-stone-900 tracking-tight">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-4 pb-4">
                  {payError && (
                    <div className="mb-2 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-center text-[11px] font-bold border border-red-100 flex items-center gap-1.5 justify-center">
                      <Icon name="error" size={12} strokeWidth={3} /> {payError}
                    </div>
                  )}
                  <button
                    disabled={addrLoading || (step === 'cart' && count === 0)}
                    onClick={step === 'cart' ? goToAddressStep : handlePayment}
                    className="w-full flex items-center justify-between bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:grayscale text-white rounded-2xl px-5 py-3.5 transition-all shadow-lg shadow-amber-200"
                  >
                    <span className="text-sm font-black tracking-tight">
                      {step === 'cart' ? 'Proceed to Delivery' : 'Complete Payment'}
                    </span>
                    <span className="text-sm font-black opacity-90">{formatPrice(finalTotal)}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
