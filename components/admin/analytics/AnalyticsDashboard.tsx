'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import MetricsCards from './MetricsCards'
import RevenueChart  from './RevenueChart'
import OrderTypePie  from './OrderTypePie'
import TopItemsChart from './TopItemsChart'
import OrdersTable   from './OrdersTable'

// ── Date range presets ────────────────────────────────────────────────────────
function toIST(d: Date): string {
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 10)
}

function getPreset(id: string): { from: string; to: string } {
  const now = new Date()
  const to  = toIST(now)
  switch (id) {
    case 'today':     return { from: to, to }
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      const yd = toIST(y); return { from: yd, to: yd }
    }
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 6)
      return { from: toIST(d), to }
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 29)
      return { from: toIST(d), to }
    }
    default: return { from: to, to }
  }
}

const PRESETS = [
  { id: 'today',     label: 'Today'     },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d',        label: 'Last 7 days' },
  { id: '30d',       label: 'Last 30 days' },
  { id: 'custom',    label: 'Custom' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  metrics: {
    totalOrders: number; totalRevenue: number; aov: number; totalItemsSold: number
    normalOrders: number; subOrders: number; normalRevenue: number; subRevenue: number
    totalRefunds: number; totalRefunded: number
  }
  dailyRevenue: { day: string; normal: number; subscription: number; total: number }[]
  topItems: { name: string; category: string; qty: number; revenue: number }[]
  refunds: any[]
  recentOrders: { data: any[]; total: number; page: number; totalPages: number }
}

export default function AnalyticsDashboard() {
  const [preset,      setPreset]      = useState('7d')
  const [from,        setFrom]        = useState(() => getPreset('7d').from)
  const [to,          setTo]          = useState(() => getPreset('7d').to)
  const [data,        setData]        = useState<AnalyticsData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)
  const [liveCount,   setLiveCount]   = useState(0) // realtime new-order counter
  const supabase = createClient()
  const fetchRef = useRef<AbortController | null>(null)

  // ── Fetch analytics data ───────────────────────────────────────────────────
  const fetchData = useCallback(async (fromDate: string, toDate: string, pg = 1) => {
    fetchRef.current?.abort()
    const ctrl = new AbortController()
    fetchRef.current = ctrl

    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/analytics?from=${fromDate}&to=${toDate}&page=${pg}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setData(json)
      setLiveCount(0)
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Analytics fetch error:', err)
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(from, to, page)
  }, [from, to, page, fetchData])

  // ── Supabase Realtime — auto-refresh with debounce ────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function scheduleRefresh() {
      setLiveCount(n => n + 1)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchData(from, to, page)
      }, 1500)
    }

    const channel = supabase
      .channel('admin-analytics-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders'  }, scheduleRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders'  }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'refunds' }, scheduleRefresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [from, to, page, fetchData, supabase])

  function handlePreset(id: string) {
    setPreset(id)
    if (id !== 'custom') {
      const range = getPreset(id)
      setFrom(range.from)
      setTo(range.to)
      setPage(1)
    }
  }

  function handlePage(p: number) {
    setPage(p)
  }

  const m = data?.metrics

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tighter">Analytics</h1>
          <p className="text-xs font-medium text-stone-400 mt-0.5">Orders, revenue and inventory insights</p>
        </div>

        {/* Live update badge */}
        {liveCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-black text-amber-700 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            {liveCount} new update{liveCount > 1 ? 's' : ''} — refreshing…
          </div>
        )}
      </div>

      {/* ── Date range selector ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-xl border border-stone-200 overflow-hidden">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className={cn(
                'px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all',
                preset === p.id
                  ? 'bg-stone-900 text-amber-400'
                  : 'bg-white text-stone-500 hover:bg-stone-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 outline-none focus:border-amber-400"
            />
            <span className="text-xs text-stone-400 font-bold">to</span>
            <input
              type="date"
              value={to}
              min={from}
              max={toIST(new Date())}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 outline-none focus:border-amber-400"
            />
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400">
            <span className="h-3 w-3 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {/* ── Metrics cards ── */}
      {m && <MetricsCards metrics={m} />}

      {/* ── Charts row ── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart — spans 2 cols */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Revenue over time</p>
            <RevenueChart data={data.dailyRevenue} />
          </div>

          {/* Order type pie */}
          <div className="rounded-2xl border border-stone-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Order type split</p>
            <OrderTypePie
              normalOrders={m!.normalOrders}
              subOrders={m!.subOrders}
              normalRevenue={m!.normalRevenue}
              subRevenue={m!.subRevenue}
            />
          </div>
        </div>
      )}

      {/* ── Top items + refunds row ── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top items chart */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Top items by quantity</p>
            <TopItemsChart items={data.topItems} />
          </div>

          {/* Refunds panel */}
          <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Refunds</p>

            <div className="space-y-1">
              <p className="text-2xl font-black text-rose-600">
                ₹{new Intl.NumberFormat('en-IN').format(m!.totalRefunded)}
              </p>
              <p className="text-[11px] font-medium text-stone-400">{m!.totalRefunds} refunds processed</p>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
              {data.refunds.length === 0 && (
                <p className="text-[11px] text-stone-400 text-center py-4">No refunds in this period</p>
              )}
              {data.refunds.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-black text-stone-500 font-mono">#{(r.order_id ?? r.subscription_id ?? '').slice(0, 8)}</p>
                    <p className="text-[10px] text-stone-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-600">-₹{new Intl.NumberFormat('en-IN').format(r.amount)}</p>
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                      r.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'failed'    ? 'bg-rose-100 text-rose-700' :
                                                 'bg-amber-100 text-amber-700'
                    )}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Orders table ── */}
      {data && (
        <div className="rounded-2xl border border-stone-100 bg-white p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Recent orders</p>
          <OrdersTable
            orders={data.recentOrders.data}
            total={data.recentOrders.total}
            page={data.recentOrders.page}
            totalPages={data.recentOrders.totalPages}
            onPage={handlePage}
          />
        </div>
      )}

      {!data && !loading && (
        <div className="flex items-center justify-center py-20 text-sm font-medium text-stone-400">
          <Icon name="error" size={16} className="mr-2" />
          Failed to load analytics
        </div>
      )}
    </div>
  )
}
