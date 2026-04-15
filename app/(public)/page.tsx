'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Icon, IconName } from '@/lib/icons'
import Button from '@/components/ui/Button'
import HeroCTA from '@/components/HeroCTA'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'leaf',
    title: 'Pure & Fresh',
    description: 'Seasonal ingredients sourced daily for maximum nutrition.',
  },
  {
    icon: 'zap',
    title: 'High Protein',
    description: 'Precision-packed macros to fuel your performance.',
  },
  {
    icon: 'search',
    title: 'Transparent',
    description: 'Every calorie and gram listed. No hidden surprises.',
  },
  {
    icon: 'time',
    title: 'Instant Ready',
    description: 'Healthy food as fast as it is fresh.',
  },
]

const CATEGORIES = [
  {
    slug: 'fruit',
    label: 'Fruit Bowls',
    description: 'Nature\'s finest, redefined.',
    icon: 'points',
    bg: 'bg-amber-50/50',
    accent: 'text-amber-700',
  },
  {
    slug: 'breakfast',
    label: 'Morning Fuel',
    description: 'Start your day with intent.',
    icon: 'time',
    bg: 'bg-stone-50',
    accent: 'text-stone-700',
  },
  {
    slug: 'power',
    label: 'Power Bowls',
    description: 'Fuel for the unstoppable.',
    icon: 'bowl',
    bg: 'bg-amber-100/30',
    accent: 'text-amber-800',
  },
]

export default function HomePage() {
  const { profile } = useAuthContext()

  return (
    <div className="flex flex-col gap-16 pb-24">
      {/* ── Hero Section ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-white px-6 pt-24 pb-20 sm:pt-32 sm:pb-24">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative h-full w-full"
          >
            <Image
              src="/images/hero-bowl.png"
              alt="Fuelist Premium Bowls"
              fill
              className="object-cover object-right-top sm:object-right opacity-60 grayscale-[0.2] contrast-[1.1]"
              priority
            />
          </motion.div>
          {/* Multi-layered Premium Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 sm:via-white/70 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-stone-900/5 mix-blend-multiply z-10" />
        </div>

        <div className="mx-auto max-w-7xl w-full relative z-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Badge variant="premium" className="mb-8 px-6 py-2 text-xs backdrop-blur-md bg-amber-500/10 border-amber-500/20 text-amber-900 font-black">
                <Icon name="success" size={12} strokeWidth={4} className="mr-2 text-amber-500" />
                Nutritiously Handcrafted
              </Badge>
              <h1 className="text-5xl sm:text-[7rem] font-black tracking-tighter text-stone-900 leading-[0.85] mb-8">
                Fuel Your <span className="text-amber-500">Peak.</span><br />
                <span className="text-stone-800/90 underline decoration-amber-500/30 decoration-8 underline-offset-8">Defy Ordinary.</span>
              </h1>
              <p className="text-lg sm:text-2xl text-stone-500 max-w-2xl mb-12 font-medium leading-relaxed">
                Premium fruit bowls, high-protein breakfast, and power bowls curated with
                full macro-transparency for the high-performance life.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <HeroCTA />
                {/* <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-stone-50 border border-stone-100 shadow-sm sm:ml-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-stone-200 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Trusted by 5k+ Performers</span>
                </div> */}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl z-10"
        />
      </section>

      {/* ── Categories Section ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Explore Categories</h2>
          <p className="text-stone-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
            From sunrise to late-night fuel, we have the perfect bowl for every ambition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CATEGORIES.map((cat, idx) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <Link href={`/menu?category=${cat.slug}`}>
                <Card
                  interactive
                  className={cn(
                    "h-full p-10 text-center rounded-[3rem] group border-2 flex flex-col items-center",
                    cat.bg
                  )}
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-premium flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Icon name={cat.icon as any} size={40} />
                  </div>
                  <h3 className={cn("text-2xl font-black mb-3", cat.accent)}>{cat.label}</h3>
                  <p className="text-stone-400 text-sm font-medium leading-relaxed">{cat.description}</p>

                  <div className="mt-8 pt-6 border-t border-stone-100/50 w-full flex items-center justify-center gap-2 text-[10px] font-black capitalize tracking-widest text-stone-300 group-hover:text-amber-600 transition-colors">
                    Explore Now
                    <Icon name="arrowRight" size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────────── */}
      <section className="bg-stone-50/50 py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-8 lg:max-w-xl">
              <Badge variant="premium" className="px-4 py-1">Why Fuelist?</Badge>
              <h2 className="text-5xl font-black text-stone-900 tracking-tighter leading-tight">
                Clean Eating, <br />
                <span className="text-amber-500">No Compromise.</span>
              </h2>
              <p className="text-lg text-stone-400 font-medium leading-relaxed">
                We believe your fuel should be as exceptional as your goals. Every bowl is a precision-engineered nutrition system.
              </p>
              <Button href="/about" variant="ghost" size="lg">Learn Our Story</Button>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {FEATURES.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="rounded-[2.5rem] p-8 h-full shadow-premium border-white bg-white/60 backdrop-blur-sm">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                      <Icon name={feature.icon} size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black text-stone-900 mb-2">{feature.title}</h3>
                    <p className="text-sm font-medium text-stone-400 leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6">
        <motion.div
          whileInView={{ scale: [0.98, 1], opacity: [0, 1] }}
          viewport={{ once: true }}
          className="bg-stone-900 rounded-[2.5rem] p-12 sm:p-20 text-center relative overflow-hidden shadow-premium"
        >
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tighter">Ready to Elevate?</h2>
            <p className="text-stone-400 text-base sm:text-lg mb-10 max-w-xl mx-auto font-medium">
              Join thousands of peak-performers who trust Fuelist for their daily nutrition.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/menu" size="lg" className="w-full sm:w-auto">
                Browse Full Menu
              </Button>
              {!profile && (
                <Button
                  href="/signup"
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Join Community
                </Button>
              )}
            </div>
          </div>

          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 h-96 w-96 bg-amber-500/10 blur-[100px] rounded-full" />
        </motion.div>
      </section>
    </div>
  )
}
