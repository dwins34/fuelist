'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Icon } from '@/lib/icons'
import Input from '@/components/ui/Input'
import PhoneOtpVerify from '@/components/ui/PhoneOtpVerify'
import { Card, CardContent } from '@/components/ui/card'
import Button from '@/components/ui/Button'

interface PersonalInfoTabProps {
  name: string
  setName: (v: string) => void
  /** Current saved phone from profile (used to determine if already verified) */
  savedPhone: string
  email?: string
  formErrors: { name?: string; phone?: string }
  /** Called when name field loses focus with a changed value */
  onNameBlur: () => void
  /** Called with the verified phone — component handles save */
  onPhoneVerified: (phone: string) => void
  nameSaving?: boolean
  nameSaved?: boolean
}

export default function PersonalInfoTab({
  name, setName, savedPhone, email,
  formErrors, onNameBlur, onPhoneVerified,
  nameSaving = false, nameSaved = false,
}: PersonalInfoTabProps) {
  const [localName, setLocalName] = useState(name)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('return_to')
  const isFromCart = returnTo === 'cart'

  // Sync if parent resets name (e.g. on profile reload)
  React.useEffect(() => { setLocalName(name) }, [name])

  function handleNameBlur() {
    setName(localName)
    onNameBlur()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h1 className="text-base sm:text-xl font-black text-stone-900 tracking-tighter capitalize">Personal Information</h1>
        <p className="text-[11px] sm:text-xs font-medium text-stone-400">Changes save automatically.</p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* ?? Name field — saves on blur ?? */}
        <div className="relative">
          <Input
            label="Full Name"
            id="name"
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Your full name"
            error={formErrors.name}
            icon={<Icon name="user" size={16} />}
          />
          {/* Subtle inline save indicator */}
          {(nameSaving || nameSaved) && (
            <div className="absolute right-3 top-9 flex items-center gap-1 text-[10px] font-bold">
              {nameSaving ? (
                <span className="text-stone-400 flex items-center gap-1">
                  <span className="h-3 w-3 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <span className="text-emerald-500 flex items-center gap-1">
                  <Icon name="success" size={12} strokeWidth={3} />
                  Saved
                </span>
              )}
            </div>
          )}
        </div>

        {/* ?? Verified Identities Section ?? */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-1 w-1 rounded-full bg-emerald-500" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Verified Identities</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* ?? Phone — OTP verification ?? */}
            <div className="group/phone">
              {savedPhone ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4 transition-all hover:bg-emerald-50 hover:shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/10">
                      <Icon name="phone" size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Mobile Number</p>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[8px] font-black text-white uppercase tracking-tighter shadow-sm">
                          <Icon name="success" size={8} strokeWidth={4} />
                          Verified
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-black text-emerald-950 tracking-tight">{savedPhone}</p>
                    </div>
                  </div>
                  
                  <details className="group/details">
                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors ml-1 list-none flex items-center gap-1">
                      <Icon name="settings" size={11} className="transition-transform group-open/details:rotate-90" />
                      Manage Phone Number
                    </summary>
                    <div className="mt-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-100 shadow-inner">
                      <PhoneOtpVerify
                        initialPhone=""
                        onVerified={onPhoneVerified}
                        label="New Mobile Number"
                        compact
                      />
                    </div>
                  </details>
                </div>
              ) : (
                <PhoneOtpVerify
                  initialPhone=""
                  onVerified={onPhoneVerified}
                  label="Mobile Number"
                />
              )}
              {formErrors.phone && (
                <p className="mt-1.5 ml-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <Icon name="error" size={11} strokeWidth={3} />
                  {formErrors.phone}
                </p>
              )}
            </div>

            {/* ?? Verified Email ?? */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4 transition-all hover:bg-emerald-50 hover:shadow-sm opacity-90 transition-opacity hover:opacity-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/10">
                <Icon name="mail" size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Email Address</p>
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[8px] font-black text-white uppercase tracking-tighter shadow-sm">
                    <Icon name="success" size={8} strokeWidth={4} />
                    Verified
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black text-emerald-950 tracking-tight">{email}</p>
              </div>
              <div className="ml-auto pointer-events-none opacity-20">
                <Icon name="security" size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ?? Return to Checkout (if applicable) ?? */}
        {isFromCart && savedPhone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-6 border-t border-dashed border-stone-200"
          >
            <div className="bg-amber-50 rounded-2xl p-4 sm:p-6 border border-amber-100 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
                <Icon name="cart" size={24} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight">Identity Verified!</h3>
                <p className="text-[11px] sm:text-xs font-medium text-stone-500 mt-0.5">Your phone is now verified. You can continue your checkout.</p>
              </div>
              <Button 
                variant="primary" 
                onClick={() => router.push('/menu?cart=open&step=address')}
                className="w-full sm:w-auto shadow-xl shadow-amber-200"
              >
                Return to Checkout
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
