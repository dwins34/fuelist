'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MenuItem, Category } from '@/types'
import MenuCard from '@/components/MenuCard'
import CategoryFilter from '@/components/CategoryFilter'

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'calories_asc' | 'protein_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Our Menu</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          All bowls are freshly made with real ingredients. Full macros listed — no surprises.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex justify-center mb-6">
        <CategoryFilter selected={selected} onChange={setSelected} />
      </div>

      {/* Advanced filters + sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setHighProtein((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              highProtein
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            💪 High Protein (20g+)
          </button>
          <button
            onClick={() => setLowCalorie((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              lowCalorie
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
            }`}
          >
            🔥 Low Calorie (≤350)
          </button>
          <button
            onClick={() => setBestsellersOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              bestsellersOnly
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
            }`}
          >
            ⭐ Bestsellers
          </button>
          {activeFilters > 0 && (
            <button
              onClick={() => { setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-400 mb-4">
          {visible.length} item{visible.length !== 1 ? 's' : ''}
          {activeFilters > 0 || selected !== 'all' ? ' matching filters' : ''}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-80" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-24 text-center text-gray-400">
          <div className="text-5xl mb-4">🥗</div>
          <p className="text-lg font-medium">No items match your filters.</p>
          <button
            onClick={() => { setSelected('all'); setHighProtein(false); setLowCalorie(false); setBestsellersOnly(false) }}
            className="mt-4 text-sm text-green-500 hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-24">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-80" />
          ))}
        </div>
      </div>
    }>
      <MenuContent />
    </Suspense>
  )
}
