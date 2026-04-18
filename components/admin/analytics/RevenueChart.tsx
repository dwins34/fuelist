'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

interface DayRevenue {
  day: string
  normal: number
  subscription: number
  total: number
}

interface RevenueChartProps {
  data: DayRevenue[]
}

function fmtDay(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function fmtRupee(v: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)}`
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, label: fmtDay(d.day) })),
    [data]
  )

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-medium text-stone-400">
        No revenue data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#78716c" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#78716c" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtRupee}
          tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '1rem',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            fontSize: 12,
            fontWeight: 700,
          }}
          formatter={(value, name) => [
            fmtRupee(Number(value)),
            name === 'total' ? 'Total' : name === 'normal' ? 'Normal Orders' : 'Subscriptions',
          ] as [string, string]}
          labelStyle={{ color: '#78716c', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}
        />
        <Legend
          formatter={(value) => value === 'total' ? 'Total' : value === 'normal' ? 'Normal' : 'Subscription'}
          wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
        />

        <Area
          type="monotone"
          dataKey="total"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#gradTotal)"
          dot={false}
          activeDot={{ r: 5, fill: '#f59e0b' }}
        />
        <Area
          type="monotone"
          dataKey="subscription"
          stroke="#a8a29e"
          strokeWidth={1.5}
          fill="url(#gradSub)"
          dot={false}
          strokeDasharray="4 2"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
