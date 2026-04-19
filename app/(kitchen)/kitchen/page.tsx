'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, getTodayStrIST } from '@/lib/utils'
import { CartItem, MenuItem, OrderStatus, Role } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveOrder {
  id:              string
  delivery_date:   string
  delivery_slot:   'morning' | 'afternoon' | 'evening'
  status:          OrderStatus
  items:           CartItem[]
  total_amount:    number
  address:         DeliveryAddress | null
  subscription_id: string | null
  order_id:        string | null
  created_at:      string
  estimated_prep_time?: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string; border: string }> = {
  new:             { label: 'New Order',        color: 'text-amber-700',  bg: 'bg-amber-50   border-amber-200',  dot: 'bg-amber-500',   border: 'border-amber-300' },
  preparing:       { label: 'Preparing',        color: 'text-blue-700',   bg: 'bg-blue-50    border-blue-200',   dot: 'bg-blue-500',    border: 'border-blue-300'  },
  ready:           { label: 'Ready to Pick',    color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',dot: 'bg-emerald-500', border: 'border-emerald-300'},
  out_for_delivery:{ label: 'Out for Delivery', color: 'text-purple-700', bg: 'bg-purple-50  border-purple-200', dot: 'bg-purple-500',  border: 'border-purple-300'},
  delivered:       { label: 'Delivered',        color: 'text-stone-500',  bg: 'bg-stone-50   border-stone-200',  dot: 'bg-stone-400',   border: 'border-stone-200' },
  cancelled:       { label: 'Cancelled',        color: 'text-red-600',    bg: 'bg-red-50     border-red-200',    dot: 'bg-red-400',     border: 'border-red-200'   },
}

const NEXT_ACTION: Record<Role, Partial<Record<OrderStatus, { label: string; next: OrderStatus; style: string }>>> = {
  admin: {
    new:             { label: 'Start Preparing', next: 'preparing',        style: 'bg-amber-500  hover:bg-amber-600  text-white' },
    preparing:       { label: 'Mark Ready',      next: 'ready',            style: 'bg-blue-600   hover:bg-blue-700   text-white' },
    ready:           { label: 'Picked Up',       next: 'out_for_delivery', style: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    out_for_delivery:{ label: 'Mark Delivered',  next: 'delivered',        style: 'bg-purple-600 hover:bg-purple-700 text-white' },
  },
  kitchen: {
    new:       { label: 'Start Preparing', next: 'preparing', style: 'bg-amber-500 hover:bg-amber-600 text-white' },
    preparing: { label: 'Mark Ready',      next: 'ready',     style: 'bg-blue-600  hover:bg-blue-700  text-white' },
  },
  delivery: {
    ready:           { label: 'Picked Up',      next: 'out_for_delivery', style: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    out_for_delivery:{ label: 'Mark Delivered', next: 'delivered',        style: 'bg-purple-600  hover:bg-purple-700 text-white' },
  },
  user: {},
}

const COLUMNS_FOR_ROLE: Record<Role, OrderStatus[]> = {
  admin:    ['new', 'preparing', 'ready', 'out_for_delivery'],
  kitchen:  ['new', 'preparing', 'ready'],
  delivery: ['ready', 'out_for_delivery'],
  user:     [],
}

// ─── Live timer ───────────────────────────────────────────────────────────────

function LiveTimer({ createdAt, prepMins }: { createdAt: string; prepMins: number }) {
  const [secs, setSecs] = useState(() => Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))

  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)), 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const limit = prepMins * 60
  const isWarn    = secs >= limit * 0.8
  const isOverdue = secs >= limit

  return (
    <span className={`font-mono text-xs font-black tabular-nums ${isOverdue ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-emerald-600'}`}>
      {isOverdue ? `+${m - prepMins}m` : `${m}m ${String(s).padStart(2, '0')}s`}
    </span>
  )
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ createdAt, prepMins }: { createdAt: string; prepMins: number }) {
  const waitMins = (Date.now() - new Date(createdAt).getTime()) / 60000
  const isOverdue = waitMins > prepMins
  const isHigh    = waitMins > prepMins * 0.8

  if (isOverdue) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-600 text-[9px] font-black uppercase tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />Critical
    </span>
  )
  if (isHigh) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />High
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-500 text-[9px] font-black uppercase tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />Normal
    </span>
  )
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order, role, onAction, loading }: {
  order: LiveOrder; role: Role; onAction: (id: string, next: OrderStatus) => void; loading: string | null
}) {
  const cfg     = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.preparing
  const action  = (NEXT_ACTION[role] ?? {})[order.status]
  const itemCount = order.items.reduce((s: number, e: any) => s + (e?.quantity ?? e?.item?.quantity ?? 1), 0)

  const prepMins  = order.estimated_prep_time ?? Math.max(5, itemCount * 5)
  const shortId  = order.subscription_id
    ? `SUB-${order.id.slice(-4).toUpperCase()}`
    : `#${order.id.slice(-6).toUpperCase()}`
  const isNew   = order.status === 'new'
  const waitMins = (Date.now() - new Date(order.created_at).getTime()) / 60000
  const isOverdue = waitMins > prepMins

  return (
    <div className={`relative rounded-2xl border-2 bg-white overflow-hidden transition-shadow
      ${isOverdue ? 'border-red-300 shadow-md shadow-red-100' : isNew ? 'border-amber-300 shadow-md shadow-amber-100 ring-2 ring-amber-200' : cfg.border}
    `}>
      {/* Overdue bar */}
      {isOverdue && <div className="h-1 bg-gradient-to-r from-red-500 to-red-400 animate-pulse" />}

      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${isOverdue ? 'border-red-100 bg-red-50/50' : isNew ? 'border-amber-100 bg-amber-50/50' : 'border-stone-100 bg-stone-50/50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-stone-600 tracking-wider font-mono">{shortId}</span>
          {order.subscription_id && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 border border-purple-200">Sub</span>
          )}
          <PriorityBadge createdAt={order.created_at} prepMins={prepMins} />
        </div>
        <LiveTimer createdAt={order.created_at} prepMins={prepMins} />
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {order.items.map((entry: any, idx: number) => {
          // DB stores: { item: { item: { id, name, price, ... }, quantity }, quantity }
          const item = entry?.item?.item ?? entry?.item ?? entry
          const qty  = entry?.quantity ?? entry?.item?.quantity ?? 1
          return (
            <div key={item?.id ?? idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 h-5 w-5 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700">{qty}</span>
                <span className="text-[12px] font-bold text-stone-800 truncate">{item?.name ?? '—'}</span>
              </div>
              <span className="text-[11px] text-stone-400 shrink-0">{item?.price != null ? formatPrice(item.price * qty) : '—'}</span>
            </div>
          )
        })}
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-stone-400">Est. {prepMins}m</span>
          {order.address?.name && (
            <span className="text-[9px] font-medium text-stone-400 truncate max-w-[100px]">· {order.address.name}</span>
          )}
        </div>
        <span className="text-[11px] font-black text-stone-700">{formatPrice(order.total_amount)}</span>
      </div>

      {/* Action */}
      {action && (
        <button
          onClick={() => onAction(order.id, action.next)}
          disabled={loading === order.id}
          className={`w-full py-3 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 ${action.style}`}
        >
          {loading === order.id ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Updating…
            </span>
          ) : action.label}
        </button>
      )}
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
        active ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-400'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ status, orders, role, onAction, loading }: {
  status: OrderStatus; orders: LiveOrder[]; role: Role; onAction: (id: string, next: OrderStatus) => void; loading: string | null
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] h-full">
      <div className="flex items-center gap-2 px-1 py-3 shrink-0">
        <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        <h2 className={`text-[11px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</h2>
        <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-stone-500">
          {orders.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 py-10 text-center">
            <p className="text-2xl mb-1">✓</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">All clear</p>
          </div>
        ) : (
          orders.map(o => <OrderCard key={o.id} order={o} role={role} onAction={onAction} loading={loading} />)
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TIME_FILTERS = [
  { label: 'All',  value: null },
  { label: '15m',  value: 15 },
  { label: '30m',  value: 30 },
  { label: '1h',   value: 60 },
]

export default function KitchenPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders,    setOrders]    = useState<LiveOrder[]>([])
  const [role,      setRole]      = useState<Role>('kitchen')
  const [loading,   setLoading]   = useState<string | null>(null)
  const [syncing,   setSyncing]   = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [newAlert,  setNewAlert]  = useState(false)
  const [timeFilter,setTimeFilter]= useState<number | null>(null)
  const [hideReady, setHideReady] = useState(false)
  const prevIds  = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load role
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (data?.role) setRole(data.role as Role)
    })
  }, [supabase])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    const today = getTodayStrIST()
    const { data } = await supabase
      .from('delivery_log')
      .select('*')
      .eq('delivery_date', today)
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) {
      setOrders(data as LiveOrder[])
      prevIds.current = new Set(data.map(o => o.id))
    }
  }, [supabase])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('kds-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_log' }, (p) => {
        const o = p.new as LiveOrder
        if (prevIds.current.has(o.id)) return
        prevIds.current.add(o.id)
        setOrders(prev => [o, ...prev])
        setNewAlert(true)
        setTimeout(() => setNewAlert(false), 4000)
        audioRef.current?.play().catch(() => {})
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_log' }, (p) => {
        const u = p.new as LiveOrder
        setOrders(prev => prev.map(o => o.id === u.id ? { ...o, ...u } : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  // Actions
  async function handleAction(id: string, next: OrderStatus) {
    setLoading(id)
    try {
      const res = await fetch(`/api/admin/deliveries/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      fetchOrders()
      showToast('Status updated!', true)
    } catch { showToast('Failed — try again.', false) }
    finally { setLoading(null) }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/deliveries/generate', { method: 'POST' })
      const d = await res.json()
      if (res.ok) { showToast(`Synced! ${d.generated} new items.`, true); fetchOrders() }
      else throw new Error(d.error)
    } catch (e: any) { showToast(e.message || 'Sync failed', false) }
    finally { setSyncing(false) }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // Derived
  const columns = COLUMNS_FOR_ROLE[role] ?? []

  const filtered = useMemo(() => {
    let list = [...orders]
    if (timeFilter) {
      const cutoff = Date.now() - timeFilter * 60 * 1000
      list = list.filter(o => new Date(o.created_at).getTime() >= cutoff)
    }
    return list
  }, [orders, timeFilter])

  const byStatus = useMemo(() => {
    const map: Record<string, LiveOrder[]> = {}
    filtered.forEach(o => {
      const k = o.status as string
      if (!map[k]) map[k] = []
      // sort by overdue first, then age
      map[k].push(o)
    })
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })
    return map
  }, [filtered])

  const totalActive = (byStatus['new']?.length ?? 0) + (byStatus['preparing']?.length ?? 0)
  const visibleCols = hideReady ? columns.filter(c => c !== 'ready') : columns

  return (
    <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
      <audio ref={audioRef} src="/chime.mp3" preload="none" />

      {/* Header */}
      <header className="flex-none flex items-center justify-between bg-white border-b border-stone-200 px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-stone-900 tracking-tight">🍳 Kitchen Display</span>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Live</span>
          </div>
          {totalActive > 0 && (
            <span className="rounded-full bg-red-100 border border-red-300 text-red-600 px-2.5 py-0.5 text-[10px] font-black">
              {totalActive} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Time filter pills */}
          {TIME_FILTERS.map(f => (
            <Pill key={String(f.value)} active={timeFilter === f.value} onClick={() => setTimeFilter(f.value)}>
              {f.label}
            </Pill>
          ))}
          <Pill active={hideReady} onClick={() => setHideReady(p => !p)}>Hide Ready</Pill>

          {role === 'admin' && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="ml-2 flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-[10px] font-black text-white uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 transition-all"
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <button onClick={fetchOrders} className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors" title="Refresh">
            <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* New order alert */}
      {newAlert && (
        <div className="flex-none flex items-center justify-center gap-2 bg-amber-500 py-2.5 text-[11px] font-black uppercase tracking-widest text-white animate-pulse">
          🔔 New order just arrived!
        </div>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full px-5 py-4 w-max">
          {visibleCols.map(status => (
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black shadow-xl ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </div>
  )
}
