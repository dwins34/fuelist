'use client'

import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { Icon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'

const BENEFITS = [
  {
    title: 'Precision Nutrition',
    desc: 'Every bowl is calorie-counted and macro-balanced by our experts.',
    icon: 'points' as const,
  },
  {
    title: 'Priority Delivery',
    desc: 'Subscribers get the earliest delivery slots and zero surge pricing.',
    icon: 'zap' as const,
  },
  {
    title: 'Flexible Schedules',
    desc: 'Pause, resume, or skip deliveries anytime with one click.',
    icon: 'time' as const,
  },
  {
    title: 'Cost Efficiency',
    desc: 'Save up to 15% on daily meals compared to one-time orders.',
    icon: 'billing' as const,
  }
]

export default function SubscriptionSection() {
  const { profile } = useAuthContext()

  const ctaHref = profile ? '/account' : '/login?redirect=/about#subscriptions'

  return (
    <section id="subscriptions" className="py-24 px-6 bg-stone-900 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-20 items-center relative">
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="px-8 py-3 rounded-full bg-amber-500 text-white font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-amber-500/40 -rotate-3 mb-24">
              Launching Soon
            </div>
          </div>

          {/* Opacity Wrapper */}
          <div className="flex-1 space-y-10 opacity-40 grayscale-[0.3] pointer-events-none">
            <div>
              <Badge variant="premium" className="mb-6 px-4 py-1.5 uppercase tracking-widest text-[10px] bg-white/5 border-white/10 text-amber-500">
                Fuelist Subscriptions
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tighter">
                Elite Subscriptions <br />
                <span className="text-stone-500">For Peak Performance.</span>
              </h2>
            </div>
            
            <p className="text-lg text-stone-400 font-medium leading-relaxed max-w-xl">
              Don't just eat; optimize. Our subscription program is designed for individuals who view nutrition as a competitive advantage. Constant availability, zero friction.
            </p>

            <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Icon name="success" size={28} strokeWidth={3} />
              </div>
              <div>
                <p className="text-white font-black text-lg leading-tight uppercase tracking-tighter">Coming to your city</p>
                <p className="text-stone-500 text-xs font-bold mt-1 uppercase tracking-widest">Connect with 5,000+ elite daily performers</p>
              </div>
            </div>

            <Button 
               size="lg" 
               className="px-10 py-5 !rounded-[2rem] shadow-xl shadow-amber-500/10 opacity-50"
               disabled
            >
              Sign Up Closed
            </Button>
          </div>

          {/* Right: Benefits Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full opacity-30 grayscale pointer-events-none">
            {BENEFITS.map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-[2.5rem] bg-stone-800/50 border border-white/5 hover:border-amber-500/30 transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Icon name={benefit.icon} size={24} strokeWidth={2.5} />
                </div>
                <h3 className="text-white font-black text-lg mb-3 tracking-tight">{benefit.title}</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  {benefit.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
