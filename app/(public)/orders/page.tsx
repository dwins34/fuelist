'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  payment_status: 'pending' | 'paid' | 'failed'
  order_status:   OrderStatus
  address:        DeliveryAddress | null
  created_at:     string
}

// ─── Status config (customer-facing labels) ───────────────────────────────────

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'new',             label: 'Order Received',    icon: '📋' },
  { key: 'preparing',       label: 'Being Prepared',    icon: '👨‍🍳' },
  { key: 'ready',           label: 'Ready',             icon: '📦' },
  { key: 'out_for_delivery',label: 'Out for Delivery',  icon: '🛵' },
  { key: 'delivered',       label: 'Delivered',         icon: '✅' },
]

const STATUS_ORDER: OrderStatus[] = ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered']

const ACTIVE_STATUSES: OrderStatus[] = ['new', 'preparing', 'ready', 'out_for_delivery']

function isActive(status: OrderStatus) {
  return ACTIVE_STATUSES.includes(status)
}

// ─── Inline live tracker bar ──────────────────────────────────────────────────

function LiveTracker({ status }: { status: OrderStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(status)

  return (
    <div className="px-5 pb-4 pt-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-green-600 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live tracking
        </span>
      </div>

      {/* Step dots + connecting line */}
      <div className="relative flex items-center justify-between">
        {/* background line */}
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-gray-200" />
        {/* filled line */}
        <div
          className="absolute left-0 top-3 h-0.5 bg-green-500 transition-all duration-700"
          style={{ width: `${(currentIdx / (STATUS_ORDER.length - 1)) * 100}%` }}
        />

        {STATUS_STEPS.map((step, i) => {
          const done    = i <= currentIdx
          const current = i === currentIdx
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs border-2 transition-all
                ${done
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-200 text-gray-300'
                }
                ${current ? 'ring-2 ring-green-300 ring-offset-1' : ''}
              `}>
                {done ? (i === currentIdx ? step.icon : '✓') : '·'}
              </div>
              <span className={`text-[9px] font-medium text-center leading-tight max-w-[44px]
                ${done ? 'text-green-700' : 'text-gray-300'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Single order card ────────────────────────────────────────────────────────

function OrderCard({ order, onReorder }: { order: Order; onReorder: (items: CartItem[]) => void }) {
  const date     = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const time     = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const shortId  = `#${order.id.slice(-8).toUpperCase()}`
  const active   = isActive(order.order_status)
  const delivered = order.order_status === 'delivered'

  return (
    <div className={`rounded-2xl bg-white border shadow-sm overflow-hidden transition-all
      ${active ? 'border-green-200 shadow-green-50 ring-1 ring-green-200' : 'border-gray-100'}`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b
        ${active ? 'bg-green-50/70 border-green-100' : 'bg-gray-50/60 border-gray-50'}`}>
        <div>
          <p className="text-xs font-mono text-gray-400">{shortId}</p>
          <p className="text-xs text-gray-400 mt-0.5">{date} · {time}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">{formatPrice(order.total_amount)}</span>
          {active && (
            <Link
              href={`/orders/${order.id}`}
              className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 transition-colors"
            >
              Track →
            </Link>
          )}
          {delivered && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              ✓ Delivered
            </span>
          )}
        </div>
      </div>

      {/* Live tracker for active orders */}
      {active && (
        <div className="border-b border-green-100">
          <LiveTracker status={order.order_status} />
        </div>
      )}

      {/* Items — collapsed to 2 for delivered, full for active */}
      <div className="px-5 py-3 space-y-2.5">
        {(active ? order.items : order.items.slice(0, 2)).map(({ item, quantity }: { item: MenuItem; quantity: number }) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-green-50">
              {item.image_url
                ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                : <div className="flex h-full items-center justify-center text-base">🥗</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-400">{quantity} × {formatPrice(item.price)}</p>
            </div>
            <span className="text-sm font-semibold text-green-600 shrink-0">
              {formatPrice(item.price * quantity)}
            </span>
          </div>
        ))}
        {!active && order.items.length > 2 && (
          <p className="text-xs text-gray-400 pl-1">+{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Address + actions */}
      <div className="px-5 pb-4 space-y-2.5">
        {order.address && (
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
            📍 {order.address.address_line1}, {order.address.city}
            {order.address.pincode ? ` — ${order.address.pincode}` : ''}
          </div>
        )}

        <div className="flex gap-2">
          {active && (
            <Link
              href={`/orders/${order.id}`}
              className="flex-1 text-center rounded-full border border-green-500 text-green-600 py-2 text-xs font-semibold hover:bg-green-50 transition-colors"
            >
              View full tracking
            </Link>
          )}
          {delivered && (
            <button
              onClick={() => onReorder(order.items)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 active:scale-95 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reorder
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router  = useRouter()
  const { profile, accessToken, loading: authLoading } = useAuthContext()
  const { addItem, clearCart } = useCart()
  const supabase = useMemo(() => createClient(), [])

  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<string | null>(null)

  // Redirect guests
  useEffect(() => {
    if (!authLoading && !profile) router.push('/login')
  }, [authLoading, profile, router])

  // Fetch orders
  useEffect(() => {
    if (!profile || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return

    fetch(
      `${sbUrl}/rest/v1/orders?user_id=eq.${profile.id}&order=created_at.desc&select=*`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` } }
    )
      .then((r) => r.json())
      .then((rows) => setOrders(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile, accessToken])

  // Realtime: watch updates to this user's active orders
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('my-orders-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => o.id === payload.new.id ? { ...o, ...(payload.new as Order) } : o)
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, supabase])

  function handleReorder(items: CartItem[]) {
    clearCart()
    items.forEach(({ item, quantity }) => {
      for (let i = 0; i < quantity; i++) addItem(item)
    })
    setToast('Items added to cart!')
    setTimeout(() => setToast(null), 3000)
    router.push('/menu')
  }

  const activeOrders    = orders.filter((o) => isActive(o.order_status))
  const completedOrders = orders.filter((o) => !isActive(o.order_status))

  if (authLoading) return <Skeleton />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-400 mt-1">Live status updates automatically.</p>
      </div>

      {loading ? (
        <Skeleton />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="text-6xl">🥗</div>
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400">Place your first order and it&apos;ll show up here.</p>
          <Link href="/menu" className="mt-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors">
            Browse menu
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
                Active · {activeOrders.length}
              </h2>
              {activeOrders.map((o) => (
                <OrderCard key={o.id} order={o} onReorder={handleReorder} />
              ))}
            </div>
          )}

          {/* Past orders */}
          {completedOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
                Past orders
              </h2>
              {completedOrders.map((o) => (
                <OrderCard key={o.id} order={o} onReorder={handleReorder} />
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-sm font-medium text-green-700 shadow-lg">
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
