'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import { CartItem, MenuItem, OrderStatus } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id:             string
  items:          CartItem[]
  total_amount:   number
  payment_status: string
  order_status:   OrderStatus
  payment_id:     string | null
  address:        DeliveryAddress | null
  created_at:     string
}

// ─── Status steps ─────────────────────────────────────────────────────────────

const STEPS: { key: OrderStatus; label: string; sublabel: string; icon: string }[] = [
  { key: 'new',             label: 'Order Received',   sublabel: 'We got your order!',                icon: '📋' },
  { key: 'preparing',       label: 'Being Prepared',   sublabel: 'Kitchen is making your bowls.',     icon: '👨‍🍳' },
  { key: 'ready',           label: 'Ready',            sublabel: 'Your order is packed and ready.',   icon: '📦' },
  { key: 'out_for_delivery',label: 'Out for Delivery', sublabel: 'Your delivery is on the way!',      icon: '🛵' },
  { key: 'delivered',       label: 'Delivered',        sublabel: 'Enjoy your meal!',                  icon: '🎉' },
]

const STATUS_ORDER: OrderStatus[] = ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered']

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 rounded" />
      <div className="rounded-2xl bg-white border border-gray-100 p-6 space-y-4">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="flex justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="h-2 w-12 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const { profile, accessToken, loading: authLoading } = useAuthContext()
  const { addItem, clearCart } = useCart()
  const supabase = useMemo(() => createClient(), [])

  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [toast,   setToast]   = useState<string | null>(null)

  function handleReorder() {
    if (!order) return
    clearCart()
    order.items.forEach(({ item, quantity }) => {
      for (let i = 0; i < quantity; i++) addItem(item)
    })
    setToast('Items added to cart!')
    setTimeout(() => setToast(null), 3000)
    router.push('/menu')
  }

  // Redirect guests
  useEffect(() => {
    if (!authLoading && !profile) router.push('/login')
  }, [authLoading, profile, router])

  // Fetch order
  useEffect(() => {
    if (!profile || !accessToken || !id) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return

    fetch(
      `${sbUrl}/rest/v1/orders?id=eq.${id}&user_id=eq.${profile.id}&select=*&limit=1`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` } }
    )
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) { setError('Order not found.'); return }
        setOrder(rows[0] as Order)
      })
      .catch(() => setError('Failed to load order.'))
      .finally(() => setLoading(false))
  }, [profile, accessToken, id])

  // Realtime: subscribe to status updates for this order
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, ...(payload.new as Order) } : prev)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, supabase])

  if (authLoading || loading) return <Skeleton />

  if (error || !order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-500">{error ?? 'Order not found.'}</p>
        <Link href="/orders" className="text-sm text-green-600 hover:underline">Back to orders</Link>
      </div>
    )
  }

  const currentIdx  = STATUS_ORDER.indexOf(order.order_status)
  const currentStep = STEPS.find((s) => s.key === order.order_status)
  const isDelivered = order.order_status === 'delivered'
  const shortId     = `#${order.id.slice(-8).toUpperCase()}`
  const date        = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const time        = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-5">

      {/* Back */}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        My orders
      </Link>

      {/* Hero status card */}
      <div className={`rounded-2xl border p-6 text-center space-y-2
        ${isDelivered ? 'bg-green-50 border-green-200' : 'bg-white border-green-200 shadow-sm shadow-green-50'}`}>
        <div className="text-4xl mb-1">{currentStep?.icon}</div>
        <h1 className="text-xl font-extrabold text-gray-900">{currentStep?.label}</h1>
        <p className="text-sm text-gray-500">{currentStep?.sublabel}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="font-mono text-xs text-gray-400">{shortId}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{date}, {time}</span>
          {!isDelivered && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress timeline */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Order Progress</h2>

        {/* Horizontal step bar */}
        <div className="relative flex items-start justify-between mb-6">
          {/* background line */}
          <div className="absolute left-5 right-5 top-5 h-0.5 bg-gray-200" />
          {/* filled line */}
          <div
            className="absolute left-5 top-5 h-0.5 bg-green-500 transition-all duration-700 ease-in-out"
            style={{ width: `calc(${(currentIdx / (STATUS_ORDER.length - 1)) * 100}% - 2.5rem + ${currentIdx === STATUS_ORDER.length - 1 ? '2.5rem' : '0px'})` }}
          />

          {STEPS.map((step, i) => {
            const done    = i <= currentIdx
            const current = i === currentIdx
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 w-16">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg border-2 transition-all duration-500
                  ${done
                    ? 'bg-green-500 border-green-500 shadow-md shadow-green-100'
                    : 'bg-white border-gray-200'
                  }
                  ${current ? 'ring-4 ring-green-100' : ''}
                `}>
                  {done ? step.icon : <span className="h-2 w-2 rounded-full bg-gray-300" />}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight
                  ${done ? 'text-green-700' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Vertical detail list */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {STEPS.map((step, i) => {
            const done    = i <= currentIdx
            const current = i === currentIdx
            return (
              <div key={step.key} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all
                ${current ? 'bg-green-50 border border-green-100' : ''}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm
                  ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {done ? (current ? step.icon : '✓') : <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-300'}`}>
                    {step.label}
                    {current && !isDelivered && (
                      <span className="ml-2 text-xs font-normal text-green-500 animate-pulse">● in progress</span>
                    )}
                  </p>
                  {current && (
                    <p className="text-xs text-gray-400 mt-0.5">{step.sublabel}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Order summary</h2>

        <div className="space-y-3">
          {order.items.map(({ item, quantity }: { item: MenuItem; quantity: number }) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-green-50">
                {item.image_url
                  ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  : <div className="flex h-full items-center justify-center text-lg">🥗</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{quantity} × {formatPrice(item.price)}</p>
              </div>
              <span className="text-sm font-bold text-green-600 shrink-0">
                {formatPrice(item.price * quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm text-gray-500">Total paid</span>
          <span className="font-bold text-gray-900">{formatPrice(order.total_amount)}</span>
        </div>

        {order.address && (
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-700 mb-1">📍 Delivering to</p>
            <p>{order.address.name} · {order.address.phone}</p>
            <p>{order.address.address_line1}{order.address.address_line2 ? `, ${order.address.address_line2}` : ''}</p>
            <p>{order.address.city}{order.address.state ? `, ${order.address.state}` : ''} — {order.address.pincode}</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex gap-3 pb-4">
        <Link href="/orders" className="flex-1 text-center rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          All orders
        </Link>
        <button
          onClick={handleReorder}
          className="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Order again
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-sm font-medium text-green-700 shadow-lg">
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
