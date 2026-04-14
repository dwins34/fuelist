'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  payment_status: string
  order_status:   OrderStatus
  payment_id:     string | null
  address:        DeliveryAddress | null
  created_at:     string
}

// ─── Status steps ─────────────────────────────────────────────────────────────

const STEPS: { key: OrderStatus; label: string; sublabel: string; icon: IconName }[] = [
  { key: 'new',             label: 'Received',   sublabel: 'We got your order!',               icon: 'received' },
  { key: 'preparing',       label: 'Preparing',  sublabel: 'Kitchen is crafting your bowls.',    icon: 'preparing' },
  { key: 'ready',           label: 'Packed',     sublabel: 'Your order is ready to go.',      icon: 'package' },
  { key: 'out_for_delivery',label: 'Shipping',   sublabel: 'A courier is on the way!',        icon: 'shipping' },
  { key: 'delivered',       label: 'Delivered',  sublabel: 'Enjoy your nutritious meal!',       icon: 'success' },
]

const STATUS_ORDER: OrderStatus[] = ['new', 'preparing', 'ready', 'out_for_delivery', 'delivered']

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-lg px-6 py-12 space-y-8 animate-pulse">
      <div className="h-6 w-32 bg-stone-100 rounded-full" />
      <div className="rounded-[3rem] bg-stone-50 h-48" />
      <div className="rounded-[2.5rem] bg-stone-50 h-96" />
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

  useEffect(() => {
    if (!authLoading && !profile) router.push('/login')
  }, [authLoading, profile, router])

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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center text-stone-200 shadow-inner">
           <Icon name="error" size={40} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Oops!</h1>
          <p className="text-sm font-medium text-stone-400 mt-2">{error ?? 'Order not found.'}</p>
        </div>
        <Button href="/orders" variant="outline" className="px-8">Back to Orders</Button>
      </div>
    )
  }

  const currentIdx  = STATUS_ORDER.indexOf(order.order_status)
  const currentStep = STEPS.find((s) => s.key === order.order_status)
  const isDelivered = order.order_status === 'delivered'
  const shortId     = `#${order.id.slice(-8).toUpperCase()}`
  const date        = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time        = new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl px-6 py-12 space-y-10"
    >
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link href="/orders" className="group flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 hover:text-amber-600 transition-all">
          <Icon name="close" size={14} className="rotate-90" />
          Back to Orders
        </Link>
        <Badge variant="premium" className="bg-stone-50 text-stone-400 border-stone-100">
           {date}
        </Badge>
      </div>

      {/* Primary Status Card */}
      <div className={cn(
        "rounded-[3rem] p-10 text-center space-y-4 relative overflow-hidden transition-colors duration-700 border-2",
        isDelivered ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/20 border-amber-100"
      )}>
        <motion.div 
          key={order.order_status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "mx-auto w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-lg transition-colors duration-500",
            isDelivered ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-amber-500 text-white shadow-amber-200"
          )}
        >
          <Icon name={currentStep?.icon ?? 'package'} size={48} strokeWidth={2.5} />
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-stone-900 tracking-tighter">{currentStep?.label}</h1>
          <p className="text-sm font-medium text-stone-500 max-w-xs mx-auto">{currentStep?.sublabel}</p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-stone-300">{shortId} • {time}</p>
          {!isDelivered && (
             <Badge variant="success" className="bg-white/80 backdrop-blur-sm border-none shadow-sm py-1">
               <span className="relative flex h-1.5 w-1.5 mr-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
               </span>
               Live Updates Active
             </Badge>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <Card className="rounded-[2.5rem] p-4 sm:p-10">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-300 mb-10 px-2">Delivery Progress</h2>

        <div className="relative flex items-start justify-between mb-12 px-2">
          <div className="absolute left-10 right-10 top-6 h-1 bg-stone-50 rounded-full" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 40px + ${currentIdx === STEPS.length - 1 ? '40px' : '0px'})` }}
            className="absolute left-10 top-6 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-sm shadow-amber-200 transition-all duration-1000"
          />

          {STEPS.map((step, i) => {
            const isDone    = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-3 w-20">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[1.25rem] border-4 transition-all duration-700",
                  isDone 
                    ? "bg-amber-500 border-white text-white shadow-lg shadow-amber-200 scale-110" 
                    : "bg-white border-stone-50 text-stone-100"
                )}>
                   {isDone ? <Icon name={step.icon} size={20} strokeWidth={3} /> : <div className="h-1.5 w-1.5 rounded-full bg-stone-100" />}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tighter text-center leading-tight transition-colors duration-500",
                  isDone ? "text-amber-700" : "text-stone-300"
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Detailed Timeline List */}
        <div className="space-y-4 border-t border-stone-50 pt-8">
          <AnimatePresence mode="popLayout">
            {STEPS.map((step, i) => {
              const isDone    = i <= currentIdx
              const isCurrent = i === currentIdx
              if (!isDone && !isCurrent) return null
              return (
                <motion.div 
                  layout
                  key={step.key} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-5 rounded-3xl p-5 border transition-all duration-500",
                    isCurrent ? "bg-amber-50/20 border-amber-100 shadow-sm" : "bg-stone-50/50 border-stone-50 opacity-60"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
                    isCurrent ? "bg-amber-500" : "bg-stone-200"
                  )}>
                    {isCurrent ? <Icon name={step.icon} size={20} strokeWidth={2.5} /> : <Icon name="success" size={16} strokeWidth={4} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-black text-stone-900 tracking-tight">{step.label}</p>
                      {isCurrent && !isDelivered && (
                        <div className="flex items-center gap-1.5">
                           <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">In Progress</span>
                        </div>
                      )}
                    </div>
                    {isCurrent && <p className="text-[11px] font-medium text-stone-400 mt-1 leading-relaxed">{step.sublabel}</p>}
                  </div>
                </motion.div>
              )
            }).reverse()}
          </AnimatePresence>
        </div>
      </Card>

      {/* Order Items & Address Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary */}
        <Card className="p-8">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-6">Order Items</h3>
           <div className="space-y-5">
              {order.items.map(({ item, quantity }: { item: MenuItem; quantity: number }, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-4 group">
                  <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-stone-50 shadow-inner">
                    {item.image_url
                      ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform" />
                      : <div className="flex h-full items-center justify-center text-stone-200"><Icon name="bowl" size={24} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-stone-900 truncate tracking-tight">{item.name}</p>
                    <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-tight">{quantity} Bowl{quantity > 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-black text-stone-900 tracking-tighter shrink-0">{formatPrice(item.price * quantity)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-stone-100 pt-5">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-300">Total Charged</span>
                <span className="text-xl font-black text-stone-900 tracking-tighter">{formatPrice(order.total_amount)}</span>
              </div>
           </div>
        </Card>

        {/* Address */}
        {order.address && (
          <Card className="p-8 bg-stone-50/50">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-6">Delivery Address</h3>
             <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-stone-100">
                     <Icon name="user" size={18} />
                   </div>
                   <div>
                     <p className="text-sm font-black text-stone-900 tracking-tight leading-none">{order.address.name}</p>
                     <p className="text-[10px] font-bold text-stone-400 mt-1.5 uppercase tracking-widest">{order.address.phone}</p>
                   </div>
                </div>
                <div className="flex items-start gap-3 mt-2">
                   <Icon name="location" size={18} className="text-stone-300 mt-1 shrink-0" />
                   <div className="text-xs font-bold text-stone-500 leading-relaxed uppercase tracking-tight">
                    <p>{order.address.address_line1}, {order.address.address_line2}</p>
                    <p>{order.address.city}, {order.address.state} — {order.address.pincode}</p>
                    {order.address.landmark && <p className="text-amber-600 mt-1">Landmark: {order.address.landmark}</p>}
                   </div>
                </div>
             </div>
          </Card>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-stone-100">
        <Button href="/orders" variant="secondary" className="flex-1 !rounded-3xl py-7 font-black tracking-widest uppercase text-[11px]">
           All Order History
        </Button>
        <Button onClick={handleReorder} size="lg" className="flex-[2] !rounded-3xl py-7 shadow-premium font-black tracking-widest uppercase text-xs gap-3">
          <Icon name="subscriptions" size={18} strokeWidth={3} />
          Reorder This Meal
        </Button>
      </div>

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
