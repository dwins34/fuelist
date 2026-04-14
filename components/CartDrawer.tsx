'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { DeliveryAddress } from '@/lib/whatsapp'
import { useAuthContext } from '@/context/AuthContext'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { isInServiceArea, SERVICE_AREA_DESCRIPTION } from '@/lib/serviceArea'
import { Icon, IconName } from '@/lib/icons'
import CouponInput from '@/components/CouponInput'
import RewardPointsToggle from '@/components/RewardPointsToggle'
import AddressManager from '@/components/account/AddressManager'
import { UserAddress } from '@/hooks/useAddresses'
import { ApplyCouponResult } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
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

function validateAddress(a: DeliveryAddress): AddressErrors {
  const errs: AddressErrors = {}
  if (!a.name.trim()) errs.name = 'Name is required.'
  else if (a.name.trim().length < 2) errs.name = 'Enter your full name.'

  const rawPhone = a.phone.replace(/[\s\-()]/g, '')
  if (!rawPhone) errs.phone = 'Phone number is required.'
  else if (!/^\+?\d{7,15}$/.test(rawPhone)) errs.phone = 'Enter a valid phone number.'

  if (!a.address_line1.trim()) errs.address_line1 = 'Address is required.'
  else if (a.address_line1.trim().length < 5) errs.address_line1 = 'Please enter a complete address.'

  if (!a.city.trim()) errs.city = 'City is required.'

  if (!a.pincode.trim()) errs.pincode = 'Pincode is required.'
  else if (!/^\d{4,10}$/.test(a.pincode.trim())) errs.pincode = 'Enter a valid pincode.'

  return errs
}

const EMPTY_ADDRESS: DeliveryAddress = {
  name: '', phone: '', address_line1: '',
  address_line2: '', city: '', state: '', pincode: '', landmark: '',
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
  const { items, count, total, updateQuantity, removeItem, clearCart } = useCart()
  const router = useRouter()

  const [step, setStep] = useState<'cart' | 'address' | 'paying'>('cart')
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [addrLoading, setAddrLoading] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [outOfArea, setOutOfArea] = useState(false)

  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResult | null>(null)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [isFirstOrder, setIsFirstOrder] = useState(false)

  const { profile, accessToken } = useAuthContext()
  const { isEnabled } = useServiceStatus()

  const discountAmount = appliedCoupon?.discount_amount ?? 0
  const pointsValue = pointsToUse
  const finalTotal = Math.max(0, total - discountAmount - pointsValue)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep('cart')
        setErrors({})
        setPayError(null)
        setOutOfArea(false)
        setAppliedCoupon(null)
        setPointsToUse(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!profile || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
      landmark: addr.landmark ?? ''
    }))
    setErrors({})
  }, [])

  const goToAddressStep = useCallback(() => {
    if (count === 0) return
    setStep('address')
  }, [count])

  const handlePayment = useCallback(async () => {
    const errs = validateAddress(address)
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (!isInServiceArea(address.pincode)) {
      setOutOfArea(true)
      return
    }

    setPayError(null)
    setStep('paying')

    const loaded = await loadRazorpayScript()
    if (!loaded) {
      setPayError('Could not load payment gateway.')
      setStep('address')
      return
    }
    
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal }),
      })
      if (!res.ok) throw new Error(await res.text())
      const orderData = await res.json()

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
                address,
                coupon_code: appliedCoupon?.coupon?.code ?? null,
                reward_points_to_use: pointsToUse,
              }),
            })
            if (!verifyRes.ok) throw new Error('Verification failed')
            const verifyData = await verifyRes.json()
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
            setPayError('Payment cancelled.')
          },
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setPayError('Failed to initiate payment.')
      setStep('address')
    }
  }, [address, items, total, finalTotal, appliedCoupon, pointsToUse, profile, clearCart, onClose, router])

  const stepIcon: Record<string, IconName> = {
    cart: 'shoppingBag',
    address: 'location',
    paying: 'billing'
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'paying' ? undefined : (step === 'address' ? () => setStep('cart') : onClose)}
            className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-premium"
            style={{ 
              top: isEnabled ? '0px' : 'var(--banner-height, 0px)',
              height: isEnabled ? '100%' : 'calc(100% - var(--banner-height, 0px))'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div className="flex items-center gap-4">
                {step === 'address' && (
                  <button onClick={() => setStep('cart')} className="group rounded-full p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-900 transition-colors">
                    <Icon name="close" className="rotate-90" size={18} />
                  </button>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Icon name={stepIcon[step]} size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-stone-900 tracking-tight leading-none">
                    {step === 'cart' ? 'Your Cart' : step === 'address' ? 'Delivery' : 'Processing'}
                  </h2>
                  {step === 'cart' && count > 0 && (
                    <p className="text-xs font-black text-stone-400 mt-1 uppercase tracking-widest">{count} items added</p>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="group rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-all duration-200"
              >
                <Icon name="close" size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Stepper */}
            {items.length > 0 && (
              <div className="flex items-center justify-between px-6 py-2.5 bg-stone-50/50 border-b border-stone-100">
                <div className={cn("flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors", step === 'cart' ? "text-amber-600" : "text-stone-300")}>
                  <span>01. Cart</span>
                </div>
                <div className="flex-1 h-[2px] mx-4 bg-stone-100 relative">
                  <motion.div 
                    initial={false}
                    animate={{ width: step === 'cart' ? '0%' : step === 'address' ? '100%' : '100%' }}
                    className="absolute inset-0 bg-amber-500"
                  />
                </div>
                <div className={cn("flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors", step === 'address' ? "text-amber-600" : "text-stone-300")}>
                  <span>02. Address</span>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                {step === 'cart' && (
                  <motion.div key="cart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-20 h-20 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-200 mb-6">
                          <Icon name="bowl" size={40} />
                        </div>
                        <h3 className="text-xl font-black text-stone-900 tracking-tight">Your cart is empty</h3>
                        <p className="text-sm font-medium text-stone-400 mt-2 max-w-[200px]">Add some nutritious bowls to fuel your week!</p>
                        <Button variant="primary" className="mt-8" onClick={onClose}>Browse Menu</Button>
                      </div>
                    ) : (
                      items.map(({ item, quantity }) => (
                        <motion.div key={item.id} layout className="flex gap-4 p-3 rounded-2xl border border-stone-100 bg-white shadow-sm group">
                          <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-50">
                            {item.image_url ? (
                              <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-2xl text-stone-200"><Icon name="bowl" size={32} /></div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div>
                              <p className="font-black text-stone-900 tracking-tight leading-none truncate">{item.name}</p>
                              <div className="flex items-center gap-1 text-[10px] font-bold mt-1 tracking-wide">
                                <span className="text-stone-700">{item.calories} kCal</span>
                                <span className="text-stone-300">·</span>
                                <span className="text-blue-700">P {item.protein}g</span>
                                <span className="text-stone-300">·</span>
                                <span className="text-emerald-700">C {item.carbs}g</span>
                                <span className="text-stone-300">·</span>
                                <span className="text-amber-700">F {item.fats}g</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-stone-50 rounded-xl p-1 border border-stone-100">
                                <button onClick={() => updateQuantity(item.id, quantity - 1)} className="h-7 w-7 rounded-lg text-stone-500 hover:bg-white hover:text-amber-600 transition-all flex items-center justify-center font-bold">−</button>
                                <span className="w-6 text-center text-xs font-black text-stone-900">{quantity}</span>
                                <button onClick={() => updateQuantity(item.id, quantity + 1)} className="h-7 w-7 rounded-lg text-stone-500 hover:bg-white hover:text-amber-600 transition-all flex items-center justify-center font-bold">+</button>
                              </div>
                              <span className="font-black text-amber-600">{formatPrice(item.price * quantity)}</span>
                            </div>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="self-start p-2 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                            <Icon name="delete" size={18} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}

                {step === 'address' && outOfArea && (
                  <motion.div key="outofarea" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-6 border border-red-100 shadow-sm shadow-red-100">
                      <Icon name="error" size={48} />
                    </div>
                    <h3 className="text-xl font-black text-stone-900 tracking-tight">Outside Delivery Area</h3>
                    <p className="text-sm font-medium text-stone-400 mt-2 max-w-[240px]">We currently deliver within {SERVICE_AREA_DESCRIPTION}.</p>
                    <Button variant="outline" className="mt-8" onClick={() => setOutOfArea(false)}>Try Another Address</Button>
                  </motion.div>
                )}

                {step === 'address' && !outOfArea && (
                  <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100 flex items-center justify-between shadow-sm shadow-amber-100/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-amber-600"><Icon name="package" size={16} /></div>
                        <div>
                          <p className="text-xs font-black text-amber-600 uppercase tracking-widest leading-none">Order Summary</p>
                          <p className="text-sm font-black text-stone-900 mt-1">{count} healthy bowls</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-amber-700">{formatPrice(total)}</span>
                    </div>

                    <div className="space-y-6">
                      <Input label="Recipient name" value={address.name} onChange={(v) => { setAddress({...address, name: v.target.value}); setErrors({...errors, name: undefined}) }} placeholder="Your name" error={errors.name} icon={<Icon name="user" size={18}/>} />
                      <Input label="Mobile number" value={address.phone} onChange={(v) => { setAddress({...address, phone: v.target.value}); setErrors({...errors, phone: undefined}) }} placeholder="+91 98765 43210" type="tel" error={errors.phone} icon={<Icon name="phone" size={18}/>} />
                      <div className="pt-4 border-t border-stone-50">
                        <AddressManager hideHeader selectedId={selectedAddressId || undefined} onSelect={handleSelectAddress} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'paying' && (
                  <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-6 relative">
                      <div className="h-16 w-16 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-amber-500"><Icon name="billing" size={24} /></div>
                    </div>
                    <h3 className="text-xl font-black text-stone-900 tracking-tight">Opening Secure Payment</h3>
                    <p className="text-sm font-medium text-stone-400 mt-2">Connecting to Razorpay gateway…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer / Actions */}
            {items.length > 0 && step !== 'paying' && (
              <div className="border-t border-stone-100 px-5 py-5 space-y-4 bg-white shadow-[0_-8px_32px_rgba(28,25,23,0.05)]">
                {step === 'cart' && (
                  <>
                    <CouponInput orderAmount={total} applied={appliedCoupon} isFirstOrder={isFirstOrder} onApply={(result) => setAppliedCoupon(result)} onRemove={() => { setAppliedCoupon(null); setPointsToUse(0) }} />
                    <RewardPointsToggle availablePoints={profile?.reward_points ?? 0} orderAmount={total - discountAmount} pointsToUse={pointsToUse} onChange={setPointsToUse} />
                  </>
                )}

                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-400">
                    <span className="capitalize tracking-wider">Base Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                      <span className="capitalize tracking-wider">Coupon Savings</span>
                      <span>−{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {pointsValue > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-amber-600">
                      <span className="capitalize tracking-wider">Rewards ({pointsToUse} pts)</span>
                      <span>−{formatPrice(pointsValue)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-50">
                    <span className="text-sm font-black text-stone-900 capitalize tracking-tighter">Grand Total</span>
                    <span className="text-2xl font-black text-stone-900 tracking-tighter">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  {payError && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-xl text-center text-xs font-bold border border-red-100 flex items-center gap-2 justify-center"><Icon name="error" size={14} strokeWidth={3} /> {payError}</div>}
                  <Button
                    size="lg"
                    className="w-full shadow-premium"
                    disabled={addrLoading || (step === 'cart' && count === 0)}
                    onClick={step === 'cart' ? goToAddressStep : handlePayment}
                  >
                    {step === 'cart' ? 'Proceed to Delivery' : 'Complete Payment'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
