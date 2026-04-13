/**
 * Badge primitive — shadcn-style.
 *
 * Supports named variants. To retheme badge colours globally, edit the
 * `variants` map below — no other file needs to change.
 */
import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'    // green — category label
  | 'bestseller' // amber — ⭐ Bestseller
  | 'macro-cal'  // amber tint — calories
  | 'macro-p'    // blue tint — protein
  | 'macro-c'    // purple tint — carbs
  | 'macro-f'    // rose tint — fats
  | 'unavailable'

// ← theme token: edit colours here to retheme all badges site-wide
const variants: Record<BadgeVariant, string> = {
  default:      'bg-green-500 text-white',
  bestseller:   'bg-amber-400 text-white',
  'macro-cal':  'bg-amber-50  text-amber-700',
  'macro-p':    'bg-blue-50   text-blue-700',
  'macro-c':    'bg-purple-50 text-purple-700',
  'macro-f':    'bg-rose-50   text-rose-700',
  unavailable:  'bg-white/90  text-gray-700',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        // ← theme token: change badge shape/padding here
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
