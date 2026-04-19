'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/lib/icons'

interface DeliveryLog {
  id: string
  order_id: string | null
  subscription_id: string | null
  user_id: string | null
  delivery_date: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  status: string
  items: any[]
  total_amount: number
  address: any
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:             { label: 'New',              color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
  preparing:       { label: 'Preparing',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'     },
  ready:           { label: 'Ready',            color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200'     },
  out_for_delivery:{ label: 'Out for Delivery', color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200' },
  delivered:       { label: 'Delivered',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200'},
  cancelled:       { label: 'Cancelled',        color: 'text-stone-500',   bg: 'bg-stone-100 border-stone-200'  },
}

const SLOT_LABEL: Record<string, string> = {
  morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌙 Evening',
}

function itemsSummary(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return '—'
  return items.slice(0, 2).map(e => {
    const item = e?.item?.item ?? e?.item ?? e
    const qty  = e?.quantity ?? e?.item?.quantity ?? 1
    return `${item?.name ?? '?'} ×${qty}`
  }).join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata',
  }).toUpperCase()
}

export default function DeliveriesPage() {
  const [logs,       setLogs]       = useState<DeliveryLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [date,       setDate]       = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }))
  const [statusFilter, setStatusFilter] = useState('all')
  const [slotFilter,   setSlotFilter]   = useState('all')
  const [search,     setSearch]     = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    const res = await fetch(`/api/admin/deliveries?${params}`)
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [date])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (slotFilter   !== 'all' && l.delivery_slot !== slotFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const addr = l.address
      const name = addr?.name?.toLowerCase() ?? ''
      const phone = addr?.phone ?? ''
      const id = l.order_id?.slice(0, 8) ?? ''
      if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false
    }
    return true
  })

  const byStatus = (s: string) => logs.filter(l => l.status === s).length
  const total    = logs.length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tighter">Delivery Logs</h1>
          <p className="text-xs font-medium text-stone-400 mt-0.5">All deliveries for a given date — one-time orders and subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 outline-none focus:border-amber-400 transition-colors"
          />
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 text-amber-400 text-xs font-black hover:bg-stone-800 transition-colors"
          >
            <Icon name="spinner" size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',        value: total,                   color: 'text-stone-900' },
          { label: 'New',          value: byStatus('new'),         color: 'text-amber-600' },
          { label: 'Preparing',    value: byStatus('preparing'),   color: 'text-blue-600'  },
          { label: 'Out',          value: byStatus('out_for_delivery'), color: 'text-purple-600' },
          { label: 'Delivered',    value: byStatus('delivered'),   color: 'text-emerald-600'},
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-stone-100 bg-white px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{s.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Icon name="search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, order ID…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-700 placeholder-stone-300 outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 outline-none focus:border-amber-400 transition-colors"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={slotFilter}
          onChange={e => setSlotFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 outline-none focus:border-amber-400 transition-colors"
        >
          <option value="all">All Slots</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-stone-400 text-sm">
          <div className="h-4 w-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          Loading deliveries…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-sm font-black text-stone-500">No deliveries found</p>
          <p className="text-xs text-stone-400 mt-1">Try changing the date or filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Order / Sub', 'Customer', 'Slot', 'Items', 'Amount', 'Status', 'Updated'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.new
                  return (
                    <tr key={log.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      {/* ID */}
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-black font-mono text-stone-500">
                          #{(log.order_id ?? log.subscription_id ?? log.id).slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[9px] font-bold text-stone-300 mt-0.5">
                          {log.subscription_id ? 'Subscription' : 'One-time'}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-black text-stone-800 truncate max-w-[120px]">
                          {log.address?.name || '—'}
                        </p>
                        <p className="text-[10px] font-medium text-stone-400 truncate">
                          {log.address?.phone || '—'}
                        </p>
                      </td>

                      {/* Slot */}
                      <td className="px-4 py-3 text-[11px] font-bold text-stone-600 whitespace-nowrap">
                        {SLOT_LABEL[log.delivery_slot] ?? log.delivery_slot}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3 text-[11px] font-medium text-stone-600 max-w-[180px] truncate">
                        {itemsSummary(log.items)}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-sm font-black text-stone-900 whitespace-nowrap">
                        ₹{new Intl.NumberFormat('en-IN').format(log.total_amount)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap',
                          cfg.bg, cfg.color
                        )}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 text-[10px] font-medium text-stone-400 whitespace-nowrap">
                        {fmtDate(log.updated_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
