'use client'

interface PriorityBadgeProps {
  score: number
  estimatedMinutes: number
  createdAt: string
}

export default function PriorityBadge({ score, estimatedMinutes, createdAt }: PriorityBadgeProps) {
  const waitMins = (Date.now() - new Date(createdAt).getTime()) / 60000
  const isOverdue = waitMins > estimatedMinutes

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
        Critical
      </span>
    )
  }
  if (score > 15) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-black uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        High
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-700/60 border border-stone-600 text-stone-400 text-[9px] font-black uppercase tracking-widest">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-500" />
      Normal
    </span>
  )
}
