'use client'

import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Fuelist Design System — Button
 *
 * Three canonical variants (per Figma):
 *  primary   → Charcoal pill, white text, optional amber icon left
 *  secondary → White pill with soft border, amber text, optional amber icon left
 *  ghost     → No background/border, amber-brown text + chevron right (explore/nav links)
 *
 * Legacy aliases kept for backward-compat:
 *  outline   → maps to secondary
 *  danger    → retains rose styling (destructive actions only)
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'ref'
> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  href?: string
  leftIcon?: ReactNode    // renders at amber-500 colour inside button
  showArrow?: boolean     // append ChevronRight — default true for ghost variant
  // Framer Motion passthrough
  whileHover?: any
  whileTap?: any
  initial?: any
  animate?: any
  transition?: any
}

// ─── Base ────────────────────────────────────────────────────────────────────
const base = [
  'inline-flex items-center justify-center gap-2.5',
  'font-black tracking-tight',
  'transition-all duration-200',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
  'select-none',
].join(' ')

// ─── Variants ────────────────────────────────────────────────────────────────
const variants: Record<ButtonVariant, string> = {
  // ① Dark pill — "Add to cart", "Sign in", primary CTA
  primary: [
    'bg-stone-900 text-white',
    'hover:bg-stone-800',
    'shadow-md shadow-stone-900/10',
    '[&_[data-icon]]:text-amber-500',          // icon slot rendered amber
  ].join(' '),

  // ② Light pill — "Plan", "Secondary action"
  secondary: [
    'bg-white text-amber-700',
    'border border-stone-200',
    'hover:bg-amber-50 hover:border-amber-200',
    'shadow-sm',
    '[&_[data-icon]]:text-amber-500',
  ].join(' '),

  // ③ outline → alias to secondary (legacy compat)
  outline: [
    'bg-white text-amber-700',
    'border border-stone-200',
    'hover:bg-amber-50 hover:border-amber-200',
    'shadow-sm',
    '[&_[data-icon]]:text-amber-500',
  ].join(' '),

  // ④ Ghost / explore — text link with chevron, no bg
  ghost: [
    'bg-transparent text-amber-800',
    'hover:text-amber-600',
    '[&_[data-icon]]:text-amber-500',
  ].join(' '),

  // ⑤ Danger — destructive actions only
  danger: [
    'bg-rose-50 text-rose-600',
    'border border-rose-100',
    'hover:bg-rose-100 hover:border-rose-200',
    'shadow-sm',
  ].join(' '),
}

// ─── Sizes ───────────────────────────────────────────────────────────────────
const sizes: Record<ButtonSize, string> = {
  sm:   'px-4 py-1.5 text-xs    rounded-full',
  md:   'px-5 py-2.5 text-sm   rounded-full',
  lg:   'px-7 py-3.5 text-sm   rounded-full',
  icon: 'p-2 rounded-full',
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
const Button = forwardRef<any, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  className,
  disabled,
  type = 'button',
  leftIcon,
  showArrow,
  whileHover,
  whileTap,
  initial,
  animate,
  transition,
  ...props
}, ref) => {
  const cls = cn(base, variants[variant], sizes[size], className)

  // Ghost buttons default to showing the right chevron
  const renderArrow = showArrow ?? (variant === 'ghost')

  const content = (
    <>
      {loading ? (
        <Spinner />
      ) : leftIcon ? (
        <span data-icon className="shrink-0 text-amber-500">{leftIcon}</span>
      ) : null}
      {children}
      {renderArrow && !loading && (
        <ChevronRight className="shrink-0 text-amber-500" size={15} strokeWidth={2.5} />
      )}
    </>
  )

  if (href) {
    return (
      <motion.div
        ref={ref}
        whileHover={whileHover}
        whileTap={whileTap ?? { scale: 0.97 }}
        className="inline-block"
      >
        <Link href={href} className={cls} {...(props as any)}>
          {content}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      className={cls}
      disabled={disabled || loading}
      whileHover={whileHover}
      whileTap={whileTap ?? { scale: 0.97 }}
      initial={initial}
      animate={animate}
      transition={transition ?? { type: 'spring', stiffness: 500, damping: 30 }}
      {...(props as any)}
    >
      {content}
    </motion.button>
  )
})

Button.displayName = 'Button'
export default Button
