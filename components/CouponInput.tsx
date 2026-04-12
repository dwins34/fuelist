'use client'

import { useState } from 'react'
import { ApplyCouponResult } from '@/types'

interface CouponInputProps {
  orderAmount: number
  onApply: (result: ApplyCouponResult) => void
  onRemove: () => void
  applied: ApplyCouponResult | null
  isFirstOrder: boolean
}

export default function CouponInput({
  orderAmount,
  onApply,
  onRemove,
  applied,
  isFirstOrder,
}: CouponInputProps) {
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleApply() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/coupons/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: trimmed, order_amount: orderAmount }),
      })
      const data: ApplyCouponResult = await res.json()

      if (data.valid) {
        onApply(data)
        setError(null)
      } else {
        setError(data.error ?? 'Invalid coupon')
      }
    } catch {
      setError('Could not apply coupon. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleRemove() {
    setCode('')
    setError(null)
    onRemove()
  }

  // ── Applied state ────────────────────────────────────────────────────────────
  if (applied?.valid) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎟️</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {applied.coupon?.code}
                {applied.is_first_order && (
                  <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    First Order
                  </span>
                )}
              </p>
              <p className="text-xs text-green-600">
                ₹{applied.discount_amount.toFixed(0)} off applied
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* First-order suggestion banner */}
      {isFirstOrder && (
        <button
          type="button"
          onClick={() => setCode('WELCOME50')}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-green-400 bg-green-50 px-3 py-2.5 text-left transition-colors hover:bg-green-100"
        >
          <span className="text-lg">🎉</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-800">First Order Offer!</p>
            <p className="text-xs text-green-600 truncate">
              Use <span className="font-mono font-bold">WELCOME50</span> to get ₹50 off
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-green-700 underline">Apply</span>
        </button>
      )}

      {/* Coupon input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Enter coupon code"
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono tracking-widest uppercase placeholder-gray-400 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
          }`}
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : 'Apply'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
