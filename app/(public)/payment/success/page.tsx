'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { CartItem } from '@/types'
import { DeliveryAddress } from '@/lib/whatsapp'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'

interface StoredOrder {
  order_id:           string
  items:              CartItem[]
  total_amount:       number
  delivery_fee:       number
  discount_amount:    number
  reward_points_used: number
  estimated_prep_time: number | null
  address:            DeliveryAddress
}

const STEPS: {
  label: string
  sub: string
  icon: IconName
  state: 'done' | 'active' | 'pending'
}[] = [
  { label: 'Order Placed',       sub: 'We received your request',     icon: 'checkCircle', state: 'done'    },
  { label: 'Payment Verified',   sub: 'Amount successfully captured', icon: 'security',    state: 'done'    },
  { label: 'Kitchen Processing', sub: 'Your meal is being prepared',  icon: 'preparing',   state: 'active'  },
  { label: 'Out for Delivery',   sub: 'Rider assigned, on the way',   icon: 'shipping',    state: 'pending' },
  { label: 'Delivered',          sub: 'Enjoy your fuel!',             icon: 'received',    state: 'pending' },
]

type Tab = 0 | 1   // 0 = Live Status, 1 = Order Details

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId  = searchParams.get('order_id')
  const { accessToken } = useAuthContext()
  const [order, setOrder]   = useState<StoredOrder | null>(null)
  const [tab, setTab]       = useState<Tab>(0)
  const [dragDir, setDragDir] = useState<1 | -1>(1)
  const prevTab = useRef<Tab>(0)

  useEffect(() => {
    if (!orderId || !accessToken) return
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return
    fetch(
      `${sbUrl}/rest/v1/orders?id=eq.${orderId}&select=id,items,total_amount,delivery_fee,discount_amount,reward_points_used,estimated_prep_time,address&limit=1`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` } }
    )
      .then(r => r.json())
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          const data = rows[0]
          setOrder({
            order_id:           data.id,
            items:              data.items ?? [],
            total_amount:       data.total_amount,
            delivery_fee:       data.delivery_fee ?? 0,
            discount_amount:    data.discount_amount ?? 0,
            reward_points_used:  data.reward_points_used ?? 0,
            estimated_prep_time: data.estimated_prep_time ?? null,
            address:             data.address ?? {},
          })
        }
      })
      .catch(() => {})
  }, [orderId, accessToken])

  const shortId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''

  function switchTab(next: Tab) {
    setDragDir(next > prevTab.current ? 1 : -1)
    prevTab.current = next
    setTab(next)
  }

  const TABS = ['Live Status', 'Order Details']

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center p-4 bg-stone-50/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-100 flex flex-col overflow-hidden"
        style={{ height: 'min(calc(100vh - 120px), 680px)' }}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex-none text-center px-6 pt-6 pb-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-50/80 to-transparent pointer-events-none" />

          {/* Icon */}
          <div className="relative z-10 inline-flex mb-3">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 300, delay: 0.1 }}
              className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-200/70"
            >
              <Icon name="success" size={28} strokeWidth={2.5} className="text-white" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-[1.2rem] bg-amber-400 pointer-events-none"
            />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 text-xl font-black text-stone-900 tracking-tighter"
          >
            Order Confirmed!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 text-[11px] font-medium text-stone-400 mt-0.5"
          >
            Kitchen is now preparing your meal
          </motion.p>

          {/* Badges row */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 mt-3 flex items-center justify-center gap-2 flex-wrap"
          >
            {shortId && (
              <Badge variant="premium" className="px-3 py-0.5 text-[9px] tracking-[0.2em]">
                {shortId}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
              <Icon name="time" size={10} className="text-amber-500" />
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider">
                {order?.estimated_prep_time ? `~${order.estimated_prep_time} min` : '35–50 min'}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ── Pill Tabs ───────────────────────────────────────── */}
        <div className="flex-none px-5 pb-3">
          <div className="flex gap-1.5 p-1 rounded-xl bg-stone-100">
            {TABS.map((label, i) => (
              <button
                key={label}
                onClick={() => switchTab(i as Tab)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200',
                  tab === i
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-400 hover:text-stone-600'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sliding Tab Content ─────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ x: dragDir * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dragDir * -40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0 overflow-y-auto px-5 py-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {/* ── TAB 0: Live Status ── */}
              {tab === 0 && (
                <div className="space-y-0 py-2">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="flex gap-3">
                      {/* Icon + line */}
                      <div className="flex flex-col items-center" style={{ width: 36 }}>
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all',
                          step.state === 'done'    && 'bg-amber-500 text-white',
                          step.state === 'active'  && 'bg-stone-900 text-white ring-[3px] ring-stone-100',
                          step.state === 'pending' && 'bg-stone-100 text-stone-300',
                        )}>
                          <Icon name={step.icon} size={15} strokeWidth={2.5} />
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={cn(
                            'w-px flex-1 my-1',
                            step.state === 'done' ? 'bg-amber-200' : 'bg-stone-100'
                          )} />
                        )}
                      </div>

                      {/* Text */}
                      <div className={cn('pt-1.5 pb-4 flex-1', i === STEPS.length - 1 && 'pb-2')}>
                        <p className={cn(
                          'text-[11px] font-black uppercase tracking-wider leading-none',
                          step.state === 'done'    && 'text-amber-600',
                          step.state === 'active'  && 'text-stone-900',
                          step.state === 'pending' && 'text-stone-300',
                        )}>
                          {step.label}
                        </p>
                        <p className={cn(
                          'text-[10px] font-medium mt-0.5',
                          step.state === 'pending' ? 'text-stone-200' : 'text-stone-400'
                        )}>
                          {step.sub}
                        </p>
                        {step.state === 'active' && (
                          <span className="inline-flex items-center gap-1 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">In progress</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB 1: Order Details ── */}
              {tab === 1 && (
                <div className="py-2 space-y-3">
                  {order ? (
                    <>
                      {/* Items list */}
                      <div className="space-y-2.5">
                        {order.items.map(({ item, quantity }, idx) => (
                          <div key={(item as any).id ?? idx} className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-stone-50 border border-stone-100 overflow-hidden flex items-center justify-center">
                              {(item as any).image_url ? (
                                <Image
                                  src={getImageUrl((item as any).image_url)}
                                  alt={(item as any).name ?? ''}
                                  width={40} height={40}
                                  className="object-cover"
                                />
                              ) : (
                                <Icon name="bowl" size={16} className="text-stone-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-black text-stone-900 truncate leading-tight">
                                {(item as any).name ?? 'Item'}
                              </p>
                              <p className="text-[10px] text-stone-400 font-medium">
                                Qty: {quantity}
                              </p>
                            </div>
                            <span className="text-[12px] font-black text-amber-600 shrink-0">
                              {formatPrice((item as any).price * quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Address */}
                      {order.address?.address_line1 && (
                        <div className="flex gap-2.5 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                          <Icon name="location" size={13} className="text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-0.5">
                              Delivery Address
                            </p>
                            <p className="text-[11px] font-bold text-stone-700 leading-snug">
                              {order.address.address_line1}
                              {order.address.city ? `, ${order.address.city}` : ''}
                              {order.address.pincode ? ` – ${order.address.pincode}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Recipient */}
                      {order.address?.name && (
                        <div className="flex gap-2.5 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                          <Icon name="user" size={13} className="text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-0.5">
                              Recipient
                            </p>
                            <p className="text-[11px] font-bold text-stone-700">
                              {order.address.name}
                              {order.address.phone ? ` · ${order.address.phone}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Price breakdown */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        {order.delivery_fee > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-stone-400">Delivery fee</span>
                            <span className="text-[10px] font-bold text-stone-500">+{formatPrice(order.delivery_fee)}</span>
                          </div>
                        )}
                        {order.discount_amount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-emerald-600">Voucher</span>
                            <span className="text-[10px] font-bold text-emerald-600">−{formatPrice(order.discount_amount)}</span>
                          </div>
                        )}
                        {order.reward_points_used > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-amber-600">Reward points</span>
                            <span className="text-[10px] font-bold text-amber-600">−{formatPrice(order.reward_points_used)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Amount Paid</span>
                          <span className="text-base font-black text-stone-900">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-stone-300">
                      <div className="h-6 w-6 border-2 border-stone-200 border-t-amber-400 rounded-full animate-spin" />
                      <p className="text-xs font-bold text-center text-stone-300">
                        Loading order details…
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex-none px-5 pt-3 pb-5 border-t border-stone-100 space-y-2.5">
          {orderId && (
            <Link
              href={`/orders/${orderId}`}
              className="relative flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-amber-200/60 hover:shadow-amber-300/70 hover:from-amber-400 hover:to-amber-500 transition-all duration-200 overflow-hidden"
            >
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.25, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-2xl bg-white pointer-events-none"
              />
              <Icon name="shipping" size={14} strokeWidth={2.5} />
              Track My Order
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/orders"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-100 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <Icon name="received" size={12} />
              My Orders
            </Link>
            <Link
              href="/menu"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-100 text-[10px] font-black uppercase tracking-wider text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <Icon name="bowl" size={12} />
              Order Again
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="h-10 w-10 border-4 border-stone-100 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
