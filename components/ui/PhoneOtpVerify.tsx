'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth'

type FlowState = 'idle' | 'sending' | 'otp_sent' | 'verifying' | 'verified'

interface PhoneOtpVerifyProps {
  /** Pre-fill the phone field (e.g. from profile) */
  initialPhone?: string
  /** Called with the verified, E.164-ish phone string (e.g. "+919876543210") */
  onVerified: (phone: string) => void
  /** Compact mode: used inside cart / subscription modal */
  compact?: boolean
  /** Optional label for the phone field */
  label?: string
  /** Error from outside (e.g. if phone is used elsewhere) */
  externalError?: string
}

const RESEND_SECONDS = 60
const OTP_LENGTH     = 6

export default function PhoneOtpVerify({
  initialPhone = '',
  onVerified,
  compact = false,
  label = 'Mobile Number',
  externalError,
}: PhoneOtpVerifyProps) {
  const [phone,    setPhone]    = useState(initialPhone)
  const [otp,      setOtp]      = useState('')
  const [state,    setState]    = useState<FlowState>('idle')
  const [error,    setError]    = useState<string | null>(null)
  const [resend,   setResend]   = useState(0)    // countdown seconds
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null)

  const otpRef       = useRef<HTMLInputElement>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const wrapperRef   = useRef<HTMLDivElement>(null) // stable outer wrapper

  // Start/restart 60s resend countdown
  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current)
    setResend(RESEND_SECONDS)
    timerRef.current = setInterval(() => {
      setResend((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      destroyVerifier()
    }
  }, [])

  // Auto-focus OTP input when we enter otp_sent state
  useEffect(() => {
    if (state === 'otp_sent') setTimeout(() => otpRef.current?.focus(), 100)
  }, [state])

  function destroyVerifier() {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear() } catch {}
      recaptchaRef.current = null
    }
    // Replace the inner div with a fresh one so reCAPTCHA has a clean DOM node
    if (wrapperRef.current) wrapperRef.current.innerHTML = '<div></div>'
  }

  const getVerifier = async (): Promise<RecaptchaVerifier | null> => {
    try {
      destroyVerifier()
      const container = wrapperRef.current?.firstElementChild as HTMLElement | null
      if (!container) return null

      const verifier = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('Verification expired. Please try again.')
          setState('idle')
          destroyVerifier()
        },
      })

      await verifier.render()
      recaptchaRef.current = verifier
      return verifier
    } catch (err: any) {
      console.error('Recaptcha init error:', err)
      destroyVerifier()
      return null
    }
  }

  async function handleSendOtp() {
    setError(null)
    if (!phone.trim()) { setError('Enter your mobile number first'); return }
    
    // Improved E.164 formatting for Indian numbers
    const digits = phone.replace(/\D/g, '')
    let formattedPhone = ''
    
    if (digits.length === 10) {
      formattedPhone = `+91${digits}`
    } else if (digits.length === 12 && digits.startsWith('91')) {
      formattedPhone = `+${digits}`
    } else {
      formattedPhone = digits.startsWith('+') ? digits : `+${digits}`
    }

    setState('sending')
    try {
      const verifier = await getVerifier()
      if (!verifier) throw new Error('Failed to initialize security check')

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier)
      setConfirmResult(confirmation)
      setPhone(formattedPhone) // Standardize the display
      setState('otp_sent')
      startCountdown()
    } catch (err: any) {
      console.error('Firebase send-otp error:', err)
      let customError = err.message || 'Failed to send OTP.'
      
      if (err.code === 'auth/billing-not-enabled') {
        customError = 'SMS verification requires billing to be enabled (Blaze plan).'
      } else if (err.code === 'auth/invalid-app-credential') {
        customError = 'Invalid App Credentials. Please check domain/API key settings in GCP Console.'
      } else if (err.code === 'auth/too-many-requests') {
        customError = 'Quota exceeded. Please try again later or use a test number (123456).'
      }

      setError(customError)
      setState('idle')
      destroyVerifier()
    }
  }

  async function handleVerify() {
    if (otp.length !== OTP_LENGTH) { setError(`Enter the ${OTP_LENGTH}-digit OTP`); return }
    if (!confirmResult) { setError('Session expired. Please resend OTP.'); setState('idle'); return }
    
    setError(null)
    setState('verifying')

    try {
      // 1. Verify with Firebase
      await confirmResult.confirm(otp)

      // 2. Sync with local database
      const res = await fetch('/api/auth/phone/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Identity verified, but failed to sync profile.')
      }

      setState('verified')
      onVerified(phone)
    } catch (err: any) {
      console.error('Verification error:', err)
      setError(err.message || 'Invalid OTP. Please try again.')
      setState('otp_sent')
    }
  }

  async function handleResend() {
    if (resend > 0) return
    setOtp('')
    setError(null)
    await handleSendOtp()
  }

  const isLoading = state === 'sending' || state === 'verifying'

  // ── Verified state ──────────────────────────────────────────────────────────
  if (state === 'verified') {
    return (
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4",
          compact ? "py-3" : "py-4"
        )}
      >
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
          <p className="text-sm sm:text-base font-black text-emerald-950 tracking-tight truncate">{phone}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stable wrapper — inner div is replaced fresh on each attempt */}
      <div ref={wrapperRef} className="hidden"><div /></div>

      {/* ── Phone input row ── */}
      <div>
        {!compact && label && (
          <label className="text-[10px] font-black capitalize tracking-widest text-stone-400 ml-1 mb-1.5 block">
            {label}
          </label>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
              <Icon name="phone" size={15} />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null) }}
              disabled={state === 'otp_sent' || isLoading}
              placeholder="+91 98765 43210"
              className={cn(
                "w-full rounded-xl border bg-white pl-10 pr-3 font-medium text-stone-900 outline-none transition-all focus:ring-2 focus:ring-amber-500/20",
                compact ? "py-2.5 text-sm border-stone-200 focus:border-amber-400" : "py-3 text-sm border-stone-200 focus:border-amber-500",
                (state === 'otp_sent' || isLoading) && "opacity-60 cursor-not-allowed bg-stone-50"
              )}
            />
          </div>
          <button
            type="button"
            onClick={state === 'otp_sent' ? handleResend : handleSendOtp}
            disabled={isLoading || (state === 'otp_sent' && resend > 0)}
            className={cn(
              "shrink-0 rounded-xl px-3 text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
              compact ? "py-2.5" : "py-3",
              state === 'otp_sent' && resend > 0
                ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                : "bg-stone-900 text-amber-400 hover:bg-stone-800 active:scale-95 shadow-sm"
            )}
          >
            {state === 'sending' ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                Sending…
              </span>
            ) : state === 'otp_sent' ? (
              resend > 0 ? `Resend ${resend}s` : 'Resend'
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon name="phone" size={13} />
                Send OTP
              </span>
            )}
          </button>
        </div>

        {/* Hint */}
        {state === 'idle' && (
          <p className={cn(
            "flex items-center gap-1.5 text-stone-400 mt-1.5 ml-1",
            compact ? "text-[10px]" : "text-[11px]"
          )}>
            <Icon name="info" size={11} />
            OTP will be sent to your mobile via SMS
          </p>
        )}

        {state === 'otp_sent' && (
          <p className={cn(
            "mt-1.5 ml-1 text-emerald-600 font-bold",
            compact ? "text-[10px]" : "text-[11px]"
          )}>
            Verification code sent · {phone}
          </p>
        )}
      </div>

      {/* ── OTP input ── */}
      {(state === 'otp_sent' || state === 'verifying') && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
                setOtp(v)
                setError(null)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === OTP_LENGTH) handleVerify() }}
              disabled={state === 'verifying'}
              placeholder="Enter 6-digit OTP"
              className={cn(
                "flex-1 rounded-xl border border-stone-200 bg-white px-4 font-black text-stone-900 tracking-[0.3em] outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:tracking-normal placeholder:font-normal placeholder:text-stone-300",
                compact ? "py-2.5 text-base" : "py-3 text-lg",
                state === 'verifying' && "opacity-60 cursor-not-allowed"
              )}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={otp.length !== OTP_LENGTH || state === 'verifying'}
              className={cn(
                "shrink-0 rounded-xl px-4 text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                compact ? "py-2.5" : "py-3",
                otp.length === OTP_LENGTH && state !== 'verifying'
                  ? "bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm"
                  : "bg-stone-100 text-stone-400 cursor-not-allowed"
              )}
            >
              {state === 'verifying' ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {(error || externalError) && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 ml-1">
          <Icon name="error" size={12} strokeWidth={3} />
          {error || externalError}
        </p>
      )}
    </div>
  )
}
