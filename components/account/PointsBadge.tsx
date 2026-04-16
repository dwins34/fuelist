'use client'

import { Icon } from '@/lib/icons'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PointsBadgeProps {
  points: number
  className?: string
}

/**
 * Premium Points Badge for Fuelist
 * High-density design with Gold/Amber aesthetic.
 */
export default function PointsBadge({ points, className }: PointsBadgeProps) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40 p-2 shadow-sm shadow-amber-100/30 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* Glowy Icon Container */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-200">
          <Icon name="points" size={16} strokeWidth={2.5} />
        </div>

        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-lg font-black text-amber-700 tracking-tight">{points}</span>
            <span className="text-[9px] font-black capitalize tracking-widest text-amber-600/60">Pts</span>
          </div>
          <span className="text-[10px] font-bold text-stone-400 mt-1 capitalize tracking-wider">
            ₹100 purchase = 1 Pt
          </span>
        </div>
      </div>
      
      {/* Subtle Bottom Light Beam */}
      <div className="absolute -bottom-1 -left-1 h-3 w-16 bg-white/40 blur-md rounded-full rotate-12" />
    </motion.div>
  )
}
