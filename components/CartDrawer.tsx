'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import { whatsAppOrderUrl, DeliveryAddress } from '@/lib/whatsapp'
import { createClient } from '@/lib/supabase/client'

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

  // 'cart' = step 1, 'address' = step 2
  const [step, setStep] = useState<'cart' | 'address'>('cart')

  const [address, setAddress]     = useState<DeliveryAddress>(EMPTY_ADDRESS)
  const [errors, setErrors]       = useState<AddressErrors>({})
  const [saveAddr, setSaveAddr]   = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)
  const [saving, setSaving]       = useState(false)

  const drawerRef = useRef<HTMLDivElement>(null)
  const supabase  = useMemo(() => createClient(), [])

  // ── Reset to cart step when drawer closes ─────────────────────────────────
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep('cart'); setErrors({}) }, 300)
    }
  }, [open])

  // ── Keyboard: Escape closes ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (step === 'address') setStep('cart')
        else onClose()
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

  // ── Pre-fill address from DB when entering step 2 ────────────────────────
  async function goToAddressStep() {
    setStep('address')
    setAddrLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAddrLoading(false); return }

      const { data } = await supabase
        .from('users')
        .select('name, phone, address_line1, address_line2, city, state, pincode, landmark')
        .eq('id', user.id)
        .single()

      if (data) {
        setAddress({
          name:          data.name          ?? '',
          phone:         data.phone         ?? '',
          address_line1: data.address_line1 ?? '',
          address_line2: data.address_line2 ?? '',
          city:          data.city          ?? '',
          state:         data.state         ?? '',
          pincode:       data.pincode       ?? '',
          landmark:      data.landmark      ?? '',
        })
        // Suggest saving if address is incomplete
        setSaveAddr(!data.address_line1)
      }
    } catch {
      // Guest or network error — show empty form
    } finally {
      setAddrLoading(false)
    }
  }

  // ── Field change helper + clear its error ─────────────────────────────────
  function setField(key: keyof DeliveryAddress) {
    return (val: string) => {
      setAddress((prev) => ({ ...prev, [key]: val }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  // ── Confirm order ─────────────────────────────────────────────────────────
  async function handleConfirmOrder() {
    const errs = validateAddress(address)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      // Optionally save address back to profile
      if (saveAddr) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('users').upsert(
            {
              id: user.id,
              name:          address.name,
              phone:         address.phone,
              address_line1: address.address_line1,
              address_line2: address.address_line2 ?? '',
              city:          address.city,
              state:         address.state ?? '',
              pincode:       address.pincode,
              landmark:      address.landmark ?? '',
            },
            { onConflict: 'id' }
          )
        }
      }

      const url = whatsAppOrderUrl(items, total, address)
      window.open(url, '_blank', 'noopener,noreferrer')
      clearCart()
      onClose()
    } catch {
      // WhatsApp still opens even if DB save fails
      const url = whatsAppOrderUrl(items, total, address)
      window.open(url, '_blank', 'noopener,noreferrer')
      clearCart()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isAddressComplete =
    !!address.address_line1 && !!address.city && !!address.pincode && !!address.phone && !!address.name

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={step === 'address' ? () => setStep('cart') : onClose}
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
            {step === 'address' && (
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
            <span className="text-xl">{step === 'cart' ? '🛒' : '📍'}</span>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'cart' ? 'Your Cart' : 'Delivery address'}
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
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Step indicator ── */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400">
            <span className={step === 'cart' ? 'text-green-600 font-semibold' : ''}>1. Cart</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className={step === 'address' ? 'text-green-600 font-semibold' : ''}>2. Delivery address</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>3. WhatsApp</span>
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
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" />
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
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{count} item{count !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-gray-900 text-base">{formatPrice(total)}</span>
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
        {step === 'address' && (
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

                  {/* Save to profile toggle */}
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
              {/* Show inline summary of errors if any */}
              {Object.keys(errors).length > 0 && (
                <p className="text-xs text-red-500 text-center">
                  Please fill in all required fields above.
                </p>
              )}
              <button
                onClick={handleConfirmOrder}
                disabled={saving || addrLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-white font-bold text-base hover:bg-[#20b858] active:scale-95 transition-all shadow-md shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                )}
                {saving ? 'Placing order…' : 'Confirm & order via WhatsApp'}
              </button>
              <p className="text-center text-xs text-gray-400">
                Opens WhatsApp with your order and address
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
