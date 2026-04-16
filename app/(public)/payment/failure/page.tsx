'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'

function FailureContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

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
        <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Payment Failed</h1>
        <p className="text-stone-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
          The payment gateway reported a verification failure. Any funds deducted from your account will be automatically
          refunded within 5-7 operational days.
        </p>
        {reason && (
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100">
            <Icon name="warning" size={13} className="text-rose-400 shrink-0" />
            <span className="text-[10px] font-black text-rose-500 tracking-wider">{reason}</span>
          </div>
        )}
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
           <Link href="/terms" className="text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-600 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[85vh] items-center justify-center">
        <div className="h-10 w-10 border-4 border-stone-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    }>
      <FailureContent />
    </Suspense>
  )
}
