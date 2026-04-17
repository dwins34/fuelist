'use client'

import { ReactNode } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const maxWeights = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  maxWidth = 'lg'
}: ModalProps) {
  useScrollLock(isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-md touch-none"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative z-10 w-full bg-white shadow-premium rounded-[2rem] overflow-hidden flex flex-col",
              maxWeights[maxWidth],
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-stone-100">
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="group rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-all duration-200"
                aria-label="Close modal"
              >
                <Icon name="close" size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-7 overflow-y-auto max-h-[75vh] custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
