'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * Reusable Premium Dropdown Component for Fuelist
 * Handles positioning, accessibility, and high-end animations.
 */

interface DropdownItem {
  id: string
  label: string
  icon?: IconName
  onClick: () => void
  variant?: 'default' | 'danger'
  badge?: string | number
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  header?: ReactNode
  align?: 'left' | 'right'
  className?: string
  width?: string
}

export default function Dropdown({ 
  trigger, 
  items, 
  header,
  align = 'right', 
  className,
  width = 'w-56'
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer transition-transform active:scale-95"
      >
        {trigger}
      </div>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute z-[80] mt-3 origin-top-right rounded-3xl bg-white shadow-premium border border-stone-100 backdrop-blur-xl overflow-hidden p-2",
              align === 'right' ? 'right-0' : 'left-0',
              width
            )}
          >
            {header && (
              <div className="mb-1 border-b border-stone-50 pb-1">
                {header}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.onClick()
                    setIsOpen(false)
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200",
                    item.variant === 'danger'
                      ? "text-red-600 hover:bg-red-50"
                      : "text-stone-700 hover:bg-amber-50 hover:text-amber-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && (
                      <Icon 
                        name={item.icon} 
                        size={18} 
                        strokeWidth={2.5} 
                        className={cn(
                          "transition-transform group-hover:scale-110",
                          item.variant === 'danger' ? "text-red-500" : "text-stone-400 group-hover:text-amber-600"
                        )} 
                      />
                    )}
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={cn(
                      "flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black tracking-tight",
                      item.variant === 'danger' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
