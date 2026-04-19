'use client'

import { cn } from '@/lib/utils'

export interface KDSFilters {
  status: string[]
  minutes: number | null
  unassigned: boolean
}

interface FilterPanelProps {
  filters: KDSFilters
  onChange: (f: KDSFilters) => void
  totalActive: number
}

const STATUS_OPTIONS = [
  { value: 'new',             label: 'New',        color: 'amber' },
  { value: 'preparing',       label: 'Preparing',  color: 'blue' },
  { value: 'ready',           label: 'Ready',      color: 'emerald' },
  { value: 'out_for_delivery',label: 'Out',        color: 'purple' },
]

const TIME_OPTIONS = [
  { value: null, label: 'All' },
  { value: 15,   label: '15m' },
  { value: 30,   label: '30m' },
  { value: 60,   label: '1h' },
]

function Chip({ active, color = 'stone', onClick, children }: {
  active: boolean; color?: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
        active
          ? `bg-${color}-500/20 border border-${color}-500/50 text-${color}-400`
          : 'bg-stone-800 border border-stone-700 text-stone-500 hover:text-stone-300'
      )}
    >
      {children}
    </button>
  )
}

export default function FilterPanel({ filters, onChange, totalActive }: FilterPanelProps) {
  function toggleStatus(v: string) {
    const next = filters.status.includes(v)
      ? filters.status.filter(s => s !== v)
      : [...filters.status, v]
    onChange({ ...filters, status: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-stone-900 border-b border-stone-800">
      {/* Live count */}
      <div className="flex items-center gap-1.5 mr-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-black text-stone-300">{totalActive} active</span>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1.5">
        {STATUS_OPTIONS.map(s => (
          <Chip
            key={s.value}
            active={filters.status.includes(s.value)}
            color={s.color}
            onClick={() => toggleStatus(s.value)}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="h-4 w-px bg-stone-700" />

      {/* Time window */}
      <div className="flex items-center gap-1.5">
        {TIME_OPTIONS.map(t => (
          <Chip
            key={String(t.value)}
            active={filters.minutes === t.value}
            color="stone"
            onClick={() => onChange({ ...filters, minutes: t.value })}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="h-4 w-px bg-stone-700" />

      {/* Unassigned toggle */}
      <Chip
        active={filters.unassigned}
        color="amber"
        onClick={() => onChange({ ...filters, unassigned: !filters.unassigned })}
      >
        Unassigned
      </Chip>
    </div>
  )
}
