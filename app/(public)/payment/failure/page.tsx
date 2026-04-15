'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'

export default function PaymentFailurePage() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center max-w-xl mx-auto py-12 animate-in fade-in duration-1000">
      
      {/* Visual Indicator - Refined Size */}
      <div className="relative flex items-center justify-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-stone-900 shadow-xl shadow-stone-200"
        >
          <Icon name="error" size={32} strokeWidth={3} className="text-rose-500" />
        </motion.div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.05, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 m-auto h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" 
        />
      </div>

      <div className="space-y-4 mb-10">
        <Badge variant="secondary" className="px-4 py-1 text-[9px] tracking-[0.2em] font-black border-rose-100 text-rose-600 bg-rose-50/50">
          TRANSACTION INTERRUPTED
        </Badge>
        <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Protocol Error</h1>
        <p className="text-stone-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
          The payment gateway reported a verification failure. Any funds deducted from your account will be automatically 
          refunded within 5-7 operational days.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button href="/menu" size="lg">
          Re-Attempt Checkout
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Return to Home
        </Button>
      </div>

      <div className="mt-16 pt-8 border-t border-stone-50 w-full flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 text-stone-300">
           <Icon name="warning" size={16} />
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">Contact support if issues persist</span>
        </div>
        <div className="flex gap-6">
           <Link href="/contact" className="text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-600 transition-colors">Help Center</Link>
           <div className="h-3 w-[1px] bg-stone-100" />
           <Link href="/terms" className="text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-600 transition-colors">System Protocol</Link>
        </div>
      </div>
    </div>
  )
}
