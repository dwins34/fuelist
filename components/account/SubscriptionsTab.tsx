'use client'

import React from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice, getImageUrl } from '@/lib/utils'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
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
  menu_items: {
    name: string
    image_url: string
  } | Array<{
    name: string
    image_url: string
  }>
}

const SLOT_LABEL: Record<string, string> = {
  morning:   'Morning (8–10 AM)',
  afternoon: 'Afternoon (12–2 PM)',
  evening:   'Evening (6–8 PM)',
}

const FREQ_LABEL: Record<string, string> = {
  daily:    'Daily',
  weekdays: 'Mon–Fri',
  weekends: 'Sat & Sun',
}

interface SubscriptionsTabProps {
  subscriptions: SubscriptionRow[]
  loading: boolean
  actionId: string | null
  onAction: (id: string, status: 'cancelled') => void
}

export default function SubscriptionsTab({ subscriptions, loading, actionId, onAction }: SubscriptionsTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h1 className="text-base sm:text-xl font-black text-stone-900 tracking-tighter capitalize">My Subscriptions</h1>
        <p className="text-[11px] sm:text-xs font-medium text-stone-400">Manage your recurring meal plans.</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 bg-stone-50 rounded-[2rem] animate-pulse border border-stone-100" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[2.5rem] bg-stone-50/30 border-2 border-dashed border-stone-100 py-12 text-center shadow-inner"
        >
          <div className="mx-auto w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300 mb-4">
            <Icon name="calendar" size={32} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-base font-black text-stone-900 tracking-tight capitalize">No active plans yet</h3>
            <p className="text-[11px] font-bold text-stone-400 mt-2 leading-relaxed">
              Explore our curated daily bowls and start your subscription today.
            </p>
          </div>
          <Button href="/menu" variant="ghost" size="md" className="mt-8">
            Explore Menu
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          <AnimatePresence mode="popLayout">
            {subscriptions.map((sub, idx) => {
              const menuItem = Array.isArray(sub.menu_items) ? sub.menu_items[0] : sub.menu_items
              const isActive = sub.status === 'active'
              
              return (
                <motion.div
                  layout
                  key={sub.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.1 } }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden group !rounded-2xl border border-stone-100 shadow-sm hover:shadow-premium transition-all",
                      !isActive && "opacity-60 grayscale-[0.5] bg-stone-50/50"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-row">
                        {/* Thumbnail — compact square */}
                        <div className="relative w-20 sm:w-28 shrink-0 overflow-hidden bg-stone-100">
                          {menuItem?.image_url ? (
                            <Image
                              src={getImageUrl(menuItem.image_url)}
                              alt={menuItem.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                              sizes="112px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-stone-200">
                              <Icon name="points" size={28} strokeWidth={1} />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge variant={isActive ? 'premium' : 'default'} className="bg-white/90 backdrop-blur shadow-sm !rounded-full py-0 px-1.5 text-[8px] tracking-wider font-black capitalize">
                              {sub.status || 'Unknown'}
                            </Badge>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between gap-2 min-w-0">
                          <div className="space-y-1.5">
                            <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tighter capitalize truncate">
                              {menuItem?.name || 'Unknown Bundle'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black capitalize tracking-widest text-amber-500">
                                {formatPrice(sub.price_per_delivery)}/delivery
                              </p>
                              <div className="h-1 w-1 rounded-full bg-stone-200 shrink-0" />
                              <p className="text-[9px] font-black capitalize tracking-widest text-stone-300">
                                {sub.duration_days}d plan
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="premium" className="px-2 py-0.5 h-auto text-[8px] font-black tracking-wider capitalize">
                                <Icon name="time" size={10} strokeWidth={3} className="mr-1" />
                                {SLOT_LABEL[sub.delivery_slot] || sub.delivery_slot}
                              </Badge>
                              <Badge variant="secondary" className="px-2 py-0.5 h-auto text-[8px] font-black tracking-wider capitalize bg-stone-50 border-stone-100">
                                <Icon name="calendar" size={10} strokeWidth={3} className="mr-1" />
                                {FREQ_LABEL[sub.frequency] || sub.frequency}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-50">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-stone-300 tracking-tight min-w-0">
                              <Icon name="calendar" size={10} className="opacity-50 shrink-0" />
                              <span className="truncate">{sub.start_date} → {sub.end_date}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isActive ? (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={actionId === sub.id}
                                  onClick={() => {
                                    if (window.confirm('Cancel this subscription? This action is irreversible.')) {
                                      onAction(sub.id, 'cancelled')
                                    }
                                  }}
                                  className="text-[9px] tracking-widest shadow-sm"
                                >
                                  {actionId === sub.id ? 'Processing...' : 'Cancel'}
                                </Button>
                              ) : (
                                sub.refund_amount > 0 && (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <Badge variant="success" className="px-2 py-1 shadow-none text-[8px] font-black capitalize tracking-wider leading-none">
                                      <Icon name="success" size={9} strokeWidth={3} />
                                      {sub.payment_status === 'refunded' ? 'Refunded' : 'Refund Initiated'}
                                    </Badge>
                                    <span className="text-[9px] font-black text-stone-400">{formatPrice(sub.refund_amount)}</span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
