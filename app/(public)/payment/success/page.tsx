'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { CartItem } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'
import { Icon, IconName } from '@/lib/icons'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
interface StoredOrder {
  order_id: string
  items:    CartItem[]
  total:    number
  address:  DeliveryAddress
}

// ── Premium Success Indicator ─────────────────────────────────────────────────
function SuccessIndicator() {
  return (
    <div className="relative flex items-center justify-center py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex h-32 w-32 items-center justify-center rounded-[3rem] bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-200"
      >
        <Icon name="success" size={48} strokeWidth={3} className="text-white" />
      </motion.div>
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 m-auto h-48 w-48 rounded-full bg-amber-400 blur-3xl opacity-20" 
      />
    </div>
  )
}

// ── Order Timeline ────────────────────────────────────────────────────────────
const TIMELINE: { label: string; icon: IconName; done: boolean; active: boolean }[] = [
  { label: 'Transmission Logged', icon: 'success', done: true,  active: false },
  { label: 'Payment Authenticated', icon: 'security', done: true,  active: false },
  { label: 'Kitchen Deployment', icon: 'preparing', done: false, active: true  },
  { label: 'Logistics Transit', icon: 'shipping', done: false, active: false },
  { label: 'Fulfilment Complete', icon: 'received', done: false, active: false },
]

function OrderTimeline() {
  return (
    <div className="w-full space-y-6">
      {TIMELINE.map((step, i) => (
        <div key={step.label} className="flex items-center gap-6 group">
          <div className="flex flex-col items-center">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-500",
              step.done ? "bg-amber-500 text-white shadow-md shadow-amber-100" :
              step.active ? "bg-stone-900 text-white ring-4 ring-stone-100" :
              "bg-stone-50 text-stone-300"
            )}>
              <Icon name={step.icon} size={18} strokeWidth={3} />
            </div>
          </div>
          <div className="flex-1 border-b border-stone-50 pb-4">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em]",
              step.done ? "text-amber-600" : step.active ? "text-stone-900" : "text-stone-300"
            )}>
              {step.label}
            </p>
            {step.active && (
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1 animate-pulse">Processing at Station</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<StoredOrder | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fuelist_last_order')
      if (raw) {
        setOrder(JSON.parse(raw))
        sessionStorage.removeItem('fuelist_last_order')
      }
    } catch {}
  }, [])

  const shortId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:py-20 flex flex-col items-center gap-12">
      
      {/* ── Visual confirmation ── */}
      <div className="text-center space-y-6">
        <SuccessIndicator />
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-stone-900 tracking-tighter uppercase">Order Authenticated</h1>
          <div className="flex flex-col items-center gap-3">
             {shortId && <Badge variant="premium" className="px-6 py-1.5 text-xs tracking-[0.3em]">{shortId}</Badge>}
             <p className="text-stone-400 font-medium text-lg max-w-md mx-auto leading-relaxed">
               Your payment protocol has been successfully verified. Fuelist Kitchens are now preparing your nutrition system.
             </p>
          </div>
        </div>
        
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-stone-50 rounded-2xl border border-stone-100">
           <Icon name="time" size={16} className="text-amber-500" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-900">Est. Fulfilment: 35–50 MIN</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-8">
        {/* ── Tracking status ── */}
        <div className="rounded-[3rem] bg-white border border-stone-100 shadow-premium p-10 space-y-8">
          <h2 className="text-[11px] font-black text-stone-300 uppercase tracking-[0.3em]">Live Logistics Status</h2>
          <OrderTimeline />
        </div>

        {/* ── Summary Focus ── */}
        <div className="space-y-8">
           {order && (
             <div className="rounded-[3rem] bg-stone-900 p-10 text-white shadow-premium space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 blur-3xl rounded-full" />
                <h2 className="text-[11px] font-black text-stone-500 uppercase tracking-[0.3em] relative z-10">Consolidated Manifest</h2>
                <div className="space-y-6 relative z-10">
                   {order.items.map(({ item, quantity }) => (
                     <div key={item.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                              {item.image_url ? (
                                <Image src={getImageUrl(item.image_url)} alt={item.name} width={48} height={48} className="object-cover" />
                              ) : (
                                <Icon name="bowl" size={20} className="text-stone-500" />
                              )}
                           </div>
                           <div>
                              <p className="text-sm font-black tracking-tight">{item.name}</p>
                              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mt-0.5">{quantity} QUANTITY</p>
                           </div>
                        </div>
                        <span className="text-sm font-black text-amber-500 tracking-tighter">{formatPrice(item.price * quantity)}</span>
                     </div>
                   ))}
                </div>
                
                <div className="pt-8 border-t border-white/10 flex items-center justify-between relative z-10">
                   <span className="text-[11px] font-black text-stone-500 uppercase tracking-[0.3em]">Aggregate Total</span>
                   <span className="text-2xl font-black text-amber-500 tracking-tighter">{formatPrice(order.total)}</span>
                </div>
             </div>
           )}

           {/* ── Actions ── */}
           <div className="flex flex-col gap-4">
              {orderId && (
                <Button
                  href={`/orders/${orderId}`}
                  size="lg"
                  className="w-full"
                >
                  Track Your Order
                </Button>
              )}
              <div className="flex gap-4">
                <Link href="/orders" className="flex-1 py-4 text-center rounded-[1.5rem] bg-stone-50 text-[11px] font-black uppercase tracking-widest text-stone-900 border border-stone-100 hover:bg-stone-100 transition-colors">
                  Archived Logs
                </Link>
                <Link href="/menu" className="flex-1 py-4 text-center rounded-[1.5rem] bg-stone-50 text-[11px] font-black uppercase tracking-widest text-stone-900 border border-stone-100 hover:bg-stone-100 transition-colors">
                  New Order
                </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-12 w-12 border-4 border-stone-100 border-t-amber-500 rounded-full animate-spin shadow-inner" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
