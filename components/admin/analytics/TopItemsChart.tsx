'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'

interface TopItem {
  name: string
  category: string
  qty: number
  revenue: number
}

interface TopItemsChartProps {
  items: TopItem[]
}

function fmtRupee(v: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)}`
}

export default function TopItemsChart({ items }: TopItemsChartProps) {
  const data = useMemo(
    () => items.slice(0, 8).map((item) => ({
      name:     item.name.length > 14 ? item.name.slice(0, 14) + '…' : item.name,
      fullName: item.name,
      qty:      item.qty,
      revenue:  item.revenue,
    })),
    [items]
  )

  const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#d6d3d1', '#a8a29e', '#78716c', '#57534e']

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-medium text-stone-400">
        No item data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fontWeight: 700, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: 12, fontWeight: 700 }}
          formatter={(value, _, props) => [
            `${value} units · ${fmtRupee((props as any).payload?.revenue ?? 0)}`,
            (props as any).payload?.fullName ?? '',
          ] as [string, string]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="qty" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
