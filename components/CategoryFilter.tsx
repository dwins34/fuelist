'use client'

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
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all border',
            selected === cat
              ? 'bg-green-500 text-white border-green-500 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'
          )}
        >
          {cat === 'all' ? 'All Bowls' : categoryLabel(cat)}
        </button>
      ))}
    </div>
  )
}
