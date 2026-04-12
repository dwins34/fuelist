'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { CartItem, MenuItem, OrderStatus, Role } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveOrder {
  id:             string
  items:          CartItem[]
  total_amount:   number
  payment_status: string
  order_status:   OrderStatus
  address:        DeliveryAddress | null
  created_at:     string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:             { label: 'New Order',       color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200',   dot: 'bg-blue-500'   },
  preparing:       { label: 'Preparing',       color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  dot: 'bg-amber-500'  },
  ready:           { label: 'Ready',           color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  dot: 'bg-green-500'  },
  out_for_delivery:{ label: 'Out for Delivery',color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  delivered:       { label: 'Delivered',       color: 'text-gray-500',   bg: 'bg-gray-50   border-gray-200',   dot: 'bg-gray-400'   },
  cancelled:       { label: 'Cancelled',       color: 'text-red-600',    bg: 'bg-red-50    border-red-200',    dot: 'bg-red-400'    },
}

// Next action per role per current status
const NEXT_ACTION: Record<Role, Partial<Record<OrderStatus, { label: string; next: OrderStatus; style: string }>>> = {
  admin: {
    new:             { label: 'Accept & Prepare', next: 'preparing',       style: 'bg-blue-600  hover:bg-blue-700  text-white' },
    preparing:       { label: 'Mark Ready',       next: 'ready',           style: 'bg-amber-500 hover:bg-amber-600 text-white' },
    ready:           { label: 'Picked Up',        next: 'out_for_delivery',style: 'bg-green-600 hover:bg-green-700 text-white' },
    out_for_delivery:{ label: 'Mark Delivered',   next: 'delivered',       style: 'bg-purple-600 hover:bg-purple-700 text-white' },
  },
  kitchen: {
    new:       { label: 'Accept & Prepare', next: 'preparing', style: 'bg-blue-600  hover:bg-blue-700  text-white' },
    preparing: { label: 'Mark Ready',       next: 'ready',     style: 'bg-amber-500 hover:bg-amber-600 text-white' },
  },
  delivery: {
    ready:           { label: 'Picked Up',      next: 'out_for_delivery',style: 'bg-green-600  hover:bg-green-700  text-white' },
    out_for_delivery:{ label: 'Mark Delivered', next: 'delivered',       style: 'bg-purple-600 hover:bg-purple-700 text-white' },
  },
  user: {},
}

// ─── Time-ago ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({
  order, role, onAction, loading,
}: {
  order:    LiveOrder
  role:     Role
  onAction: (id: string, next: OrderStatus) => void
  loading:  string | null
}) {
  const cfg    = STATUS_CONFIG[order.order_status] ?? STATUS_CONFIG.new
  const action = (NEXT_ACTION[role] ?? {})[order.order_status]
  const shortId = `#${order.id.slice(-6).toUpperCase()}`
  const isNew  = order.order_status === 'new'

  return (
    <div className={`relative rounded-2xl border p-4 space-y-3 transition-shadow
      ${isNew ? 'shadow-md shadow-blue-100 ring-2 ring-blue-300' : 'shadow-sm'}
      bg-white`}
    >
      {/* Pulsing dot for new orders */}
      {isNew && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 pr-6">
        <div>
          <p className="text-sm font-bold text-gray-900 font-mono">{shortId}</p>
          <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {order.items.map(({ item, quantity }: { item: MenuItem; quantity: number }) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">
              <span className="inline-block w-5 text-center font-bold text-green-600">{quantity}×</span>
              {' '}{item.name}
            </span>
            <span className="text-gray-400 text-xs shrink-0 ml-2">{formatPrice(item.price * quantity)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-400">Total</span>
        <span className="text-sm font-bold text-gray-900">{formatPrice(order.total_amount)}</span>
      </div>

      {/* Address */}
      {order.address && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 space-y-0.5">
          <p className="font-semibold text-gray-700">{order.address.name} · {order.address.phone}</p>
          <p>{order.address.address_line1}{order.address.address_line2 ? `, ${order.address.address_line2}` : ''}</p>
          <p>{order.address.city}{order.address.pincode ? ` — ${order.address.pincode}` : ''}</p>
        </div>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={() => onAction(order.id, action.next)}
          disabled={loading === order.id}
          className={`w-full rounded-full py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${action.style}`}
        >
          {loading === order.id ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Updating…
            </span>
          ) : action.label}
        </button>
      )}
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  status, orders, role, onAction, loading,
}: {
  status:   OrderStatus
  orders:   LiveOrder[]
  role:     Role
  onAction: (id: string, next: OrderStatus) => void
  loading:  string | null
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className="flex flex-col gap-3 min-w-[260px] w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        <h2 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h2>
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {orders.length}
        </span>
      </div>
      {/* Cards */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <p className="text-xs text-gray-300">No orders</p>
          </div>
        ) : (
          orders.map((o) => (
            <OrderCard key={o.id} order={o} role={role} onAction={onAction} loading={loading} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Columns shown per role
const COLUMNS_FOR_ROLE: Record<Role, OrderStatus[]> = {
  admin:    ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
  kitchen:  ['new', 'preparing', 'ready'],
  delivery: ['ready', 'out_for_delivery', 'delivered'],
  user:     [],
}

export default function KitchenPage() {
  const supabase = createClient()

  const [orders,  setOrders]  = useState<LiveOrder[]>([])
  const [role,    setRole]    = useState<Role>('kitchen')
  const [loading, setLoading] = useState<string | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const [newAlert, setNewAlert] = useState(false)
  const prevOrderIds = useRef<Set<string>>(new Set())
  const audioRef     = useRef<HTMLAudioElement | null>(null)

  // Load current user role
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (data?.role) setRole(data.role as Role)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'paid')
      .not('order_status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setOrders(data as LiveOrder[])
      prevOrderIds.current = new Set(data.map((o) => o.id))
    }
  }, [supabase])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('live-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as LiveOrder
          if (newOrder.payment_status !== 'paid') return
          setOrders((prev) => [newOrder, ...prev])
          // Alert for new orders
          if (!prevOrderIds.current.has(newOrder.id)) {
            prevOrderIds.current.add(newOrder.id)
            setNewAlert(true)
            setTimeout(() => setNewAlert(false), 4000)
            audioRef.current?.play().catch(() => {})
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as LiveOrder
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Update order status
  async function handleAction(orderId: string, nextStatus: OrderStatus) {
    setLoading(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchOrders()
      showToast('Order updated!', true)
    } catch {
      showToast('Failed to update order. Try again.', false)
    } finally {
      setLoading(null)
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const columns = COLUMNS_FOR_ROLE[role] ?? []

  // Group orders by status
  const byStatus: Record<OrderStatus, LiveOrder[]> = {
    new: [], preparing: [], ready: [], out_for_delivery: [], delivered: [], cancelled: [],
  }
  orders.forEach((o) => {
    if (byStatus[o.order_status]) byStatus[o.order_status].push(o)
  })

  const totalActive = (byStatus.new?.length ?? 0) + (byStatus.preparing?.length ?? 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hidden audio element for new-order chime */}
      <audio ref={audioRef} src="/chime.mp3" preload="none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              🍽 Live Orders
            </h1>
            <p className="text-xs text-gray-400 capitalize">{role} view</p>
          </div>
          {totalActive > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold">
              {totalActive} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-gray-300 font-medium">Live</span>
          </div>
          <button
            onClick={fetchOrders}
            className="rounded-full bg-gray-800 p-2 hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── New order alert banner ── */}
      {newAlert && (
        <div className="flex items-center justify-center gap-2 bg-blue-600 py-2.5 text-sm font-bold animate-pulse">
          <span>🔔</span> New order just arrived!
        </div>
      )}

      {/* ── Kanban board ── */}
      <div className="overflow-x-auto px-6 py-6">
        <div className="flex gap-5 w-max">
          {columns.map((status) => (
            <Column
              key={status}
              status={status}
              orders={byStatus[status] ?? []}
              role={role}
              onAction={handleAction}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shadow-xl
          ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
        >
          <span>{toast.ok ? '✓' : '✕'}</span> {toast.msg}
        </div>
      )}
    </div>
  )
}
