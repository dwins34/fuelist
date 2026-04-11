'use client'

import { ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  href?: string
}

const base =
  'inline-flex items-center justify-center font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:   'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
  secondary: 'bg-white text-green-600 border border-green-500 hover:bg-green-50 focus:ring-green-500',
  danger:    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  ghost:     'bg-transparent text-green-600 hover:bg-green-50 focus:ring-green-500',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
}

const Spinner = () => (
  <span className="flex items-center gap-2">
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    Loading…
  </span>
)

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], className)

  // Render as a Next.js Link (<a>) when href is provided — avoids <a><button> nesting
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : children}
    </button>
  )
}
