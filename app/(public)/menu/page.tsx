'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuItem, Category } from '@/types'
import MenuCard from '@/components/menu/MenuCard'
import CategoryFilter from '@/components/CategoryFilter'
import { Icon, IconName } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'calories_asc' | 'protein_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default Sorting' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'calories_asc', label: 'Lowest Calories' },
  { value: 'protein_desc', label: 'Highest Protein' },
]

function MenuContent() {
  const searchParams = useSearchParams()
  const initialCat = (searchParams.get('category') as Category) || 'all'

  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Category | 'all'>(initialCat)
  const [sort, setSort] = useState<SortKey>('default')
  const [highProtein, setHighProtein] = useState(false)
  const [lowCalorie, setLowCalorie] = useState(false)
  const [bestsellersOnly, setBestsellersOnly] = useState(false)

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    let result = selected === 'all' ? items : items.filter((i) => i.category === selected)

    if (highProtein) result = result.filter((i) => i.protein >= 20)
    if (lowCalorie) result = result.filter((i) => i.calories <= 350)
    if (bestsellersOnly) result = result.filter((i) => i.is_bestseller)

    switch (sort) {
      case 'price_asc':    return [...result].sort((a, b) => a.price - b.price)
      case 'price_desc':   return [...result].sort((a, b) => b.price - a.price)
      case 'calories_asc': return [...result].sort((a, b) => a.calories - b.calories)
      case 'protein_desc': return [...result].sort((a, b) => b.protein - a.protein)
      default:             return result
    }
  }, [items, selected, sort, highProtein, lowCalorie, bestsellersOnly])

  const activeFilters = [highProtein, lowCalorie, bestsellersOnly].filter(Boolean).length

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
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

      {/* Category filter */}
      <div className="flex justify-center mb-10">
        <CategoryFilter selected={selected} onChange={setSelected} />
      </div>

      {/* Advanced filters + sort row */}
      <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center justify-between gap-5 mb-8 bg-stone-100 p-5 rounded-[1.5rem] border border-stone-200/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mr-2">Filter by</div>
          <button
            onClick={() => setHighProtein((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black transition-all border-2",
              highProtein
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="points" size={14} strokeWidth={3} />
            High Protein
          </button>
          <button
            onClick={() => setLowCalorie((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black transition-all border-2",
              lowCalorie
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="time" size={14} strokeWidth={3} />
            Low Calorie
          </button>
          <button
            onClick={() => setBestsellersOnly((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black transition-all border-2",
              bestsellersOnly
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-stone-500 border-stone-100 hover:border-stone-200"
            )}
          >
            <Icon name="star" size={14} strokeWidth={3} />
            Bestsellers
          </button>
          
          <AnimatePresence>
            {activeFilters > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => { setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
                className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
              >
                <Icon name="close" size={14} strokeWidth={3} />
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full lg:w-auto flex items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-stone-500">Sort</div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 lg:flex-initial rounded-xl border-2 border-stone-100 bg-white px-6 py-2.5 text-[10px] font-black text-stone-700 focus:border-amber-400 focus:outline-none transition-all shadow-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-6">
        {!loading && (
          <div className="flex items-baseline gap-2 ml-2">
            <span className="text-sm font-black text-stone-900">{visible.length}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-300">Available Meals</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[1.5rem] bg-stone-50 animate-pulse h-80 border-2 border-stone-50" />
            ))}
          </div>
        ) : visible.length === 0 ? (
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
              variant="outline"
              className="mt-8"
              onClick={() => { setSelected('all'); setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
            >
              Reset All Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <MenuCard item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function MenuPage() {
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
      <MenuContent />
    </Suspense>
  )
}
