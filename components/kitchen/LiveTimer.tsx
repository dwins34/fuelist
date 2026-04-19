'use client'

import { useEffect, useState } from 'react'

interface LiveTimerProps {
  createdAt: string
  estimatedMinutes: number
  className?: string
}

function elapsed(createdAt: string) {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return { m, s, total: secs }
}

export default function LiveTimer({ createdAt, estimatedMinutes, className }: LiveTimerProps) {
  const [tick, setTick] = useState(() => elapsed(createdAt))

  useEffect(() => {
    const id = setInterval(() => setTick(elapsed(createdAt)), 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const limitSecs  = estimatedMinutes * 60
  const isWarning  = tick.total >= limitSecs * 0.8
  const isOverdue  = tick.total >= limitSecs

  const color = isOverdue
    ? 'text-red-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-emerald-400'

  const label = isOverdue
    ? `+${tick.m - estimatedMinutes}m overdue`
    : `${tick.m}m ${String(tick.s).padStart(2, '0')}s`

  return (
    <span className={`font-mono font-black text-xs tabular-nums ${color} ${className ?? ''}`}>
      {label}
    </span>
  )
}
