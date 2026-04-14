'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthContext } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { CartItem, MenuItem, OrderStatus } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

const STATUS_STEPS: { key: OrderStatus; label: string; icon: IconName }[] = [
  { key: 'new',             label: 'Received',    icon: 'received' },
  { key: 'preparing',       label: 'Preparing',   icon: 'preparing' },
  { key: 'ready',           label: 'Packed',      icon: 'package' },
  { key: 'out_for_delivery',label: 'Shipping',    icon: 'shipping' },
  { key: 'delivered',       label: 'Delivered',   icon: 'success' },
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
    <div className="px-6 pb-6 pt-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
            Live Order Status
          </span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">
          {STATUS_STEPS[currentIdx]?.label}
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="relative flex items-center justify-between px-2">
        {/* Background line */}
        <div className="absolute left-6 right-6 top-5 h-1 bg-stone-100 rounded-full" />
        
        {/* Filled line */}
        <motion.div
           initial={{ width: 0 }}
           animate={{ width: `${(currentIdx / (STATUS_ORDER.length - 1)) * 100}%` }}
           className="absolute left-6 top-5 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-sm shadow-amber-200"
        />

        {STATUS_STEPS.map((step, i) => {
          const isDone    = i <= currentIdx
          const isCurrent = i === currentIdx
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2.5">
              <div 
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border-4 transition-all duration-500",
                  isDone 
                    ? "bg-amber-500 border-white text-white shadow-md shadow-amber-200 scale-110" 
                    : "bg-white border-stone-50 text-stone-200"
                )}
              >
                <Icon name={step.icon} size={18} strokeWidth={isDone ? 3 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter text-center leading-tight max-w-[60px]",
                isDone ? "text-amber-700" : "text-stone-300"
              )}>
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
  const date     = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time     = new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const shortId  = `#${order.id.slice(-8).toUpperCase()}`
  const active   = isActive(order.order_status)
  const delivered = order.order_status === 'delivered'

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-500",
        active ? "border-amber-500 ring-4 ring-amber-500/5 shadow-premium" : ""
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b",
        active ? "bg-amber-50/20 border-amber-100" : "bg-stone-50/50 border-stone-50"
      )}>
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-stone-900 shadow-sm border border-stone-100">
             <Icon name="package" size={20} />
           </div>
           <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">{shortId}</p>
            <p className="text-xs font-bold text-stone-500 mt-1">{date} · {time}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-lg font-black text-stone-900 tracking-tighter">{formatPrice(order.total_amount)}</span>
          {active && (
            <Button size="sm" href={`/orders/${order.id}`} className="px-5 shadow-premium">
              Track Status
            </Button>
          )}
          {delivered && (
            <Badge variant="success" className="px-3">
              <Icon name="success" size={12} strokeWidth={3} />
              Delivered
            </Badge>
          )}
        </div>
      </div>

      {active && <LiveTracker status={order.order_status} />}

      {/* Items Section */}
      <div className="px-6 py-5 space-y-4">
        {(active ? order.items : order.items.slice(0, 2)).map(({ item, quantity }: { item: MenuItem; quantity: number }, idx) => (
          <div key={`${item.id}-${idx}`} className="flex items-center gap-4 group">
            <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-stone-50">
              {item.image_url
                ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform" />
                : <div className="flex h-full items-center justify-center text-stone-200"><Icon name="bowl" size={24} /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-stone-900 truncate leading-tight">{item.name}</p>
              <p className="text-xs font-bold text-stone-400 mt-1 uppercase tracking-tight">
                {quantity} qty · {formatPrice(item.price)} each
              </p>
            </div>
            <span className="text-sm font-black text-stone-900 tracking-tight shrink-0">
              {formatPrice(item.price * quantity)}
            </span>
          </div>
        ))}
        {!active && order.items.length > 2 && (
          <div className="flex items-center gap-2 pl-1 pt-1">
             <div className="h-1 w-1 rounded-full bg-stone-200" />
             <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">
               +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
             </p>
          </div>
        )}
      </div>

      {/* Delivery Detail + Footer Actions */}
      <div className="px-6 pb-6 space-y-4">
        {order.address && (
          <div className="rounded-2xl bg-stone-50/50 border border-stone-100 px-4 py-3 flex items-center gap-3">
            <Icon name="location" size={16} className="text-amber-500" />
            <p className="text-xs font-bold text-stone-500 truncate">
               {order.address.address_line1}, {order.address.city}
               {order.address.pincode ? ` — ${order.address.pincode}` : ''}
            </p>
          </div>
        )}

        {delivered && (
          <Button
            onClick={() => onReorder(order.items)}
            variant="outline"
            className="w-full font-black uppercase tracking-widest text-[10px] gap-2"
          >
            <Icon name="subscriptions" size={14} strokeWidth={3} className="opacity-70" />
            Reorder Now
          </Button>
        )}
        
        {active && (
           <Link
            href={`/orders/${order.id}`}
            className="block text-center text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 hover:text-amber-600 transition-colors py-2"
          >
            View Full Tracking Details
          </Link>
        )}
      </div>
    </Card>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-[2.5rem] bg-stone-50 border-2 border-stone-50 h-64 shadow-none" />
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

  useEffect(() => {
    if (!authLoading && !profile) router.push('/login')
  }, [authLoading, profile, router])

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-6 py-12 space-y-12"
    >
      <div className="flex border-b border-stone-100 pb-10">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tighter">My Orders</h1>
          <p className="text-sm font-medium text-stone-400 mt-2">Track your healthy bowls from farm to fork.</p>
        </div>
      </div>

      {loading || authLoading ? (
        <Skeleton />
      ) : orders.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[3rem] bg-stone-50/30 border-2 border-dashed border-stone-100 py-20 text-center"
        >
          <div className="mx-auto w-24 h-24 bg-stone-100 rounded-[2rem] flex items-center justify-center text-stone-200 mb-8 shadow-inner">
            <Icon name="bowl" size={48} />
          </div>
          <h3 className="text-2xl font-black text-stone-900 tracking-tight">Time for your first bowl?</h3>
          <p className="text-sm font-medium text-stone-400 mt-3 max-w-xs mx-auto leading-relaxed">
            Choose from our premium menu and start your wellness journey today.
          </p>
          <Button href="/menu" size="lg" className="mt-10 shadow-premium">
            Explore Premium Menu
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-12">
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.3em] ml-2">
                Active Deliveries • {activeOrders.length}
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {activeOrders.map((o) => (
                  <OrderCard key={o.id} order={o} onReorder={handleReorder} />
                ))}
              </div>
            </div>
          )}

          {/* Past orders */}
          {completedOrders.length > 0 && (
            <div className="space-y-6">
               <h2 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em] ml-2">
                Order History
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {completedOrders.map((o) => (
                  <OrderCard key={o.id} order={o} onReorder={handleReorder} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="fixed bottom-10 left-1/2 z-50 flex items-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-sm font-black text-white shadow-premium"
          >
            <Icon name="success" size={18} strokeWidth={3} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
