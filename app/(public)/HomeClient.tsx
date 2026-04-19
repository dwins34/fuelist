'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform, type Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Icon, IconName } from '@/lib/icons'
import { getImageUrl } from '@/lib/utils'
import Button from '@/components/ui/Button'
import HeroCTA from '@/components/HeroCTA'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/context/AuthContext'
import JsonLd from '@/components/seo/JsonLd'
import { getFAQSchema } from '@/lib/seo'

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
    tagline: "Nature's finest, redefined.",
    description: 'Hand-picked seasonal fruits layered into a bowl of colour, fibre, and natural sugar that powers you through the morning.',
    icon: 'points' as IconName,
    gradient: 'from-amber-400 via-orange-300 to-yellow-200',
    glow: 'rgba(251,191,36,0.35)',
    pill: 'bg-amber-500',
    num: '01',
  },
  {
    slug: 'breakfast',
    label: 'Morning Fuel',
    tagline: 'Start your day with intent.',
    description: 'Whole-grain bases, slow-release carbs, and enough protein to carry you past noon without a crash.',
    icon: 'time' as IconName,
    gradient: 'from-stone-400 via-stone-300 to-stone-100',
    glow: 'rgba(120,113,108,0.25)',
    pill: 'bg-stone-700',
    num: '02',
  },
  {
    slug: 'power',
    label: 'Power Bowls',
    tagline: 'Fuel for the unstoppable.',
    description: 'High-calorie, macro-perfect bowls built for athletes and peak performers who demand more from every meal.',
    icon: 'bowl' as IconName,
    gradient: 'from-amber-600 via-amber-400 to-amber-100',
    glow: 'rgba(217,119,6,0.35)',
    pill: 'bg-amber-600',
    num: '03',
  },
  {
    slug: 'shakes',
    label: 'Muscle Blends',
    tagline: 'Precision macros in every sip.',
    description: 'Cold-blended shakes with calibrated protein, healthy fats, and zero artificial fillers — recovery in a cup.',
    icon: 'zap' as IconName,
    gradient: 'from-stone-900 via-stone-700 to-stone-400',
    glow: 'rgba(28,25,23,0.3)',
    pill: 'bg-stone-900',
    num: '04',
  },
  {
    slug: 'juices',
    label: 'Craft Juices',
    tagline: 'Cold-pressed, naturally vibrant.',
    description: 'Single-origin produce, cold-pressed to preserve enzymes and micronutrients you cannot get from cooked food.',
    icon: 'leaf' as IconName,
    gradient: 'from-lime-400 via-green-300 to-emerald-100',
    glow: 'rgba(132,204,22,0.3)',
    pill: 'bg-green-600',
    num: '05',
  },
]

interface MenuItem { id: string; name: string; image_url: string | null; category: string }

// Full-bleed mosaic grid positions (cover the whole card)
const IMG_POSITIONS = [
  { top: 0,    left: 0,    w: '60%', h: '55%' },
  { top: 0,    left: '60%', w: '40%', h: '40%' },
  { top: '55%', left: 0,   w: '40%', h: '45%' },
  { top: '40%', left: '40%', w: '60%', h: '60%' },
]

function CategoryCarousel() {
  const [active, setActive]     = useState(0)
  const [direction, setDirection] = useState(1)
  const [paused, setPaused]     = useState(false)
  const [images, setImages]     = useState<Record<string, string[]>>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const total = CATEGORIES.length

  // Fetch menu images once
  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.ok ? r.json() : [])
      .then((items: MenuItem[]) => {
        const map: Record<string, string[]> = {}
        items.forEach(item => {
          if (!item.image_url) return
          if (!map[item.category]) map[item.category] = []
          if (map[item.category].length < 3) map[item.category].push(getImageUrl(item.image_url))
        })
        setImages(map)
      })
      .catch(() => {})
  }, [])

  const go = (idx: number, dir: number) => { setDirection(dir); setActive((idx + total) % total) }
  const next = () => go(active + 1, 1)
  const prev = () => go(active - 1, -1)

  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(next, 4200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, paused])

  const cat = CATEGORIES[active]
  const catImages = images[cat.slug] ?? []

  const slideVariants: Variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
    exit:   (d: number) => ({ x: d > 0 ? '-55%' : '55%', opacity: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } }),
  }

  const textVariants: Variants = {
    enter:  { y: 20, opacity: 0 },
    center: { y: 0,  opacity: 1, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1], delay: 0.08 } },
    exit:   { y: -12, opacity: 0, transition: { duration: 0.25 } },
  }

  return (
    <section
      className="relative overflow-hidden bg-stone-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={cat.slug + '-glow'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 65% 80% at 75% 50%, ${cat.glow}, transparent 75%)` }}
        />
      </AnimatePresence>

      <div className="relative mx-auto max-w-7xl px-6 flex flex-col lg:flex-row items-center gap-8 py-12 lg:py-10 min-h-[480px]">

        {/* ── Left: Text ── */}
        <div className="flex-1 flex flex-col justify-center z-10 lg:pr-10">

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
            <p className="text-[10px] font-black tracking-[0.35em] text-stone-500 uppercase mb-2">Explore Categories</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-tight">
              From sunrise to<br />
              <span className="text-amber-400">late-night fuel.</span>
            </h2>
          </motion.div>

          {/* Animated category text */}
          <div className="relative overflow-hidden h-32 mb-7">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={cat.slug} custom={direction}
                variants={textVariants} initial="enter" animate="center" exit="exit"
                className="absolute inset-0 flex flex-col justify-start"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={cn('h-1 w-5 rounded-full', cat.pill)} />
                  <span className="text-[10px] font-black tracking-[0.3em] text-stone-500 uppercase">{cat.num} / 0{total}</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter mb-1">{cat.label}</h3>
                <p className="text-xs font-bold text-amber-400/80 mb-2 tracking-wide">{cat.tagline}</p>
                <p className="text-xs font-medium text-stone-400 leading-relaxed max-w-xs">{cat.description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/menu?category=${cat.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-stone-900 text-xs font-black tracking-wider hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              Shop {cat.label}
              <Icon name="arrowRight" size={13} strokeWidth={3} />
            </Link>
            <Link href="/menu" className="inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-stone-500 hover:text-white transition-colors">
              View All
              <Icon name="arrowRight" size={11} strokeWidth={2.5} className="opacity-50" />
            </Link>
          </div>
        </div>

        {/* ── Right: Card ── */}
        <div className="flex-1 flex items-center justify-center w-full relative">
          <div className="relative w-full max-w-[300px] h-[360px] select-none">

            {/* Ghost stack */}
            {[2, 1].map(offset => {
              const g = CATEGORIES[(active + offset) % total]
              return (
                <div key={g.slug}
                  className={cn('absolute inset-0 rounded-[2rem] bg-gradient-to-br opacity-20', g.gradient)}
                  style={{ transform: `translateX(${offset * 14}px) translateY(${offset * -7}px) scale(${1 - offset * 0.04})`, zIndex: 10 - offset }}
                />
              )
            })}

            {/* Active card — full-bleed image mosaic + dissolved overlay */}
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={cat.slug} custom={direction}
                variants={slideVariants} initial="enter" animate="center" exit="exit"
                drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12}
                onDragEnd={(_, info) => { if (info.offset.x < -50) next(); else if (info.offset.x > 50) prev() }}
                className="absolute inset-0 rounded-[2rem] overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ zIndex: 20 }}
              >
                {/* ── Mosaic image tiles covering entire card ── */}
                <div className="absolute inset-0">
                  {catImages.length > 0 ? (
                    <>
                      {IMG_POSITIONS.slice(0, Math.min(catImages.length, 4)).map((pos, i) => (
                        <motion.div
                          key={cat.slug + i}
                          initial={{ opacity: 0, scale: 1.2 }}
                          animate={{ opacity: 0.85, scale: 1 }}
                          transition={{ delay: i * 0.07, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                          className="absolute overflow-hidden"
                          style={{
                            top: pos.top, left: pos.left, width: pos.w, height: pos.h,
                            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, rgba(0,0,0,0.6) 65%, transparent 100%)',
                            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, rgba(0,0,0,0.6) 65%, transparent 100%)',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={catImages[i % catImages.length]}
                            alt=""
                            className="w-full h-full object-cover scale-110"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                          />
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <div className={cn('absolute inset-0 bg-gradient-to-br', cat.gradient)} />
                  )}

                  {/* Dissolve layers — blend images into dark bg */}
                  <div className="absolute inset-0 bg-stone-950/40 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/30 to-stone-950/10" />
                  {/* Subtle colour tint from category */}
                  <div className={cn('absolute inset-0 opacity-20 bg-gradient-to-br', cat.gradient)} style={{ mixBlendMode: 'color' }} />
                </div>

                {/* ── Text overlay — sits above dissolved images ── */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                  {/* Top */}
                  <div className="flex items-start justify-between">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10">
                      <Icon name={cat.icon} size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase mt-1">{cat.num}</span>
                  </div>

                  {/* Bottom — category info */}
                  <div>
                    <span className={cn('inline-block text-[8px] font-black tracking-[0.3em] uppercase px-2.5 py-1 rounded-full mb-3', cat.pill, 'text-white/90')}>
                      {cat.tagline}
                    </span>
                    <h3 className="text-[1.6rem] font-black text-white tracking-tighter leading-tight drop-shadow-lg">
                      {cat.label}
                    </h3>
                    <div className="mt-4 h-px w-full bg-white/10" />
                    <p className="mt-3 text-[9px] font-black tracking-widest text-white/40 uppercase flex items-center gap-1.5">
                      Drag to explore <Icon name="arrowRight" size={9} />
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="relative mx-auto max-w-7xl px-6 pb-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {CATEGORIES.map((c, i) => (
            <button key={c.slug} onClick={() => go(i, i > active ? 1 : -1)}
              className="relative h-1 overflow-hidden rounded-full transition-all duration-300"
              style={{ width: i === active ? 28 : 7 }}
            >
              <span className="absolute inset-0 bg-stone-700 rounded-full" />
              {i === active && <motion.span layoutId="cat-dot" className="absolute inset-0 bg-amber-400 rounded-full" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-9 h-9 rounded-xl border border-stone-800 text-stone-400 hover:border-amber-500 hover:text-amber-400 flex items-center justify-center transition-all active:scale-90">
            <Icon name="arrowRight" size={14} className="rotate-180" />
          </button>
          <button onClick={next} className="w-9 h-9 rounded-xl border border-stone-800 text-stone-400 hover:border-amber-500 hover:text-amber-400 flex items-center justify-center transition-all active:scale-90">
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default function HomeClient() {
  const { profile } = useAuthContext()

  return (
    <div className="flex flex-col gap-16 pb-24">
      {/* Schema injection for Google SERP dominance */}
      <JsonLd data={getFAQSchema()} />

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
              alt="Fuelist Premium Fresh Fruit Delivery Delhi"
              fill
              className="object-cover object-right-top sm:object-right opacity-60 grayscale-[0.2] contrast-[1.1]"
              sizes="100vw"
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
                Nutritiously Handcrafted in Delhi
              </Badge>
              <h1 className="text-5xl sm:text-[7rem] font-black tracking-tighter text-stone-900 leading-[0.85] mb-8">
                Fresh <span className="text-amber-500">Fruit</span><br />
                <span className="text-stone-800/90 underline decoration-amber-500/30 decoration-8 underline-offset-8">Delivery Daily.</span>
              </h1>
              <p className="text-lg sm:text-2xl text-stone-500 max-w-2xl mb-12 font-medium leading-relaxed">
                Clean fruit bowls, high-protein breakfasts, and power bowls — built with full macro transparency for those who expect more from their food.
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

      {/* ── Categories Carousel ──────────────────────────────────────────────────── */}
      <CategoryCarousel />

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

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              {FEATURES.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 p-6 rounded-2xl bg-white/40 border border-stone-100"
                >
                  <div className="w-10 h-10 shrink-0 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mt-0.5">
                    <Icon name={feature.icon} size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900 mb-1">{feature.title}</h3>
                    <p className="text-xs font-medium text-stone-400 leading-relaxed">{feature.description}</p>
                  </div>
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
