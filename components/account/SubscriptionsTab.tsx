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
      <div className="flex flex-col gap-1.5 border-b border-stone-100 pb-6">
        <h1 className="text-2xl font-black text-stone-900 tracking-tighter capitalize">My Subscriptions</h1>
        <p className="text-xs font-medium text-stone-400">Manage your recurring meal plans and scheduled deliveries.</p>
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
          <Button href="/menu" variant="primary" size="md" className="mt-8 shadow-premium">
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
                      "overflow-hidden group !rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-premium transition-all",
                      !isActive && "opacity-60 grayscale-[0.5] bg-stone-50/50"
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Visual Identity */}
                        <div className="relative w-full md:w-48 h-48 md:h-auto overflow-hidden bg-stone-100 shrink-0 border-r border-stone-50">
                          {menuItem?.image_url ? (
                            <Image
                              src={getImageUrl(menuItem.image_url)}
                              alt={menuItem.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-stone-200">
                               <Icon name="points" size={40} strokeWidth={1} />
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge variant={isActive ? 'premium' : 'default'} className="bg-white/90 backdrop-blur shadow-sm !rounded-full py-0.5 text-[9px] tracking-widest font-black capitalize">
                              {sub.status || 'Unknown'}
                            </Badge>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6">
                          <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                              <h3 className="text-xl font-black text-stone-900 tracking-tighter capitalize truncate">
                                {menuItem?.name || 'Unknown Bundle'}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-[10px] font-black capitalize tracking-widest text-amber-500">
                                  {formatPrice(sub.price_per_delivery)} / Delivery
                                </p>
                                <div className="h-1 w-1 rounded-full bg-stone-200" />
                                <p className="text-[10px] font-black capitalize tracking-widest text-stone-300">
                                  {sub.duration_days} Day Program
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="premium" className="px-3 py-1 h-auto text-[9px] font-black tracking-widest capitalize">
                                <Icon name="time" size={12} strokeWidth={3} className="mr-1.5" />
                                {SLOT_LABEL[sub.delivery_slot] || sub.delivery_slot}
                              </Badge>
                              <Badge variant="secondary" className="px-3 py-1 h-auto text-[9px] font-black tracking-widest capitalize bg-stone-50 border-stone-100">
                                <Icon name="calendar" size={12} strokeWidth={3} className="mr-1.5" />
                                {FREQ_LABEL[sub.frequency] || sub.frequency}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-50">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 tracking-tight">
                              <Icon name="calendar" size={12} className="opacity-50" />
                              <span className="capitalize">{sub.start_date}</span>
                              <Icon name="arrowRight" size={10} className="mx-1 opacity-50 text-stone-300" />
                              <span className="capitalize">{sub.end_date}</span>
                            </div>

                            <div className="flex items-center gap-3">
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
                                  className="text-[9px] capitalize tracking-widest shadow-sm"
                                >
                                  {actionId === sub.id ? 'Processing...' : 'Cancel Program'}
                                </Button>
                              ) : (
                                sub.refund_amount > 0 && (
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge variant="success" className="px-3 py-1.5 shadow-none text-[9px] font-black capitalize tracking-widest leading-none">
                                      <Icon name="success" size={10} strokeWidth={3} />
                                      {sub.payment_status === 'refunded' ? 'Refunded' : 'Refund Initiated'}
                                    </Badge>
                                    <span className="text-[10px] font-black text-stone-400">{formatPrice(sub.refund_amount)}</span>
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
