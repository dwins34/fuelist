'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence } from 'framer-motion'
import OrderCard from './OrderCard'
import FilterPanel, { KDSFilters } from './FilterPanel'

interface StaffInfo { id: string; name: string }
interface KDSOrder {
  id: string
  items: { item: { id: string; name: string; price: number; image_url?: string }; quantity: number }[]
  total_amount: number
  order_status: string
  estimated_prep_time: number
  priority_score: number
  assigned_staff_id: string | null
  assigned_at: string | null
  created_at: string
  address?: { name?: string } | null
  staff?: StaffInfo | null
}

const STATUS_COLS = [
  { key: 'new',             label: 'New Orders',    accent: 'amber' },
  { key: 'preparing',       label: 'Preparing',     accent: 'blue' },
  { key: 'ready',           label: 'Ready to Go',   accent: 'emerald' },
]

const ACCENT_CLASSES: Record<string, { bar: string; count: string }> = {
  amber:   { bar: 'bg-amber-500',   count: 'text-amber-400' },
  blue:    { bar: 'bg-blue-500',    count: 'text-blue-400' },
  emerald: { bar: 'bg-emerald-500', count: 'text-emerald-400' },
}

let audioCtx: AudioContext | null = null
function playBeep() {
  try {
    audioCtx ??= new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.4)
  } catch {}
}

export default function KitchenDashboard() {
  const [orders, setOrders]     = useState<KDSOrder[]>([])
  const [staff, setStaff]       = useState<StaffInfo[]>([])
  const [newIds, setNewIds]     = useState<Set<string>>(new Set())
  const [loading, setLoading]   = useState(true)
  const [filters, setFilters]   = useState<KDSFilters>({ status: [], minutes: null, unassigned: false })
  const supabase = useMemo(() => createClient(), [])
  const knownIds = useRef<Set<string>>(new Set())

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.status.length) params.set('status', filters.status.join(','))
    if (filters.minutes)       params.set('minutes', String(filters.minutes))
    if (filters.unassigned)    params.set('unassigned', 'true')

    const res = await fetch(`/api/kitchen/orders?${params}`)
    if (!res.ok) return
    const data: KDSOrder[] = await res.json()
    data.forEach(o => knownIds.current.add(o.id))
    setOrders(data)
    setLoading(false)
  }, [filters])

  const fetchStaff = useCallback(async () => {
    const res = await fetch('/api/kitchen/staff')
    if (res.ok) setStaff(await res.json())
  }, [])

  useEffect(() => { fetchOrders(); fetchStaff() }, [fetchOrders, fetchStaff])

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('kds-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const order = payload.new as KDSOrder
        if (knownIds.current.has(order.id)) return
        knownIds.current.add(order.id)
        setOrders(prev => [order, ...prev])
        setNewIds(prev => new Set(prev).add(order.id))
        playBeep()
        setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(order.id); return n }), 3000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as KDSOrder
        setOrders(prev => {
          // Remove if done
          if (['delivered', 'cancelled', 'refunded'].includes(updated.order_status)) {
            knownIds.current.delete(updated.id)
            return prev.filter(o => o.id !== updated.id)
          }
          return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/kitchen/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function handleAssign(id: string, staffId: string | null) {
    await fetch(`/api/kitchen/orders/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId }),
    })
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...orders]
    if (filters.status.length) list = list.filter(o => filters.status.includes(o.order_status))
    if (filters.minutes) {
      const cutoff = Date.now() - filters.minutes * 60 * 1000
      list = list.filter(o => new Date(o.created_at).getTime() >= cutoff)
    }
    if (filters.unassigned) list = list.filter(o => !o.assigned_staff_id)
    return list
  }, [orders, filters])

  const byStatus = useMemo(() =>
    STATUS_COLS.reduce<Record<string, KDSOrder[]>>((acc, col) => {
      acc[col.key] = filtered
        .filter(o => o.order_status === col.key)
        .sort((a, b) => b.priority_score - a.priority_score)
      return acc
    }, {}),
  [filtered])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center justify-between px-5 py-3 bg-stone-950 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-white tracking-tight">🍳 Kitchen Display</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-widest">
          <span>Swipe → advance · Swipe ← revert</span>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} onChange={setFilters} totalActive={orders.length} />

      {/* Kanban columns */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-stone-800 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-x divide-stone-800">
          {STATUS_COLS.map(col => {
            const colOrders = byStatus[col.key] ?? []
            const ac = ACCENT_CLASSES[col.accent]
            return (
              <div key={col.key} className="flex flex-col overflow-hidden">
                {/* Column header */}
                <div className="flex-none flex items-center justify-between px-4 py-3 bg-stone-950 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${ac.bar}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-stone-300">
                      {col.label}
                    </span>
                  </div>
                  <span className={`text-lg font-black tabular-nums ${ac.count}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-stone-700">
                      <span className="text-3xl mb-2">✓</span>
                      <span className="text-[11px] font-black uppercase tracking-widest">Clear</span>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {colOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          staffList={staff}
                          onStatusChange={handleStatusChange}
                          onAssign={handleAssign}
                          isNew={newIds.has(order.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
