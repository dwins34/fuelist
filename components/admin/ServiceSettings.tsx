'use client'

import { useState, useEffect } from 'react'
import { useServiceStatus } from '@/context/ServiceStatusContext'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function ServiceSettings() {
  const {
    isEnabled:    currentEnabled,
    message:      currentMessage,
    deliveryFee:  currentFee,
    refreshStatus,
  } = useServiceStatus()

  const [enabled,     setEnabled]     = useState(currentEnabled)
  const [message,     setMessage]     = useState(currentMessage)
  const [deliveryFee, setDeliveryFee] = useState(currentFee)
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [feeInput,    setFeeInput]    = useState(String(currentFee))

  // Sync when context refreshes
  useEffect(() => {
    setEnabled(currentEnabled)
    setMessage(currentMessage)
    setDeliveryFee(currentFee)
    setFeeInput(String(currentFee))
  }, [currentEnabled, currentMessage, currentFee])

  const isDirty =
    enabled !== currentEnabled ||
    message !== currentMessage ||
    deliveryFee !== currentFee

  async function handleSave() {
    setLoading(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, message, delivery_fee: deliveryFee }),
      })
      if (res.ok) {
        setSuccess(true)
        await refreshStatus()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Save settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm space-y-8">

      {/* ── Section header ── */}
      <div>
        <h2 className="text-xl font-black text-stone-900 tracking-tighter">Operational Settings</h2>
        <p className="text-xs font-medium text-stone-400 mt-1">
          Service status, messaging, and delivery pricing.
        </p>
      </div>

      {/* ── Service on/off ── */}
      <div className="flex items-center justify-between py-5 px-6 rounded-2xl bg-stone-50 border border-stone-100">
        <div>
          <p className="text-sm font-black text-stone-900">Store Status</p>
          <p className="text-[11px] font-medium text-stone-400 mt-0.5">
            Toggle to open or close the store for all customers.
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={cn(
            'relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 shadow-inner',
            enabled ? 'bg-amber-500 shadow-amber-200' : 'bg-stone-200 shadow-stone-100'
          )}
          role="switch"
          aria-checked={enabled}
        >
          <motion.span
            animate={{ x: enabled ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg shadow-black/5"
          />
        </button>
      </div>

      {/* ── Downtime message ── */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 px-1">
          Offline Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={enabled}
          placeholder="e.g. We're closed for the day. Back tomorrow at 8:00 AM!"
          className={cn(
            'w-full rounded-2xl border px-5 py-4 text-sm font-medium transition-all focus:outline-none focus:ring-4 placeholder:text-stone-300 resize-none',
            enabled
              ? 'bg-stone-50 border-stone-50 text-stone-300'
              : 'bg-white border-stone-200 focus:border-amber-500 focus:ring-amber-50'
          )}
          rows={3}
        />
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 mt-2 px-1">
          Shown on the banner and checkout when the store is OFFLINE.
        </p>
      </div>

      {/* ── Delivery fee ── */}
      <div className="pt-2 border-t border-stone-100">
        <label className="block text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 px-1">
          Delivery Fee
        </label>

        <div className="flex items-center gap-3">
          {/* ₹ prefix box */}
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 w-full max-w-[180px] focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-50 transition-all">
            <span className="text-stone-400 font-black text-sm">₹</span>
            <input
              type="number"
              min={0}
              max={999}
              step={5}
              value={feeInput}
              onChange={(e) => {
                setFeeInput(e.target.value)
                const parsed = parseFloat(e.target.value)
                if (!isNaN(parsed) && parsed >= 0) setDeliveryFee(parsed)
              }}
              className="w-full bg-transparent text-stone-900 font-black text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Quick-set presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {[0, 15, 25, 40, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => { setDeliveryFee(preset); setFeeInput(String(preset)) }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-black transition-all border',
                  deliveryFee === preset
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-amber-300 hover:text-amber-600'
                )}
              >
                {preset === 0 ? 'Free' : `₹${preset}`}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300 mt-3 px-1">
          Applied to every order at checkout. Set to ₹0 for free delivery.
        </p>
      </div>

      {/* ── Save row ── */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"
            >
              <Icon name="success" size={14} strokeWidth={4} />
              Changes Saved
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSave}
          disabled={loading || !isDirty}
          className="ml-auto group flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3 text-sm font-black text-white hover:bg-stone-800 disabled:opacity-30 disabled:grayscale transition-all shadow-md active:scale-95"
        >
          <Icon
            name={loading ? 'preparing' : 'security'}
            size={16}
            strokeWidth={3}
            className={cn(loading && 'animate-spin')}
          />
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
