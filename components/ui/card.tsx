'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Premium Card Primitives — Fuelist Design System.
 * 
 * Standardizes rounded corners, shadows, and spacing.
 * Includes a 'glass' variant for premium floating UI.
 */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'ghost'
  interactive?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', interactive = false, ...props }, ref) => {
    const Component = interactive ? motion.div : 'div'
    const motionProps = interactive ? {
      whileHover: { y: -4, transition: { duration: 0.2 } },
      whileTap: { scale: 0.98 }
    } : {}

    return (
      <Component
        ref={ref as any}
        className={cn(
          'rounded-[1.5rem] transition-all duration-300',
          variant === 'default' && 'bg-white border border-stone-100 shadow-sm hover:shadow-premium',
          variant === 'glass' && 'glass shadow-premium',
          variant === 'ghost' && 'bg-transparent border border-transparent',
          interactive && 'cursor-pointer',
          className
        )}
        {...(motionProps as any)}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardImage = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative h-56 w-full overflow-hidden rounded-t-[1.5rem] bg-stone-100',
        className
      )}
      {...props}
    />
  )
)
CardImage.displayName = 'CardImage'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-4 p-6',
        className
      )}
      {...props}
    />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 pt-2', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardImage, CardContent, CardFooter }
