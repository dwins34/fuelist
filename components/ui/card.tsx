/**
 * Card primitives — shadcn-style.
 *
 * To retheme the entire card across the app, edit the `base` strings here.
 * Nothing else in the codebase needs to change.
 */
import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ── Card ──────────────────────────────────────────────────────────────────────

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // ← theme token: change border-radius, shadow, background here
        'rounded-2xl bg-white border border-gray-100 shadow-sm',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

// ── CardImage ─────────────────────────────────────────────────────────────────
// Wrapper that clips the image to the top rounded corners of the card.

const CardImage = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // ← theme token: change image height here
        'relative h-48 w-full overflow-hidden rounded-t-2xl bg-gray-100',
        className
      )}
      {...props}
    />
  )
)
CardImage.displayName = 'CardImage'

// ── CardContent ───────────────────────────────────────────────────────────────

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // ← theme token: change card body padding here
        'flex flex-col gap-2.5 p-4',
        className
      )}
      {...props}
    />
  )
)
CardContent.displayName = 'CardContent'

// ── CardFooter ────────────────────────────────────────────────────────────────

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 pt-1', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardImage, CardContent, CardFooter }
