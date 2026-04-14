'use client'

import { InputHTMLAttributes, forwardRef, useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  labelClassName?: string
  error?: string
  icon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelClassName, error, className, id, icon, onFocus, onBlur, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="group flex flex-col gap-1.5 w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className={cn(
              "text-[11px] font-black capitalize tracking-wider transition-colors duration-200 ml-1",
              isFocused ? "text-amber-600" : "text-stone-400 group-hover:text-stone-500",
              error && "text-red-500",
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative flex items-center">
          {icon && (
            <div className={cn(
              "absolute left-4 transition-colors duration-200",
              isFocused ? "text-amber-500" : "text-stone-400"
            )}>
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            onFocus={(e) => {
              setIsFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              onBlur?.(e)
            }}
            className={cn(
              'w-full rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 outline-none',
              'bg-stone-50/50 border-stone-100 text-stone-900 placeholder:text-stone-300',
              'hover:bg-stone-50 hover:border-stone-200',
              'focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5',
              !!icon && 'pl-11',
              !!error && 'border-red-100 bg-red-50/30 focus:border-red-500 focus:ring-red-500/5',
              !!disabled && 'opacity-50 cursor-not-allowed bg-stone-100 border-stone-200',
              className
            )}
            disabled={disabled}
            {...props}
          />

          {/* Subtle focus glow border mask */}
          <motion.div
            initial={false}
            animate={{ opacity: isFocused ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 rounded-xl border-2 border-amber-500/20"
            aria-hidden="true"
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] font-bold text-red-500 ml-1 mt-0.5"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
