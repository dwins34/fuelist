'use client'

import { useMemo } from 'react'
import { Icon, IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface Metrics {
  totalOrders: number
  totalRevenue: number
  aov: number
  totalItemsSold: number
  normalOrders: number
  subOrders: number
  normalRevenue: number
  subRevenue: number
  totalRefunds: number
  totalRefunded: number
}

interface MetricsCardsProps {
  metrics: Metrics
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

interface CardDef {
  label: string
  value: string
  sub: string
  icon: IconName
  accent: string
  bg: string
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards: CardDef[] = useMemo(() => [
    {
      label:  'Total Revenue',
      value:  fmtCurrency(metrics.totalRevenue),
      sub:    `AOV ${fmtCurrency(metrics.aov)}`,
      icon:   'billing',
      accent: 'text-amber-600',
      bg:     'bg-amber-50 border-amber-100',
    },
    {
      label:  'Total Orders',
      value:  fmt(metrics.totalOrders),
      sub:    `${fmt(metrics.normalOrders)} normal · ${fmt(metrics.subOrders)} subscription`,
      icon:   'cart',
      accent: 'text-stone-700',
      bg:     'bg-stone-50 border-stone-100',
    },
    {
      label:  'Items Sold',
      value:  fmt(metrics.totalItemsSold),
      sub:    'Across all orders',
      icon:   'bowl',
      accent: 'text-emerald-600',
      bg:     'bg-emerald-50 border-emerald-100',
    },
    {
      label:  'Refunds',
      value:  fmt(metrics.totalRefunds),
      sub:    `${fmtCurrency(metrics.totalRefunded)} total refunded`,
      icon:   'error',
      accent: 'text-rose-600',
      bg:     'bg-rose-50 border-rose-100',
    },
  ], [metrics])

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn('rounded-2xl border p-4 sm:p-5 space-y-3', card.bg)}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{card.label}</p>
            <Icon name={card.icon} size={16} className={card.accent} />
          </div>
          <p className={cn('text-xl sm:text-2xl font-black tracking-tight', card.accent)}>{card.value}</p>
          <p className="text-[10px] font-medium text-stone-400">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
