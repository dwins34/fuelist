'use client'

import React from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface SubscriptionRow {
  id: string
  delivery_slot: string
  frequency: string
  duration_days: number
  start_date: string
  end_date: string
  status: string
  payment_status: string
  refund_amount: number
  price_per_delivery: number
  menu_items: { name: string; image_url: string } | Array<{ name: string; image_url: string }>
}

const SLOT_LABEL: Record<string, string> = {
  morning:   '8–10 AM',
  afternoon: '12–2 PM',
  evening:   '6–8 PM',
}

const FREQ_LABEL: Record<string, string> = {
  daily:    'Daily',
  weekdays: 'Mon–Fri',
  weekends: 'Sat–Sun',
}

const DURATION_DISCOUNT: Record<number, number> = { 7: 0, 14: 0.05, 30: 0.10 }

function countDeliveries(freq: string, startDate: string, duration: number): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + duration)
  let count = 0
  const cur = new Date(start)
  while (cur < end) {
    const d = cur.getDay()
    if (freq === 'daily') count++
    else if (freq === 'weekdays' && d >= 1 && d <= 5) count++
    else if (freq === 'weekends' && (d === 0 || d === 6)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function deliveriesDone(freq: string, startDate: string): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (now <= start) return 0
  return countDeliveries(freq, startDate, Math.ceil((now.getTime() - start.getTime()) / 86400000))
}

function progressPercent(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate).getTime()
  const now   = Date.now()
  if (now >= end) return 100
  if (now <= start) return 0
  return Math.round(((now - start) / (end - start)) * 100)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000))
}

interface SubscriptionsTabProps {
  subscriptions: SubscriptionRow[]
  loading: boolean
  actionId: string | null
  onAction: (id: string, status: 'cancelled') => void
  deliveryFee?: number
}

export default function SubscriptionsTab({ subscriptions, loading, actionId, onAction, deliveryFee = 0 }: SubscriptionsTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      <div className="border-b border-stone-100 pb-3">
        <h1 className="text-base sm:text-xl font-black text-stone-900 tracking-tighter">My Subscriptions</h1>
        <p className="text-[11px] font-medium text-stone-400 mt-0.5">Manage your recurring meal plans.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-stone-50 rounded-2xl animate-pulse border border-stone-100" />)}
        </div>
      ) : subscriptions.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-stone-50 border border-stone-100 py-10 text-center"
        >
          <div className="mx-auto w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-300 mb-3">
            <Icon name="calendar" size={24} />
          </div>
          <h3 className="text-sm font-black text-stone-900 tracking-tight">No active plans yet</h3>
          <p className="text-[11px] font-medium text-stone-400 mt-1">Start your first subscription today.</p>
          <Button href="/menu" variant="ghost" size="sm" className="mt-5">Explore Menu</Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {subscriptions.map((sub, idx) => {
              const items    = Array.isArray(sub.menu_items) ? sub.menu_items : [sub.menu_items]
              const isActive = sub.status === 'active'
              const total    = countDeliveries(sub.frequency, sub.start_date, sub.duration_days)
              const done     = deliveriesDone(sub.frequency, sub.start_date)
              const pending  = Math.max(0, total - done)
              const progress = progressPercent(sub.start_date, sub.end_date)
              const left     = daysLeft(sub.end_date)

              const discountRate   = DURATION_DISCOUNT[sub.duration_days] ?? 0
              const foodBase       = sub.price_per_delivery * total
              const discountAmt    = Math.floor(foodBase * discountRate)
              const deliveryCharge = deliveryFee * total
              const grandTotal     = foodBase - discountAmt + deliveryCharge

              return (
                <motion.div
                  layout key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.06 } }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <div className={cn(
                    "rounded-2xl border border-stone-100 bg-white overflow-hidden transition-all",
                    !isActive && "opacity-55 grayscale-[0.5]"
                  )}>

                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3">

                      {/* Thumbnail */}
                      <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-stone-100">
                        {items[0]?.image_url
                          ? <Image src={getImageUrl(items[0].image_url)} alt={items[0].name} fill className="object-cover" sizes="56px" />
                          : <div className="flex h-full items-center justify-center text-stone-300"><Icon name="bowl" size={20} /></div>
                        }
                        {items.length > 1 && (
                          <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
                            <span className="text-[9px] font-black text-white">+{items.length - 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-stone-900 tracking-tight truncate leading-tight">
                              {items.map(i => i?.name).filter(Boolean).join(' + ')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-black text-amber-500 tracking-wider">
                                {SLOT_LABEL[sub.delivery_slot]}
                              </span>
                              <span className="text-stone-200">·</span>
                              <span className="text-[9px] font-black text-stone-400 tracking-wider">
                                {FREQ_LABEL[sub.frequency]}
                              </span>
                              <span className="text-stone-200">·</span>
                              <span className="text-[9px] font-black text-stone-400 tracking-wider">
                                {sub.duration_days}d plan
                              </span>
                            </div>
                          </div>

                          {/* Status + action */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={isActive ? 'premium' : 'default'}
                              className="!rounded-full py-0.5 px-2 text-[8px] tracking-wider font-black capitalize"
                            >
                              {sub.status}
                            </Badge>
                            {isActive && (
                              <button
                                disabled={actionId === sub.id}
                                onClick={() => {
                                  if (window.confirm('Cancel this subscription? This action is irreversible.')) {
                                    onAction(sub.id, 'cancelled')
                                  }
                                }}
                                className="text-[9px] font-black text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50 tracking-wide"
                              >
                                {actionId === sub.id ? '…' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Stat pills */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2 py-0.5">
                            {done} done
                          </span>
                          <span className="text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5">
                            {pending} left
                          </span>
                          {isActive && (
                            <span className={cn(
                              "text-[9px] font-black rounded-full px-2 py-0.5 border",
                              left <= 5
                                ? "bg-red-50 text-red-500 border-red-100"
                                : "bg-stone-50 text-stone-500 border-stone-100"
                            )}>
                              {left}d remaining
                            </span>
                          )}
                          <span className="text-[9px] font-black bg-stone-50 text-stone-500 border border-stone-100 rounded-full px-2 py-0.5">
                            {formatPrice(grandTotal)} total
                          </span>
                          {!isActive && sub.refund_amount > 0 && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2 py-0.5">
                              {sub.payment_status === 'refunded' ? '✓ Refunded' : 'Refund pending'} {formatPrice(sub.refund_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-bold text-stone-300">{formatDate(sub.start_date)}</span>
                        <span className="text-[8px] font-bold text-stone-300">{progress}%</span>
                        <span className="text-[8px] font-bold text-stone-300">{formatDate(sub.end_date)}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", isActive ? "bg-amber-500" : "bg-stone-300")}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.08 }}
                        />
                      </div>
                    </div>

                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
