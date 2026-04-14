'use client'

import { motion } from 'framer-motion'
import { Category } from '@/types'
import { categoryLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CATEGORIES: (Category | 'all')[] = ['all', 'fruit', 'breakfast', 'power']

interface CategoryFilterProps {
  selected: Category | 'all'
  onChange: (cat: Category | 'all') => void
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {CATEGORIES.map((cat) => {
        const isActive = selected === (cat as any)
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="relative"
          >
            <div
              className={cn(
                "relative z-10 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 border-2",
                isActive
                  ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200 -translate-y-1"
                  : "bg-white text-stone-400 border-stone-50 hover:border-stone-100 hover:text-stone-600 hover:bg-stone-50/50"
              )}
            >
              {cat === 'all' ? 'Signature Series' : categoryLabel(cat as Category)}
            </div>
            
            {isActive && (
              <motion.div 
                layoutId="categoryActiveIndicator"
                className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-110"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
