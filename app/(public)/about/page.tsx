'use client'

import { useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import SubscriptionSection from '@/components/about/SubscriptionSection'

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1400
    const step = 16
    const increment = to / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= to) { setVal(to); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [inView, to])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

// ── Fade-in section wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const PILLARS = [
  {
    icon: 'leaf' as const,
    title: 'Pure Ingredients',
    body: 'No preservatives, no hidden sugars. Every item is prepared fresh — what you see on the menu is exactly what reaches your door.',
  },
  {
    icon: 'zap' as const,
    title: 'Precision Nutrition',
    body: 'Full macro and calorie breakdown on every item. Because knowing what you eat is as important as eating well.',
  },
  {
    icon: 'time' as const,
    title: 'Actually Fast',
    body: 'From tap to table. Minimal steps, real-time kitchen sync, and delivery that respects your schedule.',
  },
]

const MEMBERS = [
  { initials: 'DG', name: 'Divya Gupta' },
  { initials: 'VG', name: 'Vipul Gupta' },
  { initials: 'HS', name: 'Hardik Sharma' },
]

const DIFFERENTIATORS = [
  { icon: 'bowl' as const,  label: 'Real-time kitchen sync',     sub: 'Your order moves with the kitchen — live.' },
  { icon: 'zap' as const,   label: 'Three-step checkout',        sub: 'Browse, pick, pay. Done in under a minute.' },
  { icon: 'success' as const, label: 'Mobile-first experience',  sub: 'Designed for the phone in your hand, not a desktop.' },
  { icon: 'subscriptions' as const, label: 'Smart subscriptions', sub: 'Automate your weekly meals without thinking twice.' },
]

const STATS = [
  { label: 'Bowls delivered',   key: 'totalOrders',  fallback: 1200, suffix: '+' },
  { label: 'Happy customers',   key: 'totalUsers',   fallback: 400,  suffix: '+' },
  { label: 'Cities served',     key: 'activeCities', fallback: 3,    suffix: '' },
]

export default function AboutPage() {
  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setStats(d.stats) })
      .catch(() => {})
  }, [])

  return (
    <div className="bg-white">

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-stone-950 px-6 pt-32 pb-14 ">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl w-full z-10">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.35em] text-amber-400/80 uppercase mb-6">
              <span className="h-px w-8 bg-amber-400/40" />
              Our Story
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.95] mb-8">
              Fuel your life<br />
              with <span className="text-amber-400">better food,</span><br />
              faster.
            </h1>
            <p className="text-lg sm:text-xl font-medium text-stone-400 max-w-xl leading-relaxed mb-10">
              Fuelist is a precision nutrition platform built for people who refuse to trade speed for quality. Real food. Real macros. Delivered fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pb-10">
              <Button href="/menu" size="lg">Explore the Menu</Button>
              <Button href="/contact" size="lg" variant="ghost">Get in Touch</Button>
            </div>
          </motion.div>
        </div>

        {/* Bottom fade into white */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── 2. STATS ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1} className="text-center">
              <p className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tighter">
                <Counter to={stats[s.key] ?? s.fallback} suffix={s.suffix} />
              </p>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-400 mt-2">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="h-px bg-stone-100 mx-auto max-w-4xl" />

      {/* ── 3. OUR STORY ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-4 block">The Origin</span>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter leading-tight mb-6">
              Built from a real problem, not a boardroom.
            </h2>
            <div className="space-y-4 text-stone-500 font-medium leading-relaxed text-[15px]">
              <p>
                It started with a simple frustration — every "healthy" food option was either tasteless, overpriced, or took forever to arrive. The compromise between speed, quality, and nutrition felt impossible.
              </p>
              <p>
                Fuelist was built to dissolve that compromise. A platform where clean, macro-balanced meals could be ordered in seconds, prepared in real time, and delivered without the usual chaos.
              </p>
              <p>
                No dark patterns. No hidden fees. No confusion. Just great food that respects your time and your body.
              </p>
            </div>
          </Reveal>

          {/* Visual block */}
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="rounded-3xl bg-stone-950 overflow-hidden aspect-[4/3] flex items-end p-8 shadow-2xl shadow-stone-200">
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-transparent" />
                <Image src="/images/hero-bowl.png" alt="Fuelist bowl" fill className="object-cover object-center opacity-90" sizes="600px" />
                <div className="relative z-10 bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/10">
                  <p className="text-[9px] font-black tracking-[0.3em] text-amber-400 uppercase mb-2">Our promise</p>
                  <p className="text-3xl font-black text-white tracking-tighter leading-tight drop-shadow-lg">
                    Good food,<br />no compromise.
                  </p>
                </div>
              </div>
              {/* Floating pill */}
              <div className="absolute -top-4 -right-4 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-lg shadow-stone-100 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Icon name="leaf" size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Always</p>
                  <p className="text-[11px] font-black text-stone-900">100% Fresh</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 4. WHAT WE DO ────────────────────────────────────────────────────── */}
      <section className="bg-stone-50 py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-14">
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-3 block">What we do</span>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter">
              Simple, clean, and intentional.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className="bg-white rounded-3xl p-7 border border-stone-100 h-full">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-5">
                    <Icon name={p.icon} size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-base font-black text-stone-900 mb-2 tracking-tight">{p.title}</h3>
                  <p className="text-sm font-medium text-stone-400 leading-relaxed">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. WHAT MAKES US DIFFERENT ───────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <Reveal className="mb-14">
          <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-3 block">Why Fuelist</span>
          <h2 className="text-4xl font-black text-stone-900 tracking-tighter max-w-sm">
            Built different, on purpose.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIFFERENTIATORS.map((d, i) => (
            <Reveal key={d.label} delay={i * 0.08}>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-stone-100 bg-stone-50/50">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-stone-100 flex items-center justify-center text-amber-500">
                  <Icon name={d.icon} size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-black text-stone-900 mb-0.5">{d.label}</p>
                  <p className="text-xs font-medium text-stone-400">{d.sub}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 6. MISSION ───────────────────────────────────────────────────────── */}
      <section className="bg-stone-950 py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
        <Reveal className="mx-auto max-w-2xl text-center relative z-10">
          <span className="text-[10px] font-black tracking-[0.35em] text-amber-400/60 uppercase mb-6 block">Our Mission</span>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-tight">
            To make healthy, satisfying choices feel natural, easy, and never like a compromise.
          </p>
          <div className="mt-8 h-px w-16 bg-amber-400/30 mx-auto" />
        </Reveal>
      </section>

      {/* ── 7. THE TEAM ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <Reveal className="mb-14">
          <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-3 block">Behind the screen</span>
          <h2 className="text-4xl font-black text-stone-900 tracking-tighter mb-4">Collective effort, shared vision.</h2>
          <p className="text-[15px] font-medium text-stone-400 leading-relaxed max-w-xl">
            Fuelist is built on a simple belief — great food should be easy to access, and technology should stay out of your way. Every screen, every interaction is the result of people who genuinely care about getting the details right.
          </p>
        </Reveal>

        {/* Three member avatars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
          {MEMBERS.map((member, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="flex flex-col items-center text-center p-7 rounded-3xl bg-stone-50 border border-stone-100">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-lg font-black mb-4 shadow-lg shadow-amber-200/50">
                  {member.initials}
                </div>
                <p className="text-sm font-black text-stone-900">{member.name}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Shared note */}
        <Reveal>
          <blockquote className="relative bg-stone-50 rounded-3xl border border-stone-100 p-8">
            <div className="absolute -top-4 left-8 text-6xl text-amber-200 font-black leading-none select-none">"</div>
            <div className="space-y-4 text-[15px] font-medium text-stone-600 leading-relaxed">
              <p>
                This wasn’t created in isolation — it grew through ideas, discussions, constant refinement, and a shared commitment to getting the details right.
              </p>
              <p>
                From the beginning, the goal has been simple: to remove friction — not just from the product, but from your everyday experience. If Fuelist makes things even a little easier for you, then it’s a reflection of everything the team set out to achieve.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <p className="text-xs font-black text-stone-400 tracking-wider">The Fuelist Team</p>
            </div>
          </blockquote>
        </Reveal>
      </section>

      {/* ── 8. WHO WE SERVE ──────────────────────────────────────────────────── */}
      <section className="bg-stone-50 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-12 text-center">
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-3 block">Who we serve</span>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter">Made for the intentional ones.</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { emoji: '🏋️', label: 'Fitness-focused', sub: 'People tracking macros and fueling performance.' },
              { emoji: '💻', label: 'Busy professionals', sub: 'No time to cook, but unwilling to eat junk.' },
              { emoji: '🌱', label: 'Clean eaters', sub: 'Anyone who reads the label before they eat.' },
            ].map((u, i) => (
              <Reveal key={u.label} delay={i * 0.1}>
                <div className="bg-white rounded-3xl p-7 border border-stone-100 h-full">
                  <span className="text-4xl block mb-4">{u.emoji}</span>
                  <p className="text-sm font-black text-stone-900 mb-1.5">{u.label}</p>
                  <p className="text-xs font-medium text-stone-400 leading-relaxed">{u.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FUTURE VISION ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <span className="text-[10px] font-black tracking-[0.35em] text-amber-500 uppercase mb-4 block">Where we're going</span>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter mb-6">
              This is version one.
            </h2>
            <div className="space-y-3 text-sm font-medium text-stone-500 leading-relaxed">
              <p>Fuelist is still early. The kitchen is warm and the roadmap is ambitious.</p>
              <p>More cities, smarter subscriptions, deeper nutritional data, and a community that keeps each other accountable — all of it is coming, steadily and without cutting corners.</p>
              <p className="text-amber-600 font-semibold">We're not racing. We're building something worth staying for.</p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="space-y-3">
              {[
                { done: true,  text: 'Real-time kitchen display system' },
                { done: true,  text: 'Smart subscription management' },
                { done: true,  text: 'Multi-address delivery' },
                { done: false, text: 'Expanded city coverage' },
                { done: false, text: 'Community rewards & referrals' },
                { done: false, text: 'Personalised meal plans' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]',
                    item.done ? 'bg-emerald-500 text-white' : 'bg-stone-100 border border-stone-200'
                  )}>
                    {item.done && <Icon name="success" size={10} strokeWidth={3} />}
                  </div>
                  <span className={cn('text-sm font-medium', item.done ? 'text-stone-900' : 'text-stone-400')}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SUBSCRIPTION CTA ─────────────────────────────────────────────────── */}
      <SubscriptionSection />

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="bg-stone-950 py-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <Reveal className="mx-auto max-w-2xl text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-5">
            Your next great meal<br />is one tap away.
          </h2>
          <p className="text-stone-400 font-medium mb-10 leading-relaxed">
            Join thousands of people who've stopped compromising on what they eat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button href="/menu" size="lg">Browse the Menu</Button>
            <Button href="/contact" size="lg" variant="ghost">Say Hello</Button>
          </div>
        </Reveal>
      </section>

    </div>
  )
}
