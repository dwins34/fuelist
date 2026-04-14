'use client'

import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import Link from 'next/link'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'ref'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  href?: string
  // Allow motion props
  whileHover?: any
  whileTap?: any
  initial?: any
  animate?: any
  transition?: any
}

const base = 'inline-flex items-center justify-center font-black capitalize tracking-wide transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95'

const variants: Record<Variant, string> = {
  primary:   'bg-stone-900 text-amber-500 hover:bg-stone-800 shadow-xl border border-stone-800',
  secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200',
  outline:   'bg-white border-2 border-stone-100 text-stone-900 hover:border-amber-500 hover:bg-amber-50/10 hover:border-amber-500',
  ghost:     'bg-transparent text-stone-400 hover:text-stone-900 hover:bg-stone-50',
  danger:    'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:border-rose-200',
}

const sizes: Record<Size, string> = {
  sm:   'px-3 py-1.5 text-xs rounded-lg',
  md:   'px-5 py-2.5 text-sm rounded-xl',
  lg:   'px-8 py-3.5 text-base rounded-2xl',
  icon: 'p-2 rounded-lg',
}

const Spinner = () => (
  <svg className="animate-spin h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
)

const Button = forwardRef<any, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  className,
  disabled,
  type = 'button',
  whileHover,
  whileTap,
  initial,
  animate,
  transition,
  ...props
}, ref) => {
  const cls = cn(base, variants[variant], sizes[size], className)

  const content = (
    <>
      {loading && <Spinner />}
      {children}
    </>
  )

  if (href) {
    return (
      <motion.div
        ref={ref}
        whileHover={whileHover}
        whileTap={whileTap || { scale: 0.98 }}
        initial={initial}
        animate={animate}
        transition={transition}
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
      whileTap={whileTap || { scale: 0.98 }}
      initial={initial}
      animate={animate}
      transition={transition || { type: 'spring', stiffness: 500, damping: 30 }}
      {...props}
    >
      {content}
    </motion.button>
  )
})

Button.displayName = 'Button'

export default Button
