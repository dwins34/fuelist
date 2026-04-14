'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { Icon } from '@/lib/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CartButtonProps {
  onClick: () => void
}

export default function CartButton({ onClick }: CartButtonProps) {
  const { count, total } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <motion.button
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl bg-stone-900 px-6 py-4 text-white shadow-premium transition-all duration-300",
        count > 0 ? "border-amber-500/50 border-2" : "border-stone-800 border-2"
      )}
    >
      <div className="relative">
        <Icon name="bowl" size={18} strokeWidth={2.5} className="text-amber-500" />
        <AnimatePresence>
          {count > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-3 -right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black border-2 border-stone-900"
            >
              {count}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-start leading-none">
        <span className="text-[11px] font-black uppercase tracking-widest text-stone-400">
          {count > 0 ? 'Your Order' : 'Cart'}
        </span>
        {count > 0 && (
          <span className="text-sm font-black text-white tracking-tight mt-0.5">
            ₹{total.toFixed(0)}
          </span>
        )}
      </div>
    </motion.button>
  )
}
