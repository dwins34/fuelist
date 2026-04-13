'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { formatPrice, getImageUrl } from '@/lib/utils'
// import { buildWhatsAppMessage } from '@/lib/whatsapp'
import { CartItem } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredOrder {
  order_id: string
  items:    CartItem[]
  total:    number
  address:  DeliveryAddress
}

// ─── Animated checkmark ───────────────────────────────────────────────────────

function CheckmarkCircle() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings */}
      <span className="absolute inline-flex h-28 w-28 rounded-full bg-green-400 opacity-20 animate-ping" />
      <span className="absolute inline-flex h-24 w-24 rounded-full bg-green-400 opacity-20 animate-ping [animation-delay:200ms]" />
      {/* Circle */}
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-200">
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  )
}

// ─── Order timeline ───────────────────────────────────────────────────────────

const TIMELINE = [
  { label: 'Order placed',    icon: '📋', done: true,  active: false },
  { label: 'Payment confirmed', icon: '✅', done: true,  active: false },
  { label: 'Being prepared',  icon: '👨‍🍳', done: false, active: true  },
  { label: 'Out for delivery', icon: '🛵', done: false, active: false },
  { label: 'Delivered',       icon: '🎉', done: false, active: false },
]

function OrderTimeline() {
  return (
    <div className="w-full">
      {TIMELINE.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base
              ${step.done  ? 'bg-green-500 text-white' :
                step.active ? 'bg-green-100 ring-2 ring-green-500 text-green-700' :
                              'bg-gray-100 text-gray-300'}`}>
              {step.icon}
            </div>
            {i < TIMELINE.length - 1 && (
              <div className={`w-0.5 h-6 mt-0.5 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
          {/* Label */}
          <div className="pb-1 pt-1">
            <p className={`text-sm font-medium ${
              step.done ? 'text-green-700' : step.active ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {step.label}
            </p>
            {step.active && (
              <p className="text-xs text-green-500 font-medium animate-pulse">In progress…</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── WhatsApp countdown button — disabled, re-enable when ready ───────────────
//
// const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? '919999999999'
//
// function WhatsAppNotify({ order }: { order: StoredOrder }) {
//   const [countdown, setCountdown] = useState(5)
//   const [sent,      setSent]      = useState(false)
//   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
//   const urlRef = useRef(
//     `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
//       buildWhatsAppMessage(order.items, order.total, order.address)
//     )}`
//   )
//   const hasFired = useRef(false)
//
//   useEffect(() => {
//     timerRef.current = setInterval(() => {
//       setCountdown((c) => { if (c <= 1) return 0; return c - 1 })
//     }, 1000)
//     return () => { if (timerRef.current) clearInterval(timerRef.current) }
//   }, [])
//
//   useEffect(() => {
//     if (countdown === 0 && !hasFired.current) {
//       hasFired.current = true
//       clearInterval(timerRef.current!)
//       setSent(true)
//       window.open(urlRef.current, '_blank', 'noopener,noreferrer')
//     }
//   }, [countdown])
//
//   function handleClick() {
//     if (hasFired.current) return
//     hasFired.current = true
//     clearInterval(timerRef.current!)
//     setSent(true)
//     window.open(urlRef.current, '_blank', 'noopener,noreferrer')
//   }
//
//   if (sent) {
//     return (
//       <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
//         <p className="text-sm font-medium text-green-700">
//           WhatsApp opened — your order was sent to the restaurant!
//         </p>
//       </div>
//     )
//   }
//
//   return (
//     <button onClick={handleClick} className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#25D366] px-4 py-3 text-white shadow-md shadow-green-200 hover:bg-[#20b858] active:scale-95 transition-all">
//       <div className="text-left">
//         <p className="text-sm font-bold">Notify restaurant via WhatsApp</p>
//         <p className="text-xs text-green-100">Opens automatically in {countdown}s…</p>
//       </div>
//     </button>
//   )
// }

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId      = searchParams.get('order_id')

  const [order, setOrder] = useState<StoredOrder | null>(null)


  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fuelist_last_order')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOrder
        setOrder(parsed)
        sessionStorage.removeItem('fuelist_last_order')
      }
    } catch {}
  }, [])

  const shortId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''

  return (
    <>
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6">

      {/* ── Hero: checkmark + heading ── */}
      <div className="flex flex-col items-center gap-5 text-center pt-4">
        <CheckmarkCircle />
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Order Confirmed!</h1>
          {shortId && (
            <p className="mt-1 text-sm text-gray-400 font-mono">{shortId}</p>
          )}
          <p className="mt-2 text-gray-500 text-sm max-w-xs mx-auto">
            Your payment was successful. We&apos;re getting your bowls ready!
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 font-medium">
          <span>⏱</span> Estimated delivery: 30–45 min
        </div>
      </div>

      {/* ── WhatsApp notify — disabled, re-enable when ready ── */}
      {/* {order && <WhatsAppNotify order={order} />} */}

      {/* ── Order timeline ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Order status</h2>
        <OrderTimeline />
      </div>

      {/* ── Order summary ── */}
      {order && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Your order</h2>

          <div className="space-y-3">
            {order.items.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-green-50">
                  {item.image_url ? (
                    <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl">🥗</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">×{quantity}</p>
                </div>
                <span className="text-sm font-bold text-green-600 shrink-0">
                  {formatPrice(item.price * quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total paid</span>
            <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
          </div>

          {/* Delivery address */}
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-700 text-sm mb-1">📍 Delivering to</p>
            <p>{order.address.name} · {order.address.phone}</p>
            <p>{order.address.address_line1}{order.address.address_line2 ? `, ${order.address.address_line2}` : ''}</p>
            <p>{order.address.city}{order.address.state ? `, ${order.address.state}` : ''} — {order.address.pincode}</p>
            {order.address.landmark && <p>Near {order.address.landmark}</p>}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col gap-3 pb-4">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-200" />
            </span>
            Track your order live
          </Link>
        )}
        <div className="flex gap-3">
          <Link
            href="/orders"
            className="flex-1 text-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            All orders
          </Link>
          <Link
            href="/menu"
            className="flex-1 text-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Order again
          </Link>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
