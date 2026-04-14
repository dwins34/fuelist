'use client'

/**
 * Badge primitive — Premium Fuelist Style.
 *
 * Consistent with the warm gold/ivory design system.
 */
import { HTMLAttributes } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'    // Stone / Neutral
  | 'premium'    // Amber / Gold (Bestseller)
  | 'success'    // Green (Active/Paid)
  | 'warning'    // Orange
  | 'danger'     // Red
  | 'info'       // Blue
  | 'secondary'  // Soft Beige

const variants: Record<BadgeVariant, string> = {
  default:   'bg-stone-100 text-stone-700 border-stone-200',
  premium:   'bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-100/50',
  success:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning:   'bg-orange-100 text-orange-700 border-orange-200',
  danger:    'bg-red-100 text-red-700 border-red-200',
  info:      'bg-blue-100 text-blue-700 border-blue-200',
  secondary: 'bg-stone-50 text-stone-500 border-stone-100',
}

type CombinedProps = HTMLMotionProps<'span'> & Omit<HTMLAttributes<HTMLSpanElement>, keyof HTMLMotionProps<'span'>>

interface BadgeProps extends CombinedProps {
  variant?: BadgeVariant
  pill?: boolean
}

export function Badge({ 
  variant = 'default', 
  pill = true, 
  className, 
  ...props 
}: BadgeProps) {
  return (
    <motion.span
      whileHover={{ y: -1 }}
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-black capitalize tracking-normal transition-all duration-200',
        pill ? 'rounded-full' : 'rounded-lg',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
