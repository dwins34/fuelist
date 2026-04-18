'use client'

import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface OrderTypePieProps {
  normalOrders: number
  subOrders: number
  normalRevenue: number
  subRevenue: number
}

function fmtCurrency(n: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`
}

export default function OrderTypePie({
  normalOrders, subOrders, normalRevenue, subRevenue,
}: OrderTypePieProps) {
  const orderData = useMemo(() => [
    { name: 'Normal',       value: normalOrders,  revenue: normalRevenue },
    { name: 'Subscription', value: subOrders,      revenue: subRevenue   },
  ], [normalOrders, subOrders, normalRevenue, subRevenue])

  const COLORS = ['#f59e0b', '#78716c']

  const total = normalOrders + subOrders
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm font-medium text-stone-400">
        No orders for this period
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={orderData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={3}
          >
            {orderData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: 12, fontWeight: 700 }}
            formatter={(value, name, props) => [
              `${value} orders · ${fmtCurrency((props as any).payload?.revenue ?? 0)}`,
              String(name),
            ] as [string, string]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Revenue split */}
      <div className="grid grid-cols-2 gap-2">
        {orderData.map((d, i) => (
          <div key={d.name} className="rounded-xl bg-stone-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{d.name}</p>
            </div>
            <p className="text-base font-black text-stone-900">{fmtCurrency(d.revenue)}</p>
            <p className="text-[10px] text-stone-400 font-medium">{d.value} orders · {total > 0 ? Math.round(d.value / total * 100) : 0}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
