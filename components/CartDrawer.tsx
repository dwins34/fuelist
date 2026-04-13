'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { DeliveryAddress } from '@/lib/whatsapp'
import { useAuthContext } from '@/context/AuthContext'
import { isInServiceArea, SERVICE_AREA_DESCRIPTION, SERVED_AREAS } from '@/lib/serviceArea'
import CouponInput from '@/components/CouponInput'
import RewardPointsToggle from '@/components/RewardPointsToggle'
import { ApplyCouponResult } from '@/types'

// Extend Window to hold the Razorpay constructor
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on?(event: string, handler: () => void): void }
  }
}

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

// ── Validation ────────────────────────────────────────────────────────────────

interface AddressErrors {
  name?: string
  phone?: string
  address_line1?: string
  city?: string
  pincode?: string
}

function validateAddress(a: DeliveryAddress): AddressErrors {
  const errs: AddressErrors = {}
  if (!a.name.trim())
    errs.name = 'Name is required.'
  else if (a.name.trim().length < 2)
    errs.name = 'Enter your full name.'

  const rawPhone = a.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone)
    errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone))
    errs.phone = 'Enter a valid phone number.'

  if (!a.address_line1.trim())
    errs.address_line1 = 'Address is required.'
  else if (a.address_line1.trim().length < 5)
    errs.address_line1 = 'Please enter a complete address.'

  if (!a.city.trim())
    errs.city = 'City is required.'

  if (!a.pincode.trim())
    errs.pincode = 'Pincode is required.'
  else if (!/^\d{4,10}$/.test(a.pincode.trim()))
    errs.pincode = 'Enter a valid pincode (digits only).'

  return errs
}

// ── Empty address ─────────────────────────────────────────────────────────────

const EMPTY_ADDRESS: DeliveryAddress = {
  name: '', phone: '', address_line1: '',
  address_line2: '', city: '', state: '', pincode: '', landmark: '',
}

// ── Load Razorpay checkout.js once ───────────────────────────────────────────
// TODO: Uncomment when enabling Razorpay live keys
//
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

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', inputMode, error, optional,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  error?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}{optional && <span className="ml-1 text-gray-400">(optional)</span>}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
            : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, count, total, updateQuantity, removeItem, clearCart } = useCart()
  const router = useRouter()

  // 'cart' | 'address' | 'paying'
  const [step, setStep] = useState<'cart' | 'address' | 'paying'>('cart')

  const [address, setAddress]         = useState<DeliveryAddress>(EMPTY_ADDRESS)
  const [errors, setErrors]           = useState<AddressErrors>({})
  const [saveAddr, setSaveAddr]       = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)
  const [payError, setPayError]       = useState<string | null>(null)
  const [outOfArea, setOutOfArea]     = useState(false)

  // ── Coupon + reward points state ──────────────────────────────────────────
  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResult | null>(null)
  const [pointsToUse, setPointsToUse]     = useState(0)
  const [isFirstOrder, setIsFirstOrder]   = useState(false)

  const { profile, accessToken, reloadProfile } = useAuthContext()

  // Computed totals
  const discountAmount  = appliedCoupon?.discount_amount ?? 0
  const pointsValue     = pointsToUse                       // 1 point = ₹1
  const finalTotal      = Math.max(0, total - discountAmount - pointsValue)
  const drawerRef = useRef<HTMLDivElement>(null)

  // ── Reset to cart step when drawer closes ─────────────────────────────────
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('cart'); setErrors({}); setPayError(null); setOutOfArea(false)
        setAppliedCoupon(null); setPointsToUse(0)
      }, 300)
    }
  }, [open])

  // ── Keyboard: Escape closes / goes back ──────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (step === 'address') setStep('cart')
        else if (step !== 'paying') onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, step])

  // ── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ── Pre-fill address from profile when entering step 2 ───────────────────
  async function goToAddressStep() {
    setStep('address')
    setAddrLoading(true)
    try {
      if (!profile) { setAddrLoading(false); return }
      setAddress({
        name:          profile.name          ?? '',
        phone:         profile.phone         ?? '',
        address_line1: profile.address_line1 ?? '',
        address_line2: profile.address_line2 ?? '',
        city:          profile.city          ?? '',
        state:         profile.state         ?? '',
        pincode:       profile.pincode       ?? '',
        landmark:      profile.landmark      ?? '',
      })
      setSaveAddr(!profile.address_line1)
    } catch {
      // Guest — show empty form
    } finally {
      setAddrLoading(false)
    }
  }

  // ── Check first-order status for coupon badge ──────────────────────────────
  useEffect(() => {
    if (!profile || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return

    fetch(`${sbUrl}/rest/v1/orders?user_id=eq.${profile.id}&payment_status=eq.paid&select=id&limit=1`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((rows: unknown[]) => setIsFirstOrder(rows.length === 0))
      .catch(() => {})
  }, [profile, accessToken])

  function setField(key: keyof DeliveryAddress) {
    return (val: string) => {
      setAddress((prev) => ({ ...prev, [key]: val }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  // ── Optionally persist address to profile ─────────────────────────────────
  async function maybeSaveAddress() {
    if (!saveAddr || !profile || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    await fetch(`${sbUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey:         sbKey,
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id:            profile.id,
        name:          address.name,
        phone:         address.phone,
        address_line1: address.address_line1,
        address_line2: address.address_line2 ?? '',
        city:          address.city,
        state:         address.state ?? '',
        pincode:       address.pincode,
        landmark:      address.landmark ?? '',
      }),
    })
    await reloadProfile()
  }

  // ── Checkout handler ──────────────────────────────────────────────────────
  const handlePayment = useCallback(async () => {
    const errs = validateAddress(address)
    if (Object.keys(errs).length) { setErrors(errs); return }

    // ── Service area check ─────────────────────────────────────────────────
    if (!isInServiceArea(address.pincode)) {
      setOutOfArea(true)
      return
    }

    setPayError(null)
    setStep('paying')

    // Optionally save address to profile
    maybeSaveAddress().catch(() => {})

    // ── PRODUCTION: Razorpay flow ──────────────────────────────────────────
    // TODO: Uncomment this entire block and remove the "Direct confirm" block
    //       below once you have live Razorpay API keys.
    //
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      setPayError('Could not load payment gateway. Please check your internet connection.')
      setStep('address')
      return
    }
    
    let orderData: { order_id: string; amount: number; currency: string }
    try {
      const res = await fetch('/api/payment/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: finalTotal }),
      })
      if (!res.ok) throw new Error(await res.text())
      orderData = await res.json()
    } catch (err) {
      console.error('create-order failed:', err)
      setPayError('Failed to initiate payment. Please try again.')
      setStep('address')
      return
    }
    
    const options: Record<string, unknown> = {
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount:      orderData.amount,
      currency:    orderData.currency,
      name:        'Fuelist',
      description: 'Healthy Food Order',
      order_id:    orderData.order_id,
      prefill: {
        name:    address.name,
        contact: address.phone,
        email:   profile?.email ?? '',
      },
      theme: { color: '#16a34a' },
      handler: async (response: {
        razorpay_order_id:   string
        razorpay_payment_id: string
        razorpay_signature:  string
      }) => {
        try {
          const verifyRes = await fetch('/api/payment/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              razorpay_order_id:    response.razorpay_order_id,
              razorpay_payment_id:  response.razorpay_payment_id,
              razorpay_signature:   response.razorpay_signature,
              items,
              total_amount:         total,
              address,
              coupon_code:          appliedCoupon?.coupon?.code ?? null,
              reward_points_to_use: pointsToUse,
            }),
          })
          if (!verifyRes.ok) throw new Error('Verification failed')
          const verifyData = await verifyRes.json()
          try {
            sessionStorage.setItem('fuelist_last_order', JSON.stringify({
              order_id: verifyData.order_id, items, total, address,
            }))
          } catch {}
          clearCart()
          onClose()
          router.push(`/payment/success?order_id=${verifyData.order_id}`)
        } catch (err) {
          console.error('verify failed:', err)
          clearCart()
          onClose()
          router.push('/payment/failure')
        }
      },
      modal: {
        ondismiss: () => {
          setStep('address')
          setPayError('Payment cancelled. You can try again.')
        },
      },
    }
    const rzp = new window.Razorpay(options)
    rzp.on?.('payment.failed', () => {
      setStep('address')
      setPayError('Payment failed. Please try again with a different method.')
    })
    rzp.open()
    // ── END Razorpay block ─────────────────────────────────────────────────

    // ── TEMPORARY: Direct confirm (bypasses payment, remove when going live) ─
    // try {
    //   const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    //   const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    //   if (!sbUrl || !sbKey) throw new Error('Supabase not configured')

    //   const body: Record<string, unknown> = {
    //     items,
    //     total_amount:   total,
    //     payment_status: 'paid',
    //     order_status:   'new',
    //     address,
    //   }
    //   if (profile?.id) body.user_id = profile.id

    //   const res = await fetch(`${sbUrl}/rest/v1/orders`, {
    //     method:  'POST',
    //     headers: {
    //       apikey:         sbKey,
    //       Authorization:  `Bearer ${accessToken ?? sbKey}`,
    //       'Content-Type': 'application/json',
    //       Prefer:         'return=representation',
    //     },
    //     body: JSON.stringify(body),
    //   })

    //   if (!res.ok) throw new Error(await res.text())
    //   const [order] = await res.json()

    //   try {
    //     sessionStorage.setItem('fuelist_last_order', JSON.stringify({
    //       order_id: order.id, items, total, address,
    //     }))
    //   } catch {}

    //   clearCart()
    //   onClose()
    //   router.push(`/payment/success?order_id=${order.id}`)
    // } catch (err) {
    //   console.error('direct confirm failed:', err)
    //   setPayError('Could not place order. Please try again.')
    //   setStep('address')
    // }
    // ── END temporary block ────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, items, total, finalTotal, appliedCoupon, pointsToUse, profile, accessToken, clearCart, onClose, router])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={step === 'address' ? () => setStep('cart') : step === 'cart' ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'cart' ? 'Shopping cart' : 'Delivery address'}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {(step === 'address') && (
              <button
                onClick={() => setStep('cart')}
                className="mr-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Back to cart"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="text-xl">
              {step === 'cart' ? '🛒' : step === 'address' ? '📍' : '💳'}
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'cart' ? 'Your Cart' : step === 'address' ? 'Delivery address' : 'Processing…'}
            </h2>
            {step === 'cart' && count > 0 && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'cart' && items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
              >
                Clear all
              </button>
            )}
            {step !== 'paying' && (
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Step indicator ── */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400">
            <span className={step === 'cart' ? 'text-green-600 font-semibold' : ''}>1. Cart</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step === 'address' ? 'text-green-600 font-semibold' : ''}>2. Address</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step === 'paying' ? 'text-green-600 font-semibold' : ''}>3. Payment</span>
          </div>
        )}

        {/* ── STEP 1: Cart items ── */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                  <div className="text-6xl">🥗</div>
                  <p className="text-gray-500 font-medium">Your cart is empty</p>
                  <p className="text-sm text-gray-400">Add some bowls to get started!</p>
                </div>
              ) : (
                items.map(({ item, quantity }) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border border-gray-100 p-3">
                    <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-green-50">
                      {item.image_url ? (
                        <Image src={getImageUrl(item.image_url)} alt={item.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">🥗</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.calories} kcal · P {item.protein}g</p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-1">
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            className="h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                          >−</button>
                          <span className="w-4 text-center text-sm font-bold text-gray-700">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            className="h-6 w-6 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                          >+</button>
                        </div>
                        <span className="font-bold text-green-600 text-sm">
                          {formatPrice(item.price * quantity)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="self-start rounded-full p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">

                {/* Coupon input */}
                <CouponInput
                  orderAmount={total}
                  applied={appliedCoupon}
                  isFirstOrder={isFirstOrder}
                  onApply={(result) => setAppliedCoupon(result)}
                  onRemove={() => { setAppliedCoupon(null); setPointsToUse(0) }}
                />

                {/* Reward points toggle */}
                <RewardPointsToggle
                  availablePoints={profile?.reward_points ?? 0}
                  orderAmount={total - discountAmount}
                  pointsToUse={pointsToUse}
                  onChange={setPointsToUse}
                />

                {/* Order total breakdown */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{count} item{count !== 1 ? 's' : ''}</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Coupon ({appliedCoupon?.coupon?.code})</span>
                      <span>−{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {pointsValue > 0 && (
                    <div className="flex items-center justify-between text-sm text-amber-600">
                      <span>Reward points ({pointsToUse} pts)</span>
                      <span>−{formatPrice(pointsValue)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-1">
                    <span>Total</span>
                    <span className="text-base">{formatPrice(finalTotal)}</span>
                  </div>
                  {Math.floor(finalTotal / 100) > 0 && (
                    <div className="flex items-center justify-between text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1">
                      <span>⭐ Points you&apos;ll earn</span>
                      <span className="font-semibold">+{Math.floor(finalTotal / 100)} pts</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={goToAddressStep}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100"
                >
                  Continue to delivery
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <p className="text-center text-xs text-gray-400">
                  Next: confirm your delivery address
                </p>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: Address ── */}
        {step === 'address' && outOfArea && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="text-5xl">🚫</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Outside Delivery Area</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Sorry! We currently only deliver within{' '}
                  <span className="font-semibold text-gray-700">{SERVICE_AREA_DESCRIPTION}</span>.
                </p>
              </div>

              <div className="w-full rounded-2xl bg-green-50 border border-green-100 px-4 py-4 text-left">
                <p className="text-xs font-semibold text-green-700 mb-2">Areas we serve:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SERVED_AREAS.map((area) => (
                    <span key={area} className="rounded-full bg-white border border-green-200 px-2.5 py-0.5 text-xs text-green-700">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                We&apos;re expanding soon — hope to serve your area shortly! 🙏
              </p>
            </div>

            <div className="border-t border-gray-100 px-5 py-4 space-y-2 bg-white">
              <button
                onClick={() => setOutOfArea(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all"
              >
                Change address
              </button>
              <button
                onClick={onClose}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                Continue browsing
              </button>
            </div>
          </>
        )}

        {step === 'address' && !outOfArea && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {addrLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                      <div className="h-9 bg-gray-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Order summary pill */}
                  <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-green-800 font-medium">
                      {count} item{count !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm font-bold text-green-700">{formatPrice(total)}</span>
                  </div>

                  <p className="text-xs text-gray-400 pb-1">
                    Where should we deliver your order?
                  </p>

                  <Field label="Full name" value={address.name}
                    onChange={setField('name')} placeholder="Your name" error={errors.name} />

                  <Field label="Phone number" value={address.phone}
                    onChange={setField('phone')} placeholder="+91 98765 43210"
                    type="tel" error={errors.phone} />

                  <Field label="Address line 1" value={address.address_line1}
                    onChange={setField('address_line1')}
                    placeholder="House / flat / building no." error={errors.address_line1} />

                  <Field label="Address line 2" value={address.address_line2 ?? ''}
                    onChange={setField('address_line2')}
                    placeholder="Street / area / colony" optional />

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={address.city}
                      onChange={setField('city')} placeholder="New Delhi" error={errors.city} />
                    <Field label="State" value={address.state ?? ''}
                      onChange={setField('state')} placeholder="Delhi" optional />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Pincode" value={address.pincode}
                      onChange={setField('pincode')} placeholder="110001"
                      inputMode="numeric" error={errors.pincode} />
                    <Field label="Landmark" value={address.landmark ?? ''}
                      onChange={setField('landmark')} placeholder="Near metro" optional />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAddr}
                      onChange={(e) => setSaveAddr(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-500">Save this address to my profile</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 space-y-2 bg-white">
              {payError && (
                <p className="text-xs text-red-500 text-center">{payError}</p>
              )}
              {Object.keys(errors).length > 0 && (
                <p className="text-xs text-red-500 text-center">
                  Please fill in all required fields above.
                </p>
              )}
              <button
                onClick={handlePayment}
                disabled={addrLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-green-600 px-6 py-3.5 text-white font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Proceed to Payment
              </button>
              <p className="text-center text-xs text-gray-400">
                Secure payment via Razorpay · UPI / Card / Wallet
              </p>
            </div>
          </>
        )}

        {/* ── STEP 3: Paying spinner (Razorpay modal is open) ── */}
        {step === 'paying' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
            <svg className="h-10 w-10 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-gray-500 font-medium text-sm">Opening payment gateway…</p>
            <p className="text-xs text-gray-400 text-center">
              Complete your payment in the Razorpay window.<br />Do not close this tab.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
