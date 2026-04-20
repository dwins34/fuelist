'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { formatPrice, getImageUrl } from '@/lib/utils'
import Image from 'next/image'
import LiveTimer from './LiveTimer'
import PriorityBadge from './PriorityBadge'

interface StaffInfo { id: string; name: string }

interface KDSOrder {
  id: string
  items: { item: { id: string; name: string; price: number; image_url?: string }; quantity: number }[]
  total_amount: number
  order_status: string
  estimated_prep_time: number
  priority_score: number
  assigned_staff_id: string | null
  assigned_at: string | null
  created_at: string
  address?: { name?: string } | null
  staff?: StaffInfo | null
  is_subscription?: boolean
  delivery_slot?: string
}

interface OrderCardProps {
  order: KDSOrder
  staffList: StaffInfo[]
  onStatusChange: (id: string, status: string) => Promise<void>
  onAssign: (id: string, staffId: string | null) => Promise<void>
  isNew?: boolean
}

const STATUS_NEXT: Record<string, { label: string; color: string }> = {
  new:             { label: 'Start Preparing', color: 'bg-amber-500 hover:bg-amber-400' },
  preparing:       { label: 'Mark Ready',      color: 'bg-emerald-500 hover:bg-emerald-400' },
  ready:           { label: 'Mark Delivered',  color: 'bg-blue-500 hover:bg-blue-400' },
  out_for_delivery:{ label: 'Mark Delivered',  color: 'bg-blue-500 hover:bg-blue-400' },
}

const STATUS_LABEL: Record<string, string> = {
  new:             'New Order',
  preparing:       'Preparing',
  ready:           'Ready',
  out_for_delivery:'Out for Delivery',
}

const STATUS_COLOR: Record<string, string> = {
  new:             'border-amber-500/40 bg-amber-500/5',
  preparing:       'border-blue-500/40 bg-blue-500/5',
  ready:           'border-emerald-500/40 bg-emerald-500/5',
  out_for_delivery:'border-purple-500/40 bg-purple-500/5',
}

export default function OrderCard({ order, staffList, onStatusChange, onAssign, isNew }: OrderCardProps) {
  const [loading, setLoading]       = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const x = useMotionValue(0)
  const swipeIndicator = useTransform(x, [-80, 0, 80], [-1, 0, 1])
  const dragRef = useRef(false)

  const shortId = `#${order.id.slice(-6).toUpperCase()}`
  const next = STATUS_NEXT[order.order_status]

  async function handleStatus() {
    const map: Record<string, string> = {
      new: 'preparing', preparing: 'ready',
      ready: 'delivered', out_for_delivery: 'delivered',
    }
    const to = map[order.order_status]
    if (!to || loading) return
    setLoading(true)
    await onStatusChange(order.id, to)
    setLoading(false)
  }

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (dragRef.current) return
    if (info.offset.x > 70) {
      dragRef.current = true
      await handleStatus()
      dragRef.current = false
    } else if (info.offset.x < -70) {
      dragRef.current = true
      const prev: Record<string, string> = { preparing: 'new', ready: 'preparing' }
      const to = prev[order.order_status]
      if (to) {
        setLoading(true)
        await onStatusChange(order.id, to)
        setLoading(false)
      }
      dragRef.current = false
    }
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
  }

  const waitMins = (Date.now() - new Date(order.created_at).getTime()) / 60000
  const isOverdue = waitMins > order.estimated_prep_time
  const borderClass = STATUS_COLOR[order.order_status] ?? 'border-stone-700/50'

  return (
    <motion.div
      layout
      initial={isNew ? { scale: 0.95, opacity: 0, y: -10 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="relative"
    >
      {/* Swipe hint indicators */}
      <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center pointer-events-none z-0 opacity-0 group-hover:opacity-100">
        <span className="text-stone-600 text-xs font-black">◀ BACK</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center pointer-events-none z-0 opacity-0 group-hover:opacity-100">
        <span className="text-stone-600 text-xs font-black">NEXT ▶</span>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 rounded-2xl border-2 ${borderClass} bg-stone-900 overflow-hidden cursor-grab active:cursor-grabbing select-none ${isOverdue ? 'shadow-lg shadow-red-900/30' : ''}`}
      >
        {/* Overdue flash bar */}
        {isOverdue && (
          <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-pulse" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-black text-stone-300 tracking-widest">{shortId}</span>
            {order.is_subscription && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🔄 Sub {order.delivery_slot ? `· ${order.delivery_slot}` : ''}
              </span>
            )}
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              order.order_status === 'new' ? 'bg-amber-500/20 text-amber-400' :
              order.order_status === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {STATUS_LABEL[order.order_status] ?? order.order_status}
            </span>
            <PriorityBadge
              score={order.priority_score}
              estimatedMinutes={order.estimated_prep_time}
              createdAt={order.created_at}
            />
          </div>
          <LiveTimer createdAt={order.created_at} estimatedMinutes={order.estimated_prep_time} />
        </div>

        {/* Items */}
        <div className="px-4 py-3 space-y-2">
          {order.items.map(({ item, quantity }, idx) => (
            <div key={item.id ?? idx} className="flex items-center gap-3">
              <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-stone-800">
                {item.image_url
                  ? <Image src={getImageUrl(item.image_url)} alt={item.name} fill sizes="36px" className="object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-stone-600 text-lg">🥗</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white truncate">{item.name}</p>
              </div>
              <span className="text-[11px] font-black text-stone-300 tabular-nums shrink-0">×{quantity}</span>
            </div>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between px-4 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-stone-500">
              Est. {order.estimated_prep_time}m
            </span>
            {order.address?.name && (
              <span className="text-[10px] font-medium text-stone-500 truncate max-w-[100px]">
                · {order.address.name}
              </span>
            )}
          </div>
          <span className="text-[11px] font-black text-stone-300">{formatPrice(order.total_amount)}</span>
        </div>

        {/* Staff assignment */}
        <div className="px-4 pb-3">
          {showAssign ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { onAssign(order.id, null); setShowAssign(false) }}
                className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-stone-800 text-stone-400 hover:bg-stone-700"
              >
                Unassign
              </button>
              {staffList.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onAssign(order.id, s.id); setShowAssign(false) }}
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${
                    order.assigned_staff_id === s.id
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 text-[10px] font-black text-stone-500 hover:text-amber-400 transition-colors"
            >
              <span className="h-5 w-5 rounded-lg bg-stone-800 flex items-center justify-center text-xs">
                {order.staff?.name?.[0] ?? '+'}
              </span>
              {order.staff?.name ?? 'Assign staff'}
            </button>
          )}
        </div>

        {/* Action button */}
        {next && (
          <button
            onClick={handleStatus}
            disabled={loading}
            className={`w-full py-3 text-[11px] font-black uppercase tracking-widest text-white transition-colors ${next.color} disabled:opacity-50`}
          >
            {loading ? 'Updating…' : next.label}
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
