import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { formatPrice, getImageUrl } from '@/lib/utils'
import RefundManager from '@/components/admin/RefundManager'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubRow {
  id: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  frequency: 'daily' | 'weekdays' | 'weekends'
  duration_days: number
  start_date: string
  end_date: string
  status: 'active' | 'paused' | 'cancelled'
  payment_status: 'pending_payment' | 'paid' | 'refunded'
  payment_id: string
  refund_amount: number
  price_per_delivery: number
  total_price: number
  created_at: string
  menu_items: { id: string; name: string; image_url: string; category: string }
  users: { id: string; name: string; email: string; phone: string }
}

// ── Config ────────────────────────────────────────────────────────────────────

const SLOT_META = {
  morning:   { label: 'Morning',   time: '8–10 AM',  icon: '🌅', bg: 'bg-blue-50',   text: 'text-blue-700'   },
  afternoon: { label: 'Afternoon', time: '12–2 PM',  icon: '☀️', bg: 'bg-amber-50',  text: 'text-amber-700'  },
  evening:   { label: 'Evening',   time: '6–8 PM',   icon: '🌆', bg: 'bg-purple-50', text: 'text-purple-700' },
} as const

const FREQ_LABEL = { daily: 'Daily', weekdays: 'Mon–Fri', weekends: 'Sat–Sun' }

const STATUS_STYLE = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100  text-gray-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDeliveryDayToday(freq: SubRow['frequency']): boolean {
  const day = new Date().getDay() // 0 = Sun, 6 = Sat
  if (freq === 'daily')    return true
  if (freq === 'weekdays') return day >= 1 && day <= 5
  if (freq === 'weekends') return day === 0 || day === 6
  return false
}

function isActiveToday(sub: SubRow): boolean {
  if (sub.status !== 'active') return false
  const today = new Date().toISOString().split('T')[0]
  if (sub.end_date && sub.end_date < today) return false
  return isDeliveryDayToday(sub.frequency)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      menu_items (id, name, image_url, category),
      users      (id, name, email, phone)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Failed to load subscriptions: {error.message}
      </div>
    )
  }

  const rows = (subs ?? []) as unknown as SubRow[]

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalActive    = rows.filter((s) => s.status === 'active').length
  const totalPaused    = rows.filter((s) => s.status === 'paused').length
  const todayDeliveries = rows.filter(isActiveToday)

  const bySlot = {
    morning:   rows.filter((s) => s.status === 'active' && s.delivery_slot === 'morning'),
    afternoon: rows.filter((s) => s.status === 'active' && s.delivery_slot === 'afternoon'),
    evening:   rows.filter((s) => s.status === 'active' && s.delivery_slot === 'evening'),
  }

  // ── Group today's deliveries by slot ─────────────────────────────────────
  const todayBySlot: Record<string, SubRow[]> = { morning: [], afternoon: [], evening: [] }
  for (const sub of todayDeliveries) todayBySlot[sub.delivery_slot].push(sub)

  // ── Pending Refunds ──────────────────────────────────────────────────────
  const pendingRefunds = rows
    .filter((s) => s.status === 'cancelled' && s.refund_amount > 0 && s.payment_status !== 'refunded')
    .map((s) => ({
      id: s.id,
      user_name: s.users?.name || 'Unknown',
      refund_amount: s.refund_amount,
      payment_id: s.payment_id,
      payment_status: s.payment_status,
    }))

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all daily meal subscriptions.</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active',          value: totalActive,           icon: '✅', bg: 'bg-green-50',  text: 'text-green-600'  },
          { label: 'Paused',          value: totalPaused,           icon: '⏸',  bg: 'bg-amber-50',  text: 'text-amber-600'  },
          { label: "Today's deliveries", value: todayDeliveries.length, icon: '🛵', bg: 'bg-blue-50',   text: 'text-blue-600'   },
          { label: 'Total all-time',  value: rows.length,           icon: '📋', bg: 'bg-purple-50', text: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className={`text-3xl font-extrabold ${s.text}`}>{s.value}</div>
            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Active subscriptions by slot ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
          const meta  = SLOT_META[slot]
          const items = bySlot[slot]
          return (
            <div key={slot} className={`${meta.bg} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${meta.text}`}>{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.time}</p>
                </div>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${meta.text} bg-white/70`}>
                  {items.length} active
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">No active subscriptions</p>
              ) : (
                <div className="space-y-1.5">
                  {items.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
                      <p className="text-xs font-medium text-gray-800 truncate flex-1">{sub.menu_items?.name}</p>
                      <p className="text-[10px] text-gray-400 shrink-0">{sub.users?.name?.split(' ')[0]}</p>
                    </div>
                  ))}
                  {items.length > 5 && (
                    <p className="text-xs text-center text-gray-400 pt-1">+{items.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Refund Management ── */}
      {pendingRefunds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              💸 Pending Refunds
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">
                {pendingRefunds.length}
              </span>
            </h2>
            <p className="text-sm text-gray-500">Process refunds for cancelled subscriptions.</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <RefundManager initialSubs={pendingRefunds} />
          </div>
        </div>
      )}

      {/* ── Today's delivery list ── */}
      {todayDeliveries.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="text-xl">🛵</span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Today&apos;s Deliveries</h2>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}{todayDeliveries.length} deliveries
              </p>
            </div>
          </div>
          {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
            const subs = todayBySlot[slot]
            if (subs.length === 0) return null
            const meta = SLOT_META[slot]
            return (
              <div key={slot}>
                <div className={`px-6 py-2 ${meta.bg} border-b border-gray-100`}>
                  <p className={`text-xs font-bold ${meta.text}`}>{meta.icon} {meta.label} · {meta.time}</p>
                </div>
                <div className="overflow-x-auto">
                  <div className="divide-y divide-gray-50 min-w-[600px] lg:min-w-full">
                    {subs.map((sub) => (
                      <div key={sub.id} className="px-6 py-3 flex items-center gap-4">
                        <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-green-50">
                          {sub.menu_items?.image_url ? (
                            <Image
                              src={getImageUrl(sub.menu_items.image_url)}
                              alt={sub.menu_items.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-lg">🥗</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{sub.menu_items?.name}</p>
                          <p className="text-xs text-gray-500">
                            {sub.users?.name} · {sub.users?.phone || sub.users?.email}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold rounded-full px-2.5 py-1 ${STATUS_STYLE[sub.status]}`}>
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Full subscription table ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">All Subscriptions</h2>
          <p className="text-xs text-gray-400 mt-0.5">{rows.length} total</p>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-gray-500">No subscriptions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Slot</th>
                  <th className="px-4 py-3 text-left">Frequency</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((sub) => {
                  const slotMeta = SLOT_META[sub.delivery_slot]
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      {/* Item */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-green-50">
                            {sub.menu_items?.image_url ? (
                              <Image
                                src={getImageUrl(sub.menu_items.image_url)}
                                alt={sub.menu_items.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-base">🥗</div>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 whitespace-nowrap">{sub.menu_items?.name}</p>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{sub.users?.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{sub.users?.email}</p>
                      </td>

                      {/* Slot */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${slotMeta.bg} ${slotMeta.text}`}>
                          {slotMeta.icon} {slotMeta.label}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5 pl-1">{slotMeta.time}</p>
                      </td>

                      {/* Frequency */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {FREQ_LABEL[sub.frequency]}
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 whitespace-nowrap">{sub.start_date}</p>
                        <p className="text-xs text-gray-400">→ {sub.end_date ?? '—'}</p>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatPrice(sub.total_price)}
                        <p className="text-xs text-gray-400 font-normal">{formatPrice(sub.price_per_delivery)}/del</p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[sub.status]}`}>
                          {sub.status.toUpperCase()}
                        </span>
                        {isActiveToday(sub) && (
                          <p className="text-[10px] text-green-600 font-semibold mt-0.5">delivers today</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
