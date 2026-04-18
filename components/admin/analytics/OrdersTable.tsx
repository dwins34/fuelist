'use client'

import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface Order {
  id: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
  user_id: string | null
  items: any[]
  address: any
  discount_amount: number
}

interface OrdersTableProps {
  orders: Order[]
  total: number
  page: number
  totalPages: number
  onPage: (p: number) => void
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-100',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-stone-100 text-stone-600 border-stone-200',
  refunded:  'bg-rose-50 text-rose-700 border-rose-100',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

function itemsSummary(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return '—'
  return items.slice(0, 2).map((e) => {
    const item = e?.item ?? e
    const qty  = e?.quantity ?? item?.quantity ?? 1
    return `${item?.name ?? '?'} ×${qty}`
  }).join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '')
}

export default function OrdersTable({ orders, total, page, totalPages, onPage }: OrdersTableProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
          {total} orders
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="chevronRight" size={13} className="rotate-180" />
            </button>
            <span className="text-[11px] font-black text-stone-500">{page} / {totalPages}</span>
            <button
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              {['Order ID', 'Date', 'Items', 'Amount', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm font-medium text-stone-400">No orders for this period</td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-[10px] font-black text-stone-400 font-mono">#{order.id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-3 text-[11px] font-medium text-stone-600 whitespace-nowrap">
                  {fmtDate(order.created_at)}
                </td>
                <td className="px-4 py-3 text-[11px] font-medium text-stone-600 max-w-[200px] truncate">
                  {itemsSummary(order.items)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-black text-stone-900">
                    ₹{new Intl.NumberFormat('en-IN').format(order.total_amount)}
                  </p>
                  {order.discount_amount > 0 && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      -{new Intl.NumberFormat('en-IN').format(order.discount_amount)} off
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider capitalize',
                    STATUS_STYLES[order.status] ?? 'bg-stone-50 text-stone-500'
                  )}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
