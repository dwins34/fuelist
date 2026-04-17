'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem, Category } from '@/types'
import MenuCard from '@/components/menu/MenuCard'
import { Icon } from '@/lib/icons'
import { categoryLabel } from '@/lib/utils'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'calories_asc' | 'protein_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'calories_asc', label: 'Calories ↑' },
  { value: 'protein_desc', label: 'Protein ↓' },
]

const ALL_CATEGORIES: Category[] = ['fruit', 'breakfast', 'power', 'shakes', 'craft_juices']

const CATEGORY_ICONS: Record<Category, string> = {
  fruit: '🍓',
  breakfast: '🥣',
  power: '💪',
  shakes: '🥤',
  craft_juices: '🍋',
}

function MenuContent({ defaultCategory }: { defaultCategory?: Category | 'all' }) {
  const searchParams = useSearchParams()
  const initialCat = defaultCategory || (searchParams.get('category') as Category) || 'all'

  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>(initialCat)
  const [sort, setSort] = useState<SortKey>('default')
  const [highProtein, setHighProtein] = useState(false)
  const [lowCalorie, setLowCalorie] = useState(false)
  const [bestsellersOnly, setBestsellersOnly] = useState(false)

  const navRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isScrollingTo = useRef(false)

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = [...items]
    if (highProtein) result = result.filter((i) => i.protein >= 20)
    if (lowCalorie) result = result.filter((i) => i.calories <= 350)
    if (bestsellersOnly) result = result.filter((i) => i.is_bestseller)

    switch (sort) {
      case 'price_asc':    return result.sort((a, b) => a.price - b.price)
      case 'price_desc':   return result.sort((a, b) => b.price - a.price)
      case 'calories_asc': return result.sort((a, b) => a.calories - b.calories)
      case 'protein_desc': return result.sort((a, b) => b.protein - a.protein)
      default:             return result
    }
  }, [items, sort, highProtein, lowCalorie, bestsellersOnly])

  const groupedItems = useMemo(() => {
    const groups: Record<Category, MenuItem[]> = {
      fruit: [], breakfast: [], power: [], shakes: [], craft_juices: [],
    }
    for (const item of filtered) {
      if (groups[item.category]) groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  // Determine which categories actually have items to show
  const visibleCategories = useMemo(
    () => ALL_CATEGORIES.filter((cat) => groupedItems[cat].length > 0),
    [groupedItems]
  )

  // Scroll nav pill into view when activeCategory changes
  useEffect(() => {
    if (!navRef.current) return
    const btn = navRef.current.querySelector(`[data-cat="${activeCategory}"]`) as HTMLElement
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  // Scroll to initial category once items have loaded and sections are rendered
  useEffect(() => {
    if (loading || initialCat === 'all') return
    // Use rAF + setTimeout to wait for sections to mount after render
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const el = sectionRefs.current[initialCat]
        if (!el) return
        isScrollingTo.current = true
        const top = el.getBoundingClientRect().top + window.scrollY - 130
        window.scrollTo({ top, behavior: 'smooth' })
        setTimeout(() => { isScrollingTo.current = false }, 800)
      }, 50)
    })
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]) // only run when loading transitions to false

  // Set up IntersectionObserver to track which section is in view
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return
        // Pick the section with the highest intersection ratio
        let best: { cat: string; ratio: number } | null = null
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute('data-section')
            if (cat && (!best || entry.intersectionRatio > best.ratio)) {
              best = { cat, ratio: entry.intersectionRatio }
            }
          }
        }
        if (best) setActiveCategory(best.cat as Category | 'all')
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    for (const cat of ALL_CATEGORIES) {
      const el = sectionRefs.current[cat]
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [visibleCategories])

  const scrollToSection = useCallback((cat: Category | 'all') => {
    setActiveCategory(cat)
    if (cat === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = sectionRefs.current[cat]
    if (!el) return
    isScrollingTo.current = true
    const top = el.getBoundingClientRect().top + window.scrollY - 130
    window.scrollTo({ top, behavior: 'smooth' })
    setTimeout(() => { isScrollingTo.current = false }, 800)
  }, [])

  const activeFilters = [highProtein, lowCalorie, bestsellersOnly].filter(Boolean).length
  const totalVisible = filtered.length

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10 text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
        >
          <Icon name="points" size={14} strokeWidth={3} />
          Premium Wellness Menu
        </motion.div>
        <h1 className="text-4xl font-black text-stone-900 tracking-tighter sm:text-6xl">
          Fuel Your <span className="text-amber-500">Peak.</span>
        </h1>
        <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Nutrient-dense bowls, high-definition flavor. Crafted for performance, delivered for convenience.
        </p>
      </div>

      {/* Sticky category nav */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm">
        <div
          ref={navRef}
          className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 py-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ALL_CATEGORIES.map((cat) => {
            const hasItems = groupedItems[cat].length > 0
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                data-cat={cat}
                onClick={() => scrollToSection(cat)}
                disabled={!hasItems}
                className={cn(
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 border-2 whitespace-nowrap",
                  isActive
                    ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200"
                    : hasItems
                    ? "bg-white text-stone-500 border-stone-100 hover:border-amber-200 hover:text-amber-600"
                    : "bg-stone-50 text-stone-300 border-stone-50 cursor-not-allowed"
                )}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{categoryLabel(cat)}</span>
                {hasItems && (
                  <span className={cn(
                    "text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                    isActive ? "bg-white/30 text-white" : "bg-stone-100 text-stone-400"
                  )}>
                    {groupedItems[cat].length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter + sort bar */}
      <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center justify-between gap-4 my-6 bg-stone-100 p-4 rounded-[1.5rem] border border-stone-200/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mr-1">Filter</div>
          <button
            onClick={() => setHighProtein((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black transition-all border-2",
              highProtein
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="points" size={12} strokeWidth={3} />
            High Protein
          </button>
          <button
            onClick={() => setLowCalorie((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black transition-all border-2",
              lowCalorie
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="time" size={12} strokeWidth={3} />
            Low Calorie
          </button>
          <button
            onClick={() => setBestsellersOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black transition-all border-2",
              bestsellersOnly
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="star" size={12} strokeWidth={3} />
            Bestsellers
          </button>
          <AnimatePresence>
            {activeFilters > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => { setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
              >
                <Icon name="close" size={12} strokeWidth={3} />
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-stone-500">Sort</div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border-2 border-stone-100 bg-white px-4 py-2 text-[10px] font-black text-stone-700 focus:border-amber-400 focus:outline-none transition-all shadow-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[1.5rem] bg-stone-50 animate-pulse h-80 border-2 border-stone-50" />
          ))}
        </div>
      ) : totalVisible === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 text-center rounded-[2rem] bg-stone-50/50 border-2 border-dashed border-stone-100"
        >
          <div className="mx-auto w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center text-stone-200 mb-6">
            <Icon name="bowl" size={40} />
          </div>
          <h3 className="text-xl font-black text-stone-900">No matches found</h3>
          <p className="text-sm font-medium text-stone-400 mt-2 max-w-xs mx-auto">Try adjusting your filters to explore our full selection.</p>
          <Button
            variant="ghost"
            className="mt-8"
            onClick={() => { setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
          >
            Reset Filters
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-14">
          {ALL_CATEGORIES.map((cat) => {
            const catItems = groupedItems[cat]
            if (catItems.length === 0) return null
            return (
              <section
                key={cat}
                ref={(el) => { sectionRefs.current[cat] = el }}
                data-section={cat}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{CATEGORY_ICONS[cat]}</span>
                  <div>
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight">{categoryLabel(cat)}</h2>
                    <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-0.5">
                      {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-stone-100 ml-4" />
                </div>

                {/* Items grid */}
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  <AnimatePresence mode="popLayout">
                    {catItems.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35 }}
                      >
                        <MenuCard item={item} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MenuPage({ defaultCategory }: { defaultCategory?: Category | 'all' }) {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-48">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[2.5rem] bg-stone-50 animate-pulse h-96 border-2 border-stone-50" />
          ))}
        </div>
      </div>
    }>
      <MenuContent defaultCategory={defaultCategory} />
    </Suspense>
  )
}
